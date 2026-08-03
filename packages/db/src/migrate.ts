import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import type pg from 'pg';

export async function runMigrations(pool: pg.Pool, migrationsDirectory: string): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { readdir, readFile } = await import('node:fs/promises');
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    const existing = await pool.query<{ version: string }>(
      'SELECT version FROM schema_migrations WHERE version = $1',
      [version],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      continue;
    }

    const sql = await readFile(join(migrationsDirectory, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export function defaultMigrationsDirectory(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return join(dirname(currentFile), '../../../infra/migrations');
}

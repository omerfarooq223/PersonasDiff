import pg from 'pg';

/**
 * Minimal structural interface for database query capability.
 * Both `pg.Pool` and lightweight worker wrappers implement this.
 */
export interface DbQueryable {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount?: number | null }>;
  connect(): Promise<{
    query<T = Record<string, unknown>>(
      sql: string,
      params?: unknown[],
    ): Promise<{ rows: T[]; rowCount?: number | null }>;
    release(err?: boolean | Error): void;
  }>;
}

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString });
}

export async function checkDatabaseHealth(pool: DbQueryable): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

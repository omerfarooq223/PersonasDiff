import type pg from 'pg';

import { hashApiToken } from '../crypto.js';
import type { UserRow } from '../types.js';

export async function findUserByToken(pool: pg.Pool, token: string): Promise<UserRow | null> {
  const tokenHash = hashApiToken(token);
  const result = await pool.query<UserRow>(
    `SELECT id, tenant_id, email, role, api_token_hash, created_at
     FROM users WHERE api_token_hash = $1`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(pool: pg.Pool, userId: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT id, tenant_id, email, role, api_token_hash, created_at
     FROM users WHERE id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

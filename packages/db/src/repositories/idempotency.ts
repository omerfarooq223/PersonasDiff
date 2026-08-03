import type pg from 'pg';

import type { IdempotencyRecord } from '../types.js';

export async function findIdempotencyRecord(
  pool: pg.Pool,
  tenantId: string,
  key: string,
): Promise<(IdempotencyRecord & { requestHash: string }) | null> {
  const result = await pool.query<{
    request_hash: string;
    response_body: Record<string, unknown>;
    response_status: number;
  }>(
    `SELECT request_hash, response_status, response_body
     FROM idempotency_keys
     WHERE tenant_id = $1 AND key = $2 AND expires_at > now()`,
    [tenantId, key],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    requestHash: row.request_hash,
    responseBody: row.response_body,
    responseStatus: row.response_status,
  };
}

export async function saveIdempotencyRecord(
  pool: pg.Pool,
  tenantId: string,
  key: string,
  requestHash: string,
  responseStatus: number,
  responseBody: Record<string, unknown>,
  ttlHours = 24,
): Promise<void> {
  await pool.query(
    `INSERT INTO idempotency_keys (
      tenant_id, key, request_hash, response_status, response_body, expires_at
    ) VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' hours')::interval)
    ON CONFLICT (tenant_id, key) DO NOTHING`,
    [tenantId, key, requestHash, responseStatus, JSON.stringify(responseBody), String(ttlHours)],
  );
}

export async function purgeExpiredIdempotencyKeys(pool: pg.Pool): Promise<void> {
  await pool.query('DELETE FROM idempotency_keys WHERE expires_at <= now()');
}

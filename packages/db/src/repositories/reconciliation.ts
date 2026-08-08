import type pg from 'pg';

export interface StrandedRunRecord {
  id: string;
  tenantId: string;
  workerId: string | null;
  retryCount: number;
  leaseExpiresAt: Date;
}

export async function findStrandedRuns(
  pool: pg.Pool,
  limit: number = 50,
): Promise<StrandedRunRecord[]> {
  const result = await pool.query<{
    id: string;
    tenant_id: string;
    worker_id: string | null;
    retry_count: number;
    lease_expires_at: Date;
  }>(
    `SELECT id, tenant_id, worker_id, retry_count, lease_expires_at
     FROM runs
     WHERE status = 'running'
       AND lease_expires_at IS NOT NULL
       AND lease_expires_at < NOW()
     ORDER BY lease_expires_at ASC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    workerId: row.worker_id,
    retryCount: row.retry_count,
    leaseExpiresAt: row.lease_expires_at,
  }));
}

export async function reconcileStrandedRun(
  pool: pg.Pool,
  runId: string,
  maxRetries: number = 3,
): Promise<{ action: 'requeued' | 'failed'; retryCount: number }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const runRes = await client.query<{ retry_count: number }>(
      `SELECT retry_count FROM runs WHERE id = $1 FOR UPDATE`,
      [runId],
    );

    const currentRetry = (runRes.rows[0]?.retry_count ?? 0) + 1;

    if (currentRetry >= maxRetries) {
      await client.query(
        `UPDATE runs
         SET status = 'failed',
             failure_summary = 'FAILED_STRANDED_WORKER_CRASH',
             lease_expires_at = NULL,
             worker_id = NULL,
             updated_at = NOW(),
             completed_at = NOW()
         WHERE id = $1`,
        [runId],
      );

      await client.query(
        `INSERT INTO dead_letter_jobs (run_id, reason, error_stack, quarantined_at)
         VALUES ($1, 'STRANDED_WORKER_EXPIRED', 'Worker lease expired and max retries exceeded', NOW())`,
        [runId],
      );

      await client.query('COMMIT');
      return { action: 'failed', retryCount: currentRetry };
    }

    await client.query(
      `UPDATE runs
       SET status = 'queued',
           retry_count = $1,
           lease_expires_at = NULL,
           worker_id = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [currentRetry, runId],
    );

    await client.query('COMMIT');
    return { action: 'requeued', retryCount: currentRetry };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

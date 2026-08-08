import type { DbQueryable } from '../pool.js';

export interface LeaseAcquireResult {
  acquired: boolean;
  runId?: string;
  workerId?: string;
  leaseExpiresAt?: Date;
}

export async function acquireJobLease(
  pool: DbQueryable,
  runId: string,
  workerId: string,
  leaseDurationSec: number = 30,
): Promise<LeaseAcquireResult> {
  const result = await pool.query<{ id: string; worker_id: string; lease_expires_at: Date }>(
    `UPDATE runs
     SET worker_id = $1,
         lease_expires_at = NOW() + INTERVAL '1 second' * $2,
         status = 'running',
         updated_at = NOW()
     WHERE id = $3 AND (lease_expires_at IS NULL OR lease_expires_at < NOW() OR status = 'queued')
     RETURNING id, worker_id, lease_expires_at`,
    [workerId, leaseDurationSec, runId],
  );

  if (result.rows.length === 0) {
    return { acquired: false };
  }

  const row = result.rows[0]!;
  return {
    acquired: true,
    runId: row.id,
    workerId: row.worker_id,
    leaseExpiresAt: row.lease_expires_at,
  };
}

export async function renewJobLease(
  pool: DbQueryable,
  runId: string,
  workerId: string,
  leaseDurationSec: number = 30,
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE runs
     SET lease_expires_at = NOW() + INTERVAL '1 second' * $2,
         updated_at = NOW()
     WHERE id = $1 AND worker_id = $3 AND status = 'running'`,
    [runId, leaseDurationSec, workerId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function releaseJobLease(
  pool: DbQueryable,
  runId: string,
  workerId: string,
  finalStatus: 'completed' | 'failed' | 'cancelled',
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE runs
     SET lease_expires_at = NULL,
         status = $3,
         updated_at = NOW(),
         completed_at = CASE WHEN $3 IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
     WHERE id = $1 AND worker_id = $2`,
    [runId, workerId, finalStatus],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function recordJobFailureAndRetry(
  pool: DbQueryable,
  runId: string,
  error: Error,
  maxRetries: number = 3,
  baseBackoffMs: number = 1000,
): Promise<{ shouldRetry: boolean; nextDelayMs: number; isPoison: boolean }> {
  const isPoison =
    error.name === 'InvalidPayloadError' || error.message.includes('MALFORMED_TARGET');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentRes = await client.query<{ retry_count: number }>(
      `SELECT retry_count FROM runs WHERE id = $1 FOR UPDATE`,
      [runId],
    );

    const currentRetries = (currentRes.rows[0]?.retry_count ?? 0) + 1;

    if (currentRetries >= maxRetries || isPoison) {
      // Transition to QUARANTINED_POISON / failed
      await client.query(
        `UPDATE runs
         SET status = 'failed',
             retry_count = $1,
             lease_expires_at = NULL,
             failure_summary = $2,
             quarantined_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [
          currentRetries,
          isPoison ? `POISON_JOB: ${error.message}` : `MAX_RETRIES_EXCEEDED: ${error.message}`,
          runId,
        ],
      );

      await client.query(
        `INSERT INTO dead_letter_jobs (run_id, reason, error_stack, quarantined_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          runId,
          isPoison ? 'POISON_PAYLOAD' : 'RETRY_BUDGET_EXCEEDED',
          error.stack || error.message,
        ],
      );

      await client.query('COMMIT');
      return { shouldRetry: false, nextDelayMs: 0, isPoison: true };
    }

    // Schedule retry with exponential backoff
    const nextDelayMs = Math.pow(2, currentRetries) * baseBackoffMs;
    await client.query(
      `UPDATE runs
       SET status = 'queued',
           retry_count = $1,
           lease_expires_at = NULL,
           worker_id = NULL,
           scheduled_at = NOW() + INTERVAL '1 millisecond' * $2,
           updated_at = NOW()
       WHERE id = $3`,
      [currentRetries, nextDelayMs, runId],
    );

    await client.query('COMMIT');
    return { shouldRetry: true, nextDelayMs, isPoison: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

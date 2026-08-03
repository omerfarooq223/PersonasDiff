import { assertTransition, type RunStatus } from '@ai-parallel-web/domain';
import type pg from 'pg';

import type { CreateRunInput, RunPersonaRow, RunRow } from '../types.js';

export interface RunResponse {
  id: string;
  status: RunStatus;
  createdAt: string;
  correlationId: string;
  personaVersionIds: string[];
}

function toRunResponse(run: RunRow, personaVersionIds: string[]): RunResponse {
  return {
    id: run.id,
    status: run.status,
    createdAt: run.created_at.toISOString(),
    correlationId: run.correlation_id,
    personaVersionIds,
  };
}

export async function createRun(pool: pg.Pool, input: CreateRunInput): Promise<RunResponse> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const runResult = await client.query<RunRow>(
      `INSERT INTO runs (
        tenant_id, surface_id, journey_version_id, status,
        correlation_id, created_by
      ) VALUES ($1, $2, $3, 'queued', $4, $5)
      RETURNING id, tenant_id, surface_id, journey_version_id, status,
                correlation_id, created_by, failure_summary,
                created_at, updated_at, started_at, completed_at`,
      [
        input.tenantId,
        input.surfaceId,
        input.journeyVersionId,
        input.correlationId,
        input.createdBy,
      ],
    );
    const run = runResult.rows[0];
    if (!run) {
      throw new Error('Failed to create run');
    }

    for (const personaVersionId of input.personaVersionIds) {
      await client.query(
        `INSERT INTO run_personas (run_id, persona_version_id, status)
         VALUES ($1, $2, 'queued')`,
        [run.id, personaVersionId],
      );
    }

    await client.query('COMMIT');
    return toRunResponse(run, input.personaVersionIds);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findRunById(
  pool: pg.Pool,
  tenantId: string,
  runId: string,
): Promise<(RunResponse & { surfaceId: string; journeyVersionId: string }) | null> {
  const runResult = await pool.query<RunRow>(
    `SELECT id, tenant_id, surface_id, journey_version_id, status,
            correlation_id, created_by, failure_summary,
            created_at, updated_at, started_at, completed_at
     FROM runs WHERE id = $1 AND tenant_id = $2`,
    [runId, tenantId],
  );
  const run = runResult.rows[0];
  if (!run) {
    return null;
  }

  const personas = await pool.query<RunPersonaRow>(
    `SELECT id, run_id, persona_version_id, status, created_at
     FROM run_personas WHERE run_id = $1 ORDER BY created_at ASC`,
    [runId],
  );

  return {
    ...toRunResponse(
      run,
      personas.rows.map((persona) => persona.persona_version_id),
    ),
    surfaceId: run.surface_id,
    journeyVersionId: run.journey_version_id,
  };
}

export async function transitionRunStatus(
  pool: pg.Pool,
  tenantId: string,
  runId: string,
  nextStatus: RunStatus,
): Promise<RunResponse | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query<RunRow>(
      `SELECT id, tenant_id, surface_id, journey_version_id, status,
              correlation_id, created_by, failure_summary,
              created_at, updated_at, started_at, completed_at
       FROM runs WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [runId, tenantId],
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      return null;
    }

    assertTransition(current.status, nextStatus);

    const timestamps =
      nextStatus === 'running'
        ? { completed_at: null, started_at: new Date() }
        : ['completed', 'partially_completed', 'failed', 'cancelled'].includes(nextStatus)
          ? { completed_at: new Date(), started_at: current.started_at }
          : { completed_at: current.completed_at, started_at: current.started_at };

    const updated = await client.query<RunRow>(
      `UPDATE runs
       SET status = $1, updated_at = now(), started_at = $2, completed_at = $3
       WHERE id = $4
       RETURNING id, tenant_id, surface_id, journey_version_id, status,
                 correlation_id, created_by, failure_summary,
                 created_at, updated_at, started_at, completed_at`,
      [nextStatus, timestamps.started_at, timestamps.completed_at, runId],
    );
    const run = updated.rows[0];
    if (!run) {
      throw new Error('Failed to update run');
    }

    if (nextStatus === 'cancelled') {
      await client.query(
        `UPDATE run_personas SET status = 'cancelled'
         WHERE run_id = $1 AND status IN ('draft', 'queued', 'running')`,
        [runId],
      );
    }

    await client.query('COMMIT');

    const personas = await pool.query<RunPersonaRow>(
      `SELECT persona_version_id FROM run_personas WHERE run_id = $1 ORDER BY created_at ASC`,
      [runId],
    );

    return toRunResponse(
      run,
      personas.rows.map((persona) => persona.persona_version_id),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listRuns(
  pool: pg.Pool,
  tenantId: string,
  limit: number,
  offset: number,
): Promise<{ runs: RunResponse[]; total: number }> {
  const countResult = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM runs WHERE tenant_id = $1',
    [tenantId],
  );
  const total = Number(countResult.rows[0]?.count ?? '0');

  const result = await pool.query<RunRow>(
    `SELECT id, tenant_id, surface_id, journey_version_id, status,
            correlation_id, created_by, failure_summary,
            created_at, updated_at, started_at, completed_at
     FROM runs
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );

  const runs: RunResponse[] = [];
  for (const run of result.rows) {
    const personas = await pool.query<{ persona_version_id: string }>(
      'SELECT persona_version_id FROM run_personas WHERE run_id = $1 ORDER BY created_at ASC',
      [run.id],
    );
    runs.push(
      toRunResponse(
        run,
        personas.rows.map((persona) => persona.persona_version_id),
      ),
    );
  }

  return { runs, total };
}

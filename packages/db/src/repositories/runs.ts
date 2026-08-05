import type pg from 'pg';

import type { RunStatus } from '@ai-parallel-web/domain';
import type { CreateRunInput, RunRow } from '../types.js';

export interface RunResponse {
  id: string;
  tenantId: string;
  surfaceId?: string;
  journeyVersionId?: string;
  personaVersionIds: string[];
  status: RunStatus;
  correlationId: string;
  createdBy: string;
  failureSummary: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

function toRunResponse(run: RunRow, personaVersionIds: string[]): RunResponse {
  return {
    createdAt: run.created_at.toISOString(),
    createdBy: run.created_by,
    failureSummary: run.failure_summary,
    id: run.id,
    journeyVersionId: run.journey_version_id,
    personaVersionIds,
    status: run.status,
    surfaceId: run.surface_id,
    tenantId: run.tenant_id,
    updatedAt: run.updated_at.toISOString(),
    startedAt: run.started_at ? run.started_at.toISOString() : null,
    completedAt: run.completed_at ? run.completed_at.toISOString() : null,
    correlationId: run.correlation_id,
  };
}

export async function findRunById(
  pool: pg.Pool,
  tenantId: string,
  runId: string,
): Promise<RunResponse | null> {
  const runResult = await pool.query<RunRow>(
    `SELECT id, tenant_id, surface_id, journey_version_id, status,
            correlation_id, created_by, failure_summary,
            created_at, updated_at, started_at, completed_at
     FROM runs
     WHERE id = $1 AND tenant_id = $2`,
    [runId, tenantId],
  );

  const run = runResult.rows[0];
  if (!run) {
    return null;
  }

  const personas = await pool.query<{ persona_version_id: string }>(
    'SELECT persona_version_id FROM run_personas WHERE run_id = $1 ORDER BY created_at ASC',
    [runId],
  );

  return {
    ...toRunResponse(
      run,
      personas.rows.map((persona: { persona_version_id: string }) => persona.persona_version_id),
    ),
    surfaceId: run.surface_id,
    journeyVersionId: run.journey_version_id,
  };
}

export async function createRun(pool: pg.Pool, input: CreateRunInput): Promise<RunResponse> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const runResult = await client.query<RunRow>(
      `INSERT INTO runs (
        tenant_id, surface_id, journey_version_id, status, correlation_id, created_by
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
      throw new Error('Failed to insert run record');
    }

    for (const personaVersionId of input.personaVersionIds) {
      await client.query(
        `INSERT INTO run_personas (run_id, persona_version_id, status)
         VALUES ($1, $2, 'queued')`,
        [run.id, personaVersionId],
      );
    }

    await client.query('COMMIT');

    const personas = await client.query<{ persona_version_id: string }>(
      'SELECT persona_version_id FROM run_personas WHERE run_id = $1 ORDER BY created_at ASC',
      [run.id],
    );

    return toRunResponse(
      run,
      personas.rows.map((persona: { persona_version_id: string }) => persona.persona_version_id),
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
        personas.rows.map((persona: { persona_version_id: string }) => persona.persona_version_id),
      ),
    );
  }

  return { runs, total };
}

export async function transitionRunStatus(
  pool: pg.Pool,
  tenantId: string,
  runId: string,
  nextStatus: RunStatus,
  failureSummary?: string | null,
): Promise<RunResponse | null> {
  const current = await findRunById(pool, tenantId, runId);
  if (!current) {
    return null;
  }

  const result = await pool.query<RunRow>(
    `UPDATE runs
     SET status = $1,
         failure_summary = COALESCE($2, failure_summary),
         started_at = CASE WHEN $1 = 'running' AND started_at IS NULL THEN now() ELSE started_at END,
         completed_at = CASE WHEN $1 IN ('completed', 'failed', 'cancelled') THEN now() ELSE completed_at END,
         updated_at = now()
     WHERE id = $3 AND tenant_id = $4
     RETURNING id, tenant_id, surface_id, journey_version_id, status,
               correlation_id, created_by, failure_summary,
               created_at, updated_at, started_at, completed_at`,
    [nextStatus, failureSummary ?? null, runId, tenantId],
  );

  const updatedRun = result.rows[0];
  if (!updatedRun) {
    return null;
  }

  return toRunResponse(updatedRun, current.personaVersionIds);
}

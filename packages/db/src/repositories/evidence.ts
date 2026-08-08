import type pg from 'pg';
import type { StepEvidencePayload, RunManifestPayload } from '@ai-parallel-web/contracts';
import type { DbQueryable } from '../pool.js';

export async function insertStepEvidence(
  pool: pg.Pool,
  payload: StepEvidencePayload,
): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const evidenceResult = await client.query<{ id: string }>(
      `INSERT INTO step_evidence (
        run_id, persona_version_id, step_id, step_index, timestamp_utc,
        monotonic_duration_ns, final_url, http_status, http_ok, overall_state, payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (run_id, persona_version_id, step_index)
      DO UPDATE SET
        timestamp_utc = EXCLUDED.timestamp_utc,
        monotonic_duration_ns = EXCLUDED.monotonic_duration_ns,
        final_url = EXCLUDED.final_url,
        http_status = EXCLUDED.http_status,
        http_ok = EXCLUDED.http_ok,
        overall_state = EXCLUDED.overall_state,
        payload = EXCLUDED.payload
      RETURNING id`,
      [
        payload.runId,
        payload.personaId,
        payload.stepId,
        payload.stepIndex,
        payload.timestampUtc,
        payload.monotonicDurationNs,
        payload.finalUrl,
        payload.httpOutcome.statusCode,
        payload.httpOutcome.ok,
        payload.overallEvidenceState,
        JSON.stringify(payload),
      ],
    );

    const stepEvidenceId = evidenceResult.rows[0]?.id;

    if (stepEvidenceId && payload.artifacts.length > 0) {
      for (const artifact of payload.artifacts) {
        await client.query(
          `INSERT INTO step_artifacts (
            step_evidence_id, artifact_type, storage_key, sha256, size_bytes, mime_type, state
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (storage_key) DO NOTHING`,
          [
            stepEvidenceId,
            artifact.artifactType,
            artifact.storageKey,
            artifact.sha256,
            artifact.sizeBytes,
            artifact.mimeType,
            artifact.state,
          ],
        );
      }
    }

    if (payload.redactionAuditLogs.length > 0) {
      for (const audit of payload.redactionAuditLogs) {
        await client.query(
          `INSERT INTO redaction_audit_logs (
            run_id, step_index, target_type, identifier, matches_found, action_taken
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            payload.runId,
            payload.stepIndex,
            audit.target,
            audit.identifier,
            audit.matchesFound,
            audit.actionTaken,
          ],
        );
      }
    }

    await client.query('COMMIT');
    return stepEvidenceId || '';
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function insertRunManifest(
  pool: pg.Pool,
  manifest: RunManifestPayload,
): Promise<void> {
  await pool.query(
    `INSERT INTO run_manifests (
      run_id, schema_version, total_steps, completed_steps, completeness_percentage, manifest_sha256, manifest_payload
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (run_id) DO UPDATE SET
      schema_version = EXCLUDED.schema_version,
      total_steps = EXCLUDED.total_steps,
      completed_steps = EXCLUDED.completed_steps,
      completeness_percentage = EXCLUDED.completeness_percentage,
      manifest_sha256 = EXCLUDED.manifest_sha256,
      manifest_payload = EXCLUDED.manifest_payload`,
    [
      manifest.runId,
      manifest.schemaVersion,
      manifest.totalSteps,
      manifest.completedSteps,
      manifest.completenessPercentage,
      manifest.manifestSha256,
      JSON.stringify(manifest),
    ],
  );
}

export async function getStepEvidenceByRun(
  pool: DbQueryable,
  runId: string,
): Promise<StepEvidencePayload[]> {
  const res = await pool.query<{ payload: StepEvidencePayload }>(
    `SELECT payload FROM step_evidence WHERE run_id = $1 ORDER BY step_index ASC`,
    [runId],
  );
  return res.rows.map((r: { payload: StepEvidencePayload }) => r.payload);
}

export async function getRunArtifactStorageKeys(pool: pg.Pool, runId: string): Promise<string[]> {
  const res = await pool.query<{ storage_key: string }>(
    `SELECT sa.storage_key
     FROM step_artifacts sa
     JOIN step_evidence se ON sa.step_evidence_id = se.id
     WHERE se.run_id = $1`,
    [runId],
  );
  return res.rows.map((r: { storage_key: string }) => r.storage_key);
}

export async function deleteRunRecords(pool: pg.Pool, runId: string): Promise<void> {
  await pool.query('DELETE FROM runs WHERE id = $1', [runId]);
}

export async function logDeletionAudit(
  pool: pg.Pool,
  params: {
    runId: string;
    tenantId?: string | null;
    deletedArtifactCount: number;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    errorMessage?: string | null;
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO deletion_audit_logs (
      run_id, tenant_id, deleted_artifact_count, status, error_message
    ) VALUES ($1, $2, $3, $4, $5)`,
    [
      params.runId,
      params.tenantId ?? null,
      params.deletedArtifactCount,
      params.status,
      params.errorMessage ?? null,
    ],
  );
}

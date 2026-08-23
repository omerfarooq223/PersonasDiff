import type pg from 'pg';
import * as crypto from 'node:crypto';

import type { JourneyVersionRow, PersonaVersionRow, SurfaceRow } from '../types.js';

function parseJsonField<T>(value: T | string): T {
  return typeof value === 'string' ? (JSON.parse(value) as T) : value;
}

export async function listSurfaces(pool: pg.Pool, tenantId: string): Promise<SurfaceRow[]> {
  const result = await pool.query<SurfaceRow>(
    `SELECT id, tenant_id, display_name, origin, allowed_path_prefixes,
            requests_per_minute, max_concurrent_contexts, status, created_at, updated_at
     FROM surfaces WHERE tenant_id = $1 ORDER BY display_name ASC`,
    [tenantId],
  );
  return result.rows.map((row) => ({
    ...row,
    allowed_path_prefixes: parseJsonField(row.allowed_path_prefixes),
  }));
}

export async function listJourneyVersions(
  pool: pg.Pool,
  tenantId: string,
): Promise<JourneyVersionRow[]> {
  const result = await pool.query<JourneyVersionRow>(
    `SELECT id, tenant_id, surface_id, version_label, steps, content_hash, created_at
     FROM journey_versions WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId],
  );
  return result.rows.map((row) => ({ ...row, steps: parseJsonField(row.steps) }));
}

export async function listPersonaVersions(
  pool: pg.Pool,
  tenantId: string,
): Promise<PersonaVersionRow[]> {
  const result = await pool.query<PersonaVersionRow>(
    `SELECT id, tenant_id, name, settings, content_hash, created_at
     FROM persona_versions WHERE tenant_id = $1 ORDER BY created_at ASC`,
    [tenantId],
  );
  return result.rows.map((row) => ({ ...row, settings: parseJsonField(row.settings) }));
}

export async function ensureLiveAuditConfiguration(
  pool: pg.Pool,
  input: {
    contentHash: string;
    displayName: string;
    origin: string;
    steps: Array<Record<string, unknown>>;
    tenantId: string;
  },
): Promise<{ journey: JourneyVersionRow; surface: SurfaceRow }> {
  const existingSurface = await pool.query<SurfaceRow>(
    `SELECT id, tenant_id, display_name, origin, allowed_path_prefixes,
            requests_per_minute, max_concurrent_contexts, status, created_at, updated_at
     FROM surfaces
     WHERE tenant_id = $1 AND origin = $2 AND status = 'approved'
     ORDER BY created_at ASC LIMIT 1`,
    [input.tenantId, input.origin],
  );

  let surface = existingSurface.rows[0];
  if (!surface) {
    const surfaceResult = await pool.query<SurfaceRow>(
      `INSERT INTO surfaces (
         id, tenant_id, display_name, origin, allowed_path_prefixes,
         requests_per_minute, max_concurrent_contexts, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved')
       RETURNING id, tenant_id, display_name, origin, allowed_path_prefixes,
                 requests_per_minute, max_concurrent_contexts, status, created_at, updated_at`,
      [
        crypto.randomUUID(),
        input.tenantId,
        input.displayName,
        input.origin,
        JSON.stringify(['/']),
        30,
        4,
      ],
    );
    surface = surfaceResult.rows[0]!;
  }

  const existingJourney = await pool.query<JourneyVersionRow>(
    `SELECT id, tenant_id, surface_id, version_label, steps, content_hash, created_at
     FROM journey_versions
     WHERE tenant_id = $1 AND surface_id = $2 AND content_hash = $3
     LIMIT 1`,
    [input.tenantId, surface.id, input.contentHash],
  );

  let journey = existingJourney.rows[0];
  if (!journey) {
    const journeyResult = await pool.query<JourneyVersionRow>(
      `INSERT INTO journey_versions (
         id, tenant_id, surface_id, version_label, steps, content_hash
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, tenant_id, surface_id, version_label, steps, content_hash, created_at`,
      [
        crypto.randomUUID(),
        input.tenantId,
        surface.id,
        'Live audit sequence v1',
        JSON.stringify(input.steps),
        input.contentHash,
      ],
    );
    journey = journeyResult.rows[0]!;
  }

  return {
    journey: { ...journey, steps: parseJsonField(journey.steps) },
    surface: { ...surface, allowed_path_prefixes: parseJsonField(surface.allowed_path_prefixes) },
  };
}

export async function createPersonaVersion(
  pool: pg.Pool,
  input: {
    contentHash: string;
    id: string;
    name: string;
    settings: Record<string, unknown>;
    tenantId: string;
  },
): Promise<PersonaVersionRow> {
  const result = await pool.query<PersonaVersionRow>(
    `INSERT INTO persona_versions (id, tenant_id, name, settings, content_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, tenant_id, name, settings, content_hash, created_at`,
    [input.id, input.tenantId, input.name, JSON.stringify(input.settings), input.contentHash],
  );
  const row = result.rows[0]!;
  return { ...row, settings: parseJsonField(row.settings) };
}

export async function deletePersonaVersion(
  pool: pg.Pool,
  tenantId: string,
  personaVersionId: string,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Remove step_artifacts linked to step_evidence for this persona
    await client.query(
      `DELETE FROM step_artifacts WHERE step_evidence_id IN (
         SELECT id FROM step_evidence WHERE persona_version_id = $1
       )`,
      [personaVersionId],
    );
    // Remove step evidence for this persona
    await client.query('DELETE FROM step_evidence WHERE persona_version_id = $1', [
      personaVersionId,
    ]);
    // Remove run_personas reference
    await client.query('DELETE FROM run_personas WHERE persona_version_id = $1', [
      personaVersionId,
    ]);
    // Delete the persona record itself
    const result = await client.query(
      'DELETE FROM persona_versions WHERE id = $1 AND tenant_id = $2',
      [personaVersionId, tenantId],
    );
    await client.query('COMMIT');
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findSurfaceById(
  pool: pg.Pool,
  tenantId: string,
  surfaceId: string,
): Promise<SurfaceRow | null> {
  const result = await pool.query<SurfaceRow>(
    `SELECT id, tenant_id, display_name, origin, allowed_path_prefixes,
            requests_per_minute, max_concurrent_contexts, status, created_at, updated_at
     FROM surfaces WHERE id = $1 AND tenant_id = $2`,
    [surfaceId, tenantId],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    ...row,
    allowed_path_prefixes: parseJsonField(row.allowed_path_prefixes),
  };
}

export async function findJourneyVersionById(
  pool: pg.Pool,
  tenantId: string,
  journeyVersionId: string,
): Promise<JourneyVersionRow | null> {
  const result = await pool.query<JourneyVersionRow>(
    `SELECT id, tenant_id, surface_id, version_label, steps, content_hash, created_at
     FROM journey_versions WHERE id = $1 AND tenant_id = $2`,
    [journeyVersionId, tenantId],
  );
  const row = result.rows[0];
  return row ? { ...row, steps: parseJsonField(row.steps) } : null;
}

export async function findPersonaVersionsByIds(
  pool: pg.Pool,
  tenantId: string,
  personaVersionIds: string[],
): Promise<PersonaVersionRow[]> {
  if (personaVersionIds.length === 0) {
    return [];
  }
  const result = await pool.query<PersonaVersionRow>(
    `SELECT id, tenant_id, name, settings, content_hash, created_at
     FROM persona_versions
     WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
    [tenantId, personaVersionIds],
  );
  return result.rows.map((row) => ({ ...row, settings: parseJsonField(row.settings) }));
}

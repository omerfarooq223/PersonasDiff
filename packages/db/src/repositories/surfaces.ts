import type pg from 'pg';

import type { JourneyVersionRow, PersonaVersionRow, SurfaceRow } from '../types.js';

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
    allowed_path_prefixes:
      typeof row.allowed_path_prefixes === 'string'
        ? (JSON.parse(row.allowed_path_prefixes) as string[])
        : row.allowed_path_prefixes,
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
  return result.rows[0] ?? null;
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
  return result.rows;
}

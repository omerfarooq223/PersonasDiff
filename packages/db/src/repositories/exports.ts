import type pg from 'pg';
import type { ExportRow } from '../types.js';

export interface CreateExportInput {
  runId: string;
  tenantId: string;
  format: 'json' | 'csv';
  schemaVersion: string;
}

export interface ExportResponse {
  id: string;
  runId: string;
  tenantId: string;
  format: 'json' | 'csv';
  schemaVersion: string;
  manifestHash: string | null;
  status: 'pending' | 'ready' | 'failed' | 'expired';
  storageKey: string | null;
  retentionExpiresAt: string | null;
  createdAt: string;
}

function toExportResponse(row: ExportRow): ExportResponse {
  return {
    id: row.id,
    runId: row.run_id,
    tenantId: row.tenant_id,
    format: row.format,
    schemaVersion: row.schema_version,
    manifestHash: row.manifest_hash,
    status: row.status,
    storageKey: row.storage_key,
    retentionExpiresAt: row.retention_expires_at ? row.retention_expires_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createExportRecord(
  pool: pg.Pool,
  input: CreateExportInput,
): Promise<ExportResponse> {
  const result = await pool.query<ExportRow>(
    `INSERT INTO exports (run_id, tenant_id, format, schema_version, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())
     RETURNING id, run_id, tenant_id, format, schema_version, manifest_hash, status, storage_key, retention_expires_at, created_at`,
    [input.runId, input.tenantId, input.format, input.schemaVersion],
  );
  return toExportResponse(result.rows[0]!);
}

export async function getExportById(
  pool: pg.Pool,
  tenantId: string,
  exportId: string,
): Promise<ExportResponse | null> {
  const result = await pool.query<ExportRow>(
    `SELECT id, run_id, tenant_id, format, schema_version, manifest_hash, status, storage_key, retention_expires_at, created_at
     FROM exports
     WHERE id = $1 AND tenant_id = $2`,
    [exportId, tenantId],
  );
  if (!result.rows[0]) return null;
  return toExportResponse(result.rows[0]);
}

export async function updateExportStatus(
  pool: pg.Pool,
  exportId: string,
  status: 'ready' | 'failed' | 'expired',
  storageKey?: string,
  manifestHash?: string,
  retentionExpiresAt?: Date,
): Promise<ExportResponse | null> {
  const result = await pool.query<ExportRow>(
    `UPDATE exports
     SET status = $1,
         storage_key = COALESCE($2, storage_key),
         manifest_hash = COALESCE($3, manifest_hash),
         retention_expires_at = COALESCE($4, retention_expires_at)
     WHERE id = $5
     RETURNING id, run_id, tenant_id, format, schema_version, manifest_hash, status, storage_key, retention_expires_at, created_at`,
    [status, storageKey ?? null, manifestHash ?? null, retentionExpiresAt ?? null, exportId],
  );
  if (!result.rows[0]) return null;
  return toExportResponse(result.rows[0]);
}

import type pg from 'pg';

import type { AuditEventInput } from '../types.js';

export async function insertAuditEvent(pool: pg.Pool, event: AuditEventInput): Promise<void> {
  await pool.query(
    `INSERT INTO audit_events (
      tenant_id, actor_id, action, resource_type, resource_id,
      request_id, correlation_id, outcome, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      event.tenantId,
      event.actorId,
      event.action,
      event.resourceType,
      event.resourceId,
      event.requestId,
      event.correlationId,
      event.outcome,
      event.metadata ? JSON.stringify(event.metadata) : null,
    ],
  );
}

export async function listAuditEvents(
  pool: pg.Pool,
  tenantId: string,
  limit: number,
  offset: number,
): Promise<{ events: Record<string, unknown>[]; total: number }> {
  const countResult = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM audit_events WHERE tenant_id = $1',
    [tenantId],
  );
  const total = Number(countResult.rows[0]?.count ?? '0');

  const result = await pool.query(
    `SELECT id, tenant_id, actor_id, action, resource_type, resource_id,
            request_id, correlation_id, outcome, metadata, created_at
     FROM audit_events
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );

  return { events: result.rows, total };
}

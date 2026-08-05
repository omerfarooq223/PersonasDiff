import type { RunStatus } from '@ai-parallel-web/domain';
import type { EvidenceState } from '@ai-parallel-web/contracts';

export type UserRole = 'viewer' | 'operator' | 'admin';

export interface TenantRow {
  id: string;
  name: string;
  created_at: Date;
}

export interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  api_token_hash: string;
  created_at: Date;
}

export interface SurfaceRow {
  id: string;
  tenant_id: string;
  display_name: string;
  origin: string;
  allowed_path_prefixes: string[];
  requests_per_minute: number;
  max_concurrent_contexts: number;
  status: 'draft' | 'approved' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

export interface JourneyVersionRow {
  id: string;
  tenant_id: string;
  surface_id: string;
  version_label: string;
  steps: unknown[];
  content_hash: string;
  created_at: Date;
}

export interface PersonaVersionRow {
  id: string;
  tenant_id: string;
  name: string;
  settings: Record<string, unknown>;
  content_hash: string;
  created_at: Date;
}

export interface RunRow {
  id: string;
  tenant_id: string;
  surface_id: string;
  journey_version_id: string;
  status: RunStatus;
  correlation_id: string;
  created_by: string;
  failure_summary: string | null;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

export interface RunPersonaRow {
  id: string;
  run_id: string;
  persona_version_id: string;
  status: RunStatus;
  created_at: Date;
}

export interface StepEvidenceRow {
  id: string;
  run_id: string;
  persona_version_id: string;
  step_id: string;
  step_index: number;
  timestamp_utc: Date;
  monotonic_duration_ns: string;
  final_url: string;
  http_status: number;
  http_ok: boolean;
  overall_state: EvidenceState;
  payload: Record<string, unknown>;
  created_at: Date;
}

export interface StepArtifactRow {
  id: string;
  step_evidence_id: string;
  artifact_type: string;
  storage_key: string;
  sha256: string;
  size_bytes: number;
  mime_type: string;
  state: EvidenceState;
  created_at: Date;
}

export interface RunManifestRow {
  id: string;
  run_id: string;
  schema_version: string;
  total_steps: number;
  completed_steps: number;
  completeness_percentage: number;
  manifest_sha256: string;
  manifest_payload: Record<string, unknown>;
  created_at: Date;
}

export interface RedactionAuditRow {
  id: string;
  run_id: string;
  step_index: number;
  target_type: string;
  identifier: string;
  matches_found: number;
  action_taken: string;
  created_at: Date;
}

export interface DeletionAuditRow {
  id: string;
  run_id: string;
  tenant_id: string | null;
  deleted_artifact_count: number;
  status: string;
  error_message: string | null;
  deleted_at: Date;
}

export interface AuditEventInput {
  tenantId: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  requestId: string;
  correlationId: string | null;
  outcome: 'success' | 'denied' | 'failure';
  metadata?: Record<string, unknown>;
}

export interface CreateRunInput {
  tenantId: string;
  surfaceId: string;
  journeyVersionId: string;
  personaVersionIds: string[];
  correlationId: string;
  createdBy: string;
}

export interface IdempotencyRecord {
  responseStatus: number;
  responseBody: Record<string, unknown>;
}

export const seedIds = {
  tenant: '00000000-0000-4000-8000-000000000001',
  surface: '00000000-0000-4000-8000-000000000010',
  journey: '00000000-0000-4000-8000-000000000020',
  personaControl: '00000000-0000-4000-8000-000000000030',
  personaVariant: '00000000-0000-4000-8000-000000000031',
  adminUser: '00000000-0000-4000-8000-000000000100',
  operatorUser: '00000000-0000-4000-8000-000000000101',
  viewerUser: '00000000-0000-4000-8000-000000000102',
} as const;

export const seedTokens = {
  admin: 'pw-admin-token-dev-only-0001',
  operator: 'pw-operator-token-dev-only-001',
  viewer: 'pw-viewer-token-dev-only-0001',
} as const;

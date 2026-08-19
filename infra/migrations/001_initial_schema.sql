-- Initial schema: tenants, auth, surfaces, journeys, personas, runs, audit, idempotency

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'operator', 'admin')),
  api_token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX users_tenant_id_idx ON users (tenant_id);

CREATE TABLE surfaces (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  display_name TEXT NOT NULL,
  origin TEXT NOT NULL,
  allowed_path_prefixes JSONB NOT NULL,
  requests_per_minute INTEGER NOT NULL,
  max_concurrent_contexts INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX surfaces_tenant_id_idx ON surfaces (tenant_id);

CREATE TABLE journey_versions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  surface_id UUID NOT NULL REFERENCES surfaces(id),
  version_label TEXT NOT NULL,
  steps JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (surface_id, content_hash)
);

CREATE INDEX journey_versions_tenant_id_idx ON journey_versions (tenant_id);

CREATE TABLE persona_versions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  settings JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, content_hash)
);

CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  surface_id UUID NOT NULL REFERENCES surfaces(id),
  journey_version_id UUID NOT NULL REFERENCES journey_versions(id),
  status TEXT NOT NULL CHECK (
    status IN (
      'draft',
      'queued',
      'running',
      'completed',
      'partially_completed',
      'failed',
      'cancelled'
    )
  ),
  correlation_id TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  failure_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX runs_tenant_id_idx ON runs (tenant_id);
CREATE INDEX runs_status_idx ON runs (status);
CREATE INDEX runs_correlation_id_idx ON runs (correlation_id);

CREATE TABLE run_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  persona_version_id UUID NOT NULL REFERENCES persona_versions(id),
  status TEXT NOT NULL CHECK (
    status IN (
      'draft',
      'queued',
      'running',
      'completed',
      'partially_completed',
      'failed',
      'cancelled'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX run_personas_run_id_idx ON run_personas (run_id);

CREATE TABLE step_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_persona_id UUID NOT NULL REFERENCES run_personas(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  status TEXT NOT NULL,
  final_url TEXT,
  artifact_refs JSONB,
  content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_persona_id, step_index)
);

CREATE TABLE comparison_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  metric_version TEXT NOT NULL,
  scope JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  format TEXT NOT NULL CHECK (format IN ('json', 'csv')),
  schema_version TEXT NOT NULL,
  manifest_hash TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'failed', 'expired')),
  storage_key TEXT,
  retention_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX exports_tenant_id_idx ON exports (tenant_id);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  request_id TEXT NOT NULL,
  correlation_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'denied', 'failure')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_tenant_id_created_at_idx ON audit_events (tenant_id, created_at DESC);

CREATE TABLE idempotency_keys (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, key)
);

CREATE INDEX idempotency_keys_expires_at_idx ON idempotency_keys (expires_at);

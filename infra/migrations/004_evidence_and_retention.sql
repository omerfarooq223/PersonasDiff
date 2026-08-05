-- Migration 004: Evidence Capture, Manifests, Redaction Audits, and Retention Rules

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_state_enum') THEN
        CREATE TYPE evidence_state_enum AS ENUM ('PRESENT', 'CENSOR_REDACTED', 'BLOCKED', 'MISSING_FAILURE');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS step_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    persona_version_id UUID NOT NULL REFERENCES persona_versions(id),
    step_id VARCHAR(128) NOT NULL,
    step_index INT NOT NULL,
    timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    monotonic_duration_ns BIGINT NOT NULL,
    final_url TEXT NOT NULL,
    http_status INT NOT NULL,
    http_ok BOOLEAN NOT NULL,
    overall_state evidence_state_enum NOT NULL DEFAULT 'PRESENT',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_run_persona_step UNIQUE (run_id, persona_version_id, step_index)
);

CREATE TABLE IF NOT EXISTS step_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_evidence_id UUID NOT NULL REFERENCES step_evidence(id) ON DELETE CASCADE,
    artifact_type VARCHAR(64) NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    sha256 CHAR(64) NOT NULL,
    size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    state evidence_state_enum NOT NULL DEFAULT 'PRESENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS run_manifests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL UNIQUE REFERENCES runs(id) ON DELETE CASCADE,
    schema_version VARCHAR(32) NOT NULL DEFAULT 'v1',
    total_steps INT NOT NULL,
    completed_steps INT NOT NULL,
    completeness_percentage NUMERIC(5,2) NOT NULL,
    manifest_sha256 CHAR(64) NOT NULL,
    manifest_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS redaction_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    step_index INT NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    identifier TEXT NOT NULL,
    matches_found INT NOT NULL,
    action_taken VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    retention_days INT NOT NULL DEFAULT 30,
    auto_delete_artifacts BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deletion_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL,
    tenant_id UUID,
    deleted_artifact_count INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    error_message TEXT,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_step_evidence_run_persona ON step_evidence (run_id, persona_version_id);
CREATE INDEX IF NOT EXISTS idx_step_artifacts_sha256 ON step_artifacts (sha256);
CREATE INDEX IF NOT EXISTS idx_redaction_audit_run ON redaction_audit_logs (run_id);

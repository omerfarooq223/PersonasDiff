-- Migration 005: Comparison Metrics and Results Persistence

CREATE TABLE IF NOT EXISTS comparison_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    comparison_id VARCHAR(256) NOT NULL,
    metric_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    compared_personas UUID[] NOT NULL,
    timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    overall_observation TEXT NOT NULL,
    confidence VARCHAR(16) NOT NULL CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
    warnings TEXT[] NOT NULL DEFAULT '{}',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_run_comparison UNIQUE (run_id, comparison_id)
);

CREATE TABLE IF NOT EXISTS comparison_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comparison_result_id UUID NOT NULL REFERENCES comparison_results(id) ON DELETE CASCADE,
    metric_name VARCHAR(64) NOT NULL,
    metric_version VARCHAR(32) NOT NULL,
    raw_inputs JSONB NOT NULL,
    normalized_inputs JSONB NOT NULL,
    result_value TEXT NOT NULL,
    explanation TEXT NOT NULL,
    confidence VARCHAR(16) NOT NULL CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
    warnings TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comparison_results_run ON comparison_results (run_id);
CREATE INDEX IF NOT EXISTS idx_comparison_metrics_result ON comparison_metrics (comparison_result_id);
CREATE INDEX IF NOT EXISTS idx_comparison_metrics_name ON comparison_metrics (metric_name);

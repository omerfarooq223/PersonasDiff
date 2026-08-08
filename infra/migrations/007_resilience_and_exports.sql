-- Day 7 migration: resilience columns, dead_letter_jobs, exports enhancements

ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS worker_id TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quarantined_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS runs_lease_expires_at_idx ON runs (lease_expires_at);
CREATE INDEX IF NOT EXISTS runs_worker_id_idx ON runs (worker_id);

CREATE TABLE IF NOT EXISTS dead_letter_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  error_stack TEXT,
  quarantined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dead_letter_jobs_run_id_idx ON dead_letter_jobs (run_id);

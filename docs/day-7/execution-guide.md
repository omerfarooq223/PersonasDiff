# AI Parallel Web — Day 7 Execution Guide

## Day 7 outcome

By the end of today, an authorized operator can request a portable export without blocking the API, an independent consumer can validate every exported byte, workers recover safely from bounded transient failures, poisoned work is quarantined, new work is rejected before capacity becomes unsafe, reconciliation repairs stranded state without duplicating completed steps, and a metadata restore resolves intact evidence objects.

Day 7 is complete only when real-service failure tests pass. Mock-only tests are useful for development but are not gate evidence.

## Owners and execution order

- **Backend Engineer:** export contracts, export worker, job repository, reconciliation logic, authorization, and audit.
- **QA/SRE:** failure injection, capacity experiment, queue limits, graceful shutdown, backup/restore drill, and evidence capture.
- **Security/Privacy reviewer:** download authorization, export contents, retention, audit metadata, dead-letter redaction, and restore access.
- **Recommended parallel work:** Backend starts export/job contracts while QA/SRE prepares failure proxies and an isolated restore environment.

### Suggested schedule

| Time        | Workstream                                 | Exit condition                                                 |
| ----------- | ------------------------------------------ | -------------------------------------------------------------- |
| 08:30–09:15 | Prerequisites and baseline                 | Root checks run; migrations/fixtures confirmed; blockers owned |
| 09:15–11:15 | Export contract and asynchronous worker    | `POST` returns `202`; worker produces JSON, CSV, and manifest  |
| 11:15–12:30 | Leases, fencing, retry classification, DLQ | Crash-safe job transitions and tests pass                      |
| 13:15–14:30 | Reconciliation                             | Expired jobs and partial exports repair idempotently           |
| 14:30–15:45 | Surface concurrency and pacing             | Atomic capacity acquisition and useful `429` behavior          |
| 15:45–16:45 | Backup/restore drill                       | Restored metadata resolves and verifies evidence               |
| 16:45–17:30 | Failure suite and gate review              | All scenarios pass; evidence and learnings recorded            |

## Current repository baseline and blockers

The repository already contains partial Day 7 work. Preserve it and evolve it; do not create a second competing implementation.

### Existing starting points

- `apps/api/src/routes/exports.ts`
- `apps/api/src/middleware/backpressure.ts`
- `packages/domain/src/export-builder.ts`
- `packages/domain/src/resilience-policy.ts`
- `packages/domain/src/reconciliation-engine.ts`
- `packages/db/src/repositories/exports.ts`
- `packages/db/src/repositories/resilience.ts`
- `packages/db/src/repositories/reconciliation.ts`
- `packages/storage/src/backup-restore.ts`
- `infra/migrations/007_resilience_and_exports.sql`
- `infra/scripts/backup-metadata.sh`
- `infra/scripts/restore-metadata.sh`
- `tests/failure-injection/*`

### Must-fix baseline issues before the Day 7 gate

1. **The export request is synchronous.** The current route builds and uploads the export inside the HTTP request and returns `201`. It must create durable work and return `202` quickly.
2. **The export manifest and schema disagree.** The builder emits `exportVersion`, `generatedAt`, and `files`; the published schema expects `schemaVersion`, `createdAt`, `configurationHash`, `artifacts`, and `warnings`. Choose one versioned contract and make the builder, schema, examples, OpenAPI, and validator identical.
3. **The current export may claim files it did not upload.** A JSON-only request uploads one object while the manifest lists JSON and CSV. A manifest may list only bytes that exist in the export bundle.
4. **CSV serialization is unsafe/incomplete.** Values need RFC 4180 quote escaping, newline handling, and spreadsheet-formula neutralization for cells beginning with `=`, `+`, `-`, `@`, tab, or carriage return.
5. **Internal storage keys leak into portable output.** Export logical paths such as `artifacts/persona-a/step-1.png`; do not expose provider bucket/key structure or signed URLs in the bundle.
6. **Signed-download fallback fails open.** `S3Storage.getSignedUrl` currently constructs a direct endpoint URL if the presigner fails. Remove the fallback; return a controlled error instead of a potentially public URL.
7. **Run-level leases are not sufficient for export jobs.** Exports, browser execution, comparison, and reconciliation require a generic durable job identity or separate job tables. Do not overload one run row as every job.
8. **Leases lack fencing.** A worker whose lease expired can still finish late and overwrite a newer worker's result. Every state-changing write must include the current lease token/epoch.
9. **Heartbeat failure is ignored.** A false renewal or repeated database error must abort the worker's authority to commit; logging and continuing is unsafe.
10. **Back-pressure is race-prone and fail-open.** Counting running rows in an API hook cannot enforce concurrency atomically. The current hook also runs for every route and allows new work when its database query fails.
11. **Request pacing is missing.** Concurrency limits do not enforce the approved requests-per-minute rate for browser subrequests.
12. **Reconciliation only finds expired runs.** It must also handle stale export jobs, partial uploads, orphaned objects, and inconsistent ready/failed records.
13. **Restore verification checks only existence.** Verify size and stored checksum metadata for all objects and recompute bytes for a sample or all reference-run objects.
14. **Failure tests are mock-only.** Keep them as unit tests, then add real-service tests using the local stack and actual worker processes.
15. **The root type check is not currently green.** `apps/api` references `packages/domain`, which is not configured as a composite project, and installed frontend dependencies are out of sync with `apps/web/package.json`. Fix the project-reference strategy and run `npm install` before using root CI as gate evidence.

Do not start load or crash testing until migrations are applied to an isolated development database and the root build is reproducible.

## Dependencies and prerequisites

### Required outputs from earlier days

| Dependency                                                                       | Why Day 7 needs it                                  | Proof before starting                           | Blocker action                                                |
| -------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Approved surface policy with `requests_per_minute` and `max_concurrent_contexts` | Capacity must protect the real target policy        | Approved `surfaces` row and policy document     | Do not invent a higher limit; use fixture-only capacity tests |
| Transactional run state and idempotent run creation                              | Recovery must not duplicate runs                    | Day 2 state/idempotency integration test        | Fix before adding retries                                     |
| Tenant-scoped auth and audit repository                                          | Export and downloads contain sensitive evidence     | Cross-tenant run access tests                   | Block download endpoints                                      |
| Isolated browser worker with deterministic step IDs                              | Retry safety depends on stable step identity        | Day 3 isolation and duplicate-step tests        | Add stable job/step keys first                                |
| Immutable evidence with SHA-256, size, media type, and storage key               | Export and restore validate existing evidence       | Day 4 manifest/completeness tests               | Block export readiness                                        |
| Versioned comparison results, metric definitions, and warnings                   | Export must explain results                         | Day 5 golden fixtures and metric version        | Export raw evidence only until available                      |
| Evidence-only replay and operator status semantics                               | Export status must align with UI vocabulary         | Day 6 run-status/replay tests                   | Keep API contract explicit                                    |
| PostgreSQL, Redis, and object storage local stack                                | Real failure injection requires actual dependencies | Health checks and migrations pass               | Fix local stack first                                         |
| Node.js 24 and synchronized lockfile                                             | CI and local results must match supported runtime   | `node --version`, `npm ci`, `npm run typecheck` | Do not accept Node 20-only evidence                           |

### Decisions to make by 09:15

- Does one export request always produce JSON + CSV + manifest, or can formats be selected? **Recommended:** one bundle contains both JSON and CSV, and the manifest lists exactly those files.
- Is the portable download a ZIP, or separate signed files? **Recommended:** prebuild an immutable ZIP plus expose the manifest separately for validation.
- What is the export retention period and maximum bundle size?
- Which job types share the generic lease table, and what are their attempt/time budgets?
- Which failures are transient, permanent, poison, or operator-action-required?
- What happens when Redis is unavailable? **Recommended:** stop accepting new surface work or fall back to a conservative PostgreSQL limiter; never bypass pacing.
- Are downloads streamed through the API or exchanged through an authenticated short-lived token? **Recommended:** authenticated token exchange or API streaming so authorization is checked at link request and actual download time.
- What recovery point objective and recovery time objective does the restore drill target?

## Task 1 — Build the asynchronous export service

### 1.1 Freeze one portable export contract

**Build:** A versioned bundle with these logical files:

```text
export-{exportId}/
├── data/run.json
├── data/steps.csv
├── artifacts/index.json
├── manifest.json
└── README.txt
```

`manifest.json` must contain:

- `schemaVersion`
- `exportId`, `runId`, `tenantId` only if tenant exposure is approved
- `createdAt`
- immutable run configuration snapshot and its SHA-256
- journey/persona version IDs and hashes
- metric definitions with algorithm version and non-causal explanations
- warnings and missing-evidence states
- one entry per actual file: relative path, media type, byte length, SHA-256
- artifact index entries using logical relative paths, original evidence SHA-256, size, media type, persona/step identity, and capture timestamp
- generator release SHA

**Why:** Independent verification is impossible when schema, builder, files, and manifest disagree.

**Write:** Update the JSON Schema first, add a valid example, and generate TypeScript types or manually mirror the schema with a contract test.

**Acceptance:** The manifest example, built manifest, and independent validator all pass the same schema version. No listed file is absent and no unlisted file is included in the downloadable bundle.

### 1.2 Make export creation asynchronous and idempotent

**Build:** `POST /v1/runs/{runId}/exports` creates an `exports` record and an `export.build` job in one database transaction. It does not read all evidence or upload bytes.

**Why:** Large exports must not hold an API connection, and a crash between record creation and queue publication must not lose work.

**Write:** Require an `Idempotency-Key`; hash `{tenantId, runId, requestedFormats, schemaVersion}`. Use a unique constraint so the same key and body returns the existing export. Insert the durable job in the same transaction as the export row. Redis may notify workers after commit, but PostgreSQL remains the source of truth.

**HTTP behavior:**

- `202 Accepted`
- `Location: /v1/exports/{exportId}`
- body: `id`, `runId`, `status: queued`, `schemaVersion`, `createdAt`
- `409` when the idempotency key is reused with a different request body
- `422` when the run is not in an exportable state
- `429` when export queue capacity is full

```ts
// apps/api/src/routes/exports.ts — pattern
app.post('/v1/runs/:runId/exports', async (request, reply) => {
  const user = requireExportPermission(request, reply);
  if (!user) return;

  const input = parseExportRequest(request);
  const requestHash = hashCanonical({
    formats: input.formats,
    runId: request.params.runId,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    tenantId: user.tenantId,
  });

  const result = await db.transaction(async (tx) => {
    const run = await tx.runs.lockExportableRun(user.tenantId, request.params.runId);
    const existing = await tx.exports.findByIdempotencyKey(user.tenantId, input.idempotencyKey);
    if (existing) return assertSameHashOrConflict(existing, requestHash);

    const exportRecord = await tx.exports.createQueued({
      idempotencyKey: input.idempotencyKey,
      requestHash,
      runId: run.id,
      schemaVersion: EXPORT_SCHEMA_VERSION,
      tenantId: user.tenantId,
    });
    await tx.jobs.enqueue({
      dedupeKey: `export:${exportRecord.id}:${requestHash}`,
      maxAttempts: 4,
      payload: { exportId: exportRecord.id, tenantId: user.tenantId },
      type: 'export.build',
    });
    await tx.audit.success('export.requested', user, exportRecord.id, request.id);
    return exportRecord;
  });

  return reply
    .header('Location', `/v1/exports/${result.id}`)
    .status(202)
    .send(toPublicExport(result));
});
```

### 1.3 Build the export worker

**Build:** A separately runnable `worker-export` that claims `export.build` jobs, starts a heartbeat, reads one consistent evidence snapshot, builds bytes, uploads to an attempt-specific prefix, verifies uploaded metadata, promotes/finalizes the export, and commits `ready` using the lease fencing token.

**Why:** The worker must be restartable at every boundary without publishing partial or duplicate exports.

**Write the phases explicitly:**

1. `queued → leased`
2. Load run/config/metrics/warnings/artifact metadata inside a repeatable-read transaction or record a source snapshot version.
3. Build canonical JSON and safe CSV as `Buffer`s.
4. Build manifest from the exact buffers.
5. Build ZIP from JSON, CSV, artifact index, manifest, and README.
6. Upload under `exports/{tenantId}/{exportId}/attempts/{attemptId}/...`.
7. HEAD every uploaded object and compare checksum/size.
8. In one fenced transaction, write final keys/hashes and set `ready`.
9. Best-effort delete superseded attempt prefixes after a grace period; reconciliation handles leftovers.

```ts
export class ExportWorker {
  constructor(
    private readonly jobs: JobRepository,
    private readonly exports: ExportRepository,
    private readonly source: ExportSourceRepository,
    private readonly storage: StorageAdapter,
  ) {}

  async process(claim: JobClaim, signal: AbortSignal): Promise<void> {
    const heartbeat = startLeaseHeartbeat(this.jobs, claim, signal);
    try {
      const snapshot = await this.source.loadSnapshot(claim.payload.exportId);
      const bundle = buildExportBundle(snapshot); // exact Buffers, stable ordering
      const prefix = attemptPrefix(claim);

      for (const file of bundle.files) {
        throwIfAborted(signal);
        await this.storage.putObject({
          body: file.bytes,
          checksumSha256: file.sha256,
          contentType: file.mediaType,
          key: `${prefix}/${file.path}`,
        });
      }

      await verifyUploadedBundle(this.storage, prefix, bundle.manifest);
      await this.exports.markReadyFenced({
        bundleSha256: bundle.bundleSha256,
        exportId: claim.payload.exportId,
        finalPrefix: prefix,
        leaseEpoch: claim.leaseEpoch,
        manifestSha256: bundle.manifestSha256,
      });
      await this.jobs.completeFenced(claim);
    } finally {
      await heartbeat.stop();
    }
  }
}
```

### 1.4 Serialize canonical JSON and safe CSV

**Build:** Stable ordering and exact-byte hashing. Never hash an object and later serialize it differently.

```ts
function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // neutralize formulas
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: readonly unknown[]): string {
  return `${values.map(csvCell).join(',')}\r\n`;
}

function buildManifest(files: readonly BuiltFile[], metadata: ExportMetadata): BuiltFile {
  const manifest = {
    ...metadata,
    files: files.map((file) => ({
      bytes: file.bytes.byteLength,
      mediaType: file.mediaType,
      path: file.path,
      sha256: sha256(file.bytes),
    })),
  };
  const bytes = Buffer.from(stableStringify(manifest), 'utf8');
  return { bytes, mediaType: 'application/json', path: 'manifest.json', sha256: sha256(bytes) };
}
```

Sort personas, steps, metrics, warnings, and artifact entries by stable identifiers. Record numeric and timestamp formatting rules in the schema documentation.

### 1.5 Add status, download, authorization, and audit

**Build:**

- `GET /v1/exports/{id}` — tenant-scoped status and file metadata.
- `POST /v1/exports/{id}/download-token` — rechecks authorization and issues a short-lived, single-purpose token.
- `GET /v1/downloads/{token}` — checks token expiry/nonce, current user authorization, export retention/status, and file allowlist; then streams the file or returns a very short S3 URL.

**Why:** A 15-minute S3 URL is a bearer credential. Checking access only when generating it does not satisfy authorization at actual download time or allow immediate revocation.

**Write:** Bind the download token to `userId`, `tenantId`, `exportId`, `fileId`, expiry, and nonce. Store only a token hash. Mark one-time tokens consumed if one-time use is required. Sanitize filenames and set:

```text
Content-Type: application/zip
Content-Disposition: attachment; filename="ai-parallel-web-{runId}.zip"
X-Content-Type-Options: nosniff
Cache-Control: private, no-store
```

Audit `export.requested`, `export.ready`, `export.failed`, `export.download_token_issued`, `export.downloaded`, and denied attempts. Do not log token values, signed URLs, raw artifact keys, CSV content, or exception stacks containing secrets.

### Export acceptance

- API returns `202` before export generation begins.
- Repeated same-key request returns the same export; changed body returns `409`.
- Bundle schema validates and every hash matches independently.
- Manifest lists only actual bundle files.
- CSV round-trips commas, quotes, CR/LF, Unicode, and formula-like strings safely.
- Cross-tenant status/link/download requests are denied and audited.
- Expired/consumed token and expired export cannot download.
- Storage/presigner failure returns controlled `503`/failed status; never a public fallback URL.

## Task 2 — Implement job resilience

### 2.1 Add a durable generic job model

**Build:** A `jobs` table for `browser.run`, `comparison.build`, `export.build`, and `reconciliation.*` work. Redis is notification/acceleration, not the source of truth.

Minimum columns:

```text
id, tenant_id, type, resource_id, payload_json, payload_hash, dedupe_key,
status, attempt_count, max_attempts, scheduled_at,
lease_owner, lease_epoch, lease_expires_at, last_heartbeat_at,
error_class, error_code, sanitized_error,
created_at, started_at, completed_at, updated_at
```

Add unique `dedupe_key`, due-job index `(status, scheduled_at)`, lease-expiry index, and a check constraint for legal statuses. Keep job attempts in `job_attempts` if detailed operational history is required.

**Why:** A run can create several independent jobs. A durable job row makes retries and crash recovery observable and transactional.

### 2.2 Claim with an atomic lease and fencing epoch

```sql
WITH candidate AS (
  SELECT id
  FROM jobs
  WHERE status IN ('queued', 'retry_wait')
    AND scheduled_at <= now()
  ORDER BY scheduled_at, created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE jobs AS j
SET status = 'running',
    lease_owner = $1,
    lease_epoch = lease_epoch + 1,
    lease_expires_at = now() + $2::interval,
    last_heartbeat_at = now(),
    attempt_count = attempt_count + 1,
    started_at = COALESCE(started_at, now()),
    updated_at = now()
FROM candidate
WHERE j.id = candidate.id
RETURNING j.*;
```

Every completion/update statement must contain:

```sql
WHERE id = $job_id
  AND status = 'running'
  AND lease_owner = $worker_id
  AND lease_epoch = $lease_epoch
  AND lease_expires_at > now()
```

Zero updated rows means the worker lost authority and must not publish completion.

### 2.3 Heartbeat without overlapping timers

Avoid `setInterval(async () => ...)`, which can overlap slow renewals. Use a serial loop with an abort signal and treat loss of lease as fatal to the current attempt.

```ts
async function heartbeatLoop(claim: JobClaim, controller: AbortController): Promise<void> {
  while (!controller.signal.aborted) {
    await delay(HEARTBEAT_MS, controller.signal);
    const renewed = await jobs.renewFenced(claim, LEASE_MS);
    if (!renewed) {
      controller.abort(new LeaseLostError(claim.id));
      return;
    }
  }
}
```

Use a lease at least three times the normal heartbeat interval. Alert on renewal latency approaching the interval.

### 2.4 Classify failures and enforce retry budgets

**Build:** A central classifier, not string matching scattered across repositories.

| Class              | Examples                                                             | Action                                                            |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `transient`        | DB connection reset before commit, S3 `429/5xx`, network reset       | Retry with full jitter within attempt and elapsed-time budget     |
| `ambiguous_commit` | Client timed out after DB/storage may have committed                 | Read by idempotency/dedupe key; reconcile before retrying write   |
| `target_transient` | Approved target timeout/`429`                                        | Honor target `Retry-After`, surface pacing, small separate budget |
| `permanent`        | Permission revoked, missing required evidence, unsupported schema    | Fail without automatic retry; operator-visible reason             |
| `poison`           | Invalid job schema, deterministic parser crash for same payload hash | Quarantine immediately                                            |
| `cancelled`        | Operator cancellation or shutdown deadline                           | Cooperative stop; requeue only if operation is idempotent         |

```ts
interface RetryDecision {
  class:
    'transient' | 'ambiguous_commit' | 'target_transient' | 'permanent' | 'poison' | 'cancelled';
  retry: boolean;
  delayMs: number;
  publicCode: string;
  quarantine: boolean;
}

function fullJitter(attempt: number, baseMs: number, capMs: number): number {
  const ceiling = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.floor(Math.random() * ceiling);
}
```

Use separate budgets, for example:

- browser step: 2 retries and maximum 60 seconds added delay
- comparison: 3 attempts and 10 minutes elapsed
- export: 4 attempts and 30 minutes elapsed
- reconciliation action: 3 attempts per pass, then operator alert

Tune these with observed evidence; do not copy example numbers into production without the capacity/failure experiment.

### 2.5 Dead-letter and poison quarantine

**Build:** A dead-letter record that points to the job, job type, resource, payload hash, attempt count, classification, sanitized error code, first/last failure time, and operator disposition. Store raw payloads only in the original authorized source; do not duplicate secrets or captured content into the DLQ.

**Operator actions:** inspect, acknowledge, retry after correction, cancel, or permanently quarantine. Retrying creates a new attempt/audit event; it does not erase history.

**Why:** A dead-letter queue without an inspection and disposition path becomes a silent data graveyard.

### 2.6 Graceful shutdown

On `SIGTERM`:

1. Mark worker unready and stop claiming jobs.
2. Abort external requests through `AbortController`.
3. Keep heartbeating while the current idempotent boundary finishes.
4. If completion cannot occur before the shutdown deadline, record/requeue safely or let the lease expire.
5. Wait for heartbeat and job promises to settle.
6. Close DB, Redis, storage, and browser resources.
7. Exit nonzero if safe handoff failed.

`SIGKILL` cannot be handled; the expired lease and reconciliation path must recover it.

### Resilience acceptance

- Two workers cannot own the same job epoch.
- A late worker cannot commit after its lease is stolen.
- Heartbeat loss aborts completion.
- Retry count and elapsed budgets are enforced transactionally.
- Poison payload is processed once, quarantined, redacted, and visible to an operator.
- Graceful shutdown stops claims and either completes or safely hands off current work.

## Task 3 — Reconcile stranded runs, jobs, and artifacts

### 3.1 Define invariants before writing repair code

Key invariants:

- A `ready` export has a validated manifest and every referenced file.
- A `running` job has one unexpired lease and epoch.
- A terminal job has no active lease.
- A completed step has one idempotent logical identity `(run, persona, step, attempt policy)`.
- An artifact referenced by committed evidence exists and its size/checksum match.
- An unreferenced attempt object older than the grace period is quarantined or deleted.
- Reconciliation actions are idempotent and audited.

### 3.2 Reconcile expired jobs safely

Select expired `running` jobs with `FOR UPDATE SKIP LOCKED`, in bounded batches. Recheck state inside the transaction. If the attempt budget remains, set `retry_wait`, clear lease fields, and set `scheduled_at` with jitter. Otherwise mark failed/dead-letter. Never change a job that renewed after the initial scan.

### 3.3 Reconcile partial exports

For queued/processing exports older than thresholds:

- No job exists → create a deduplicated export job.
- Job terminal failed → mark export failed with public error code.
- Objects exist and all hashes match but DB finalization is missing → finalize through a fenced/idempotent transaction.
- Some attempt objects exist → keep them during grace period, retry build, then delete/quarantine superseded attempt prefix.
- Export says ready but object/manifest is missing → revoke downloads, mark `integrity_failed`, alert Security/SRE, and preserve audit evidence.

### 3.4 Find orphaned objects without unsafe deletion

Write an object-inventory adapter that lists only the application-owned prefix. Compare object keys to committed DB references and active attempt prefixes. Require an age/grace threshold. First write candidates to an `orphaned_artifacts` table with `discovered_at`; delete only after a later pass confirms the object is still orphaned and no legal hold/active export references it.

### 3.5 Make reconciliation observable

Return and emit:

- scanned count
- expired jobs requeued/failed
- exports finalized/failed
- orphan candidates discovered/deleted
- integrity failures
- per-action error count and duration

Use a singleton scheduler lease so several replicas may start but only one reconciliation pass owns a partition. Partition by tenant or key range if scale requires it.

```ts
async function reconcileBatch(now: Date): Promise<ReconciliationSummary> {
  const expired = await jobs.claimExpiredForReconciliation({ limit: 100, now });
  for (const job of expired) {
    await db.transaction(async (tx) => {
      const current = await tx.jobs.lock(job.id);
      if (!isStillExpired(current, now)) return;
      const action = decideExpiredJobAction(current);
      await applyActionIdempotently(tx, action);
      await tx.audit.recordReconciliation(action);
    });
  }
  await reconcileStaleExports(now);
  await discoverOrphans(now);
  return metrics.snapshot();
}
```

### Reconciliation acceptance

- Re-running the same pass produces no additional state change.
- Concurrent reconcilers do not double-increment retry counts.
- Expired worker job becomes retryable or terminal exactly once.
- Ready export with missing object is blocked from download and alerted.
- Partial upload is finalized only when every checksum matches.
- Orphans are never deleted on first sight or while an active attempt/retention hold references them.

## Task 4 — Enforce concurrency, queue depth, and request pacing

### 4.1 Move admission control to relevant routes

Apply admission control to new-work endpoints only:

- `POST /v1/runs`
- `POST /v1/runs/{id}/exports`
- operator retry endpoints

Do not run surface-concurrency queries for health, status, replay, or download requests. Keep general per-client API rate limiting separate from workload capacity.

### 4.2 Return a consistent back-pressure problem

```json
{
  "type": "capacity-exceeded",
  "title": "Capacity temporarily unavailable",
  "status": 429,
  "detail": "The approved surface concurrency limit is currently in use.",
  "requestId": "...",
  "scope": "surface",
  "retryAfterSeconds": 15
}
```

Set `Retry-After`, do not reveal other tenant IDs or raw queue depth, and audit only aggregated/approved metadata. Return `503` when the admission dependency itself is unavailable and safe capacity cannot be established. Do not fail open for new public-surface work.

### 4.3 Enforce concurrency atomically in the worker

The API can provide early rejection, but the worker is the enforcement point. Acquire a per-surface capacity lease atomically before opening browser contexts. Capacity is derived from the approved surface row, not a hard-coded global constant.

Possible PostgreSQL pattern:

```sql
INSERT INTO surface_leases(surface_id, slot, job_id, lease_expires_at)
SELECT $surface_id, slot, $job_id, now() + $lease
FROM generate_series(1, $max_concurrency) AS slot
WHERE NOT EXISTS (
  SELECT 1 FROM surface_leases s
  WHERE s.surface_id = $surface_id
    AND s.slot = slot
    AND s.lease_expires_at > now()
)
ORDER BY slot
LIMIT 1
ON CONFLICT (surface_id, slot) DO UPDATE
SET job_id = EXCLUDED.job_id, lease_expires_at = EXCLUDED.lease_expires_at
WHERE surface_leases.lease_expires_at <= now()
RETURNING slot;
```

Use a fencing epoch for the slot as well. Release on completion; expiry handles crashes.

### 4.4 Pace every target request with a token bucket

Concurrency limits browser contexts; pacing limits requests. Before each navigation/subresource request allowed by policy, consume a surface token. Configure capacity and refill from the approved `requests_per_minute` value.

Redis/Lua pattern:

```lua
-- KEYS[1] surface bucket; ARGV: now_ms, capacity, refill_per_ms, requested
local state = redis.call('HMGET', KEYS[1], 'tokens', 'updated')
local tokens = tonumber(state[1]) or tonumber(ARGV[2])
local updated = tonumber(state[2]) or tonumber(ARGV[1])
tokens = math.min(tonumber(ARGV[2]), tokens + (ARGV[1] - updated) * ARGV[3])
if tokens < tonumber(ARGV[4]) then
  local wait_ms = math.ceil((ARGV[4] - tokens) / ARGV[3])
  return {0, wait_ms}
end
tokens = tokens - tonumber(ARGV[4])
redis.call('HMSET', KEYS[1], 'tokens', tokens, 'updated', ARGV[1])
redis.call('PEXPIRE', KEYS[1], math.ceil(ARGV[2] / ARGV[3]) * 2)
return {1, 0}
```

Use server time or control clock skew. Honor target `Retry-After` by suspending/refilling more conservatively. If Redis is unavailable, stop new surface requests or use the approved conservative fallback; never send unpaced traffic.

### 4.5 Set queue limits by scope

Enforce:

- global ready/queued job limit
- per-tenant queued job limit
- per-surface queued/running limit
- per-user submission rate
- export byte/row limit

Count from the durable job table, not run status alone. Reserve capacity for reconciliation/operations so a full browser queue cannot prevent repair jobs.

### 4.6 Run a bounded capacity experiment

Using only the deterministic fixture unless the public-surface owner explicitly approves the load:

1. Start at one browser context and approved request rate.
2. Increase concurrency one level at a time.
3. Record run success, p95 duration, queue age, worker CPU/memory, DB pool wait, Redis latency, storage latency, and target `429/timeouts`.
4. Stop on error-rate increase, evidence incompleteness, queue-age breach, resource saturation, or target distress.
5. Set production default below the first unstable point, with safety margin.

### Back-pressure acceptance

- Concurrent API requests cannot race past the worker surface limit.
- Every target request consumes pacing capacity.
- Queue limit returns `429` plus useful `Retry-After`; dependency failure returns safe `503`.
- Read/status/download endpoints remain available when creation is back-pressured.
- Limits come from approved surface/tenant configuration and are observable.
- Capacity record names the tested workload, environment, stop point, and chosen safe limit.

## Task 5 — Exercise backup and restore

### 5.1 Define what is backed up

Metadata backup must include tenants/users references, surfaces, immutable journey/persona versions, runs, run personas, evidence metadata, artifact references and hashes, manifests, comparisons, exports, durable jobs, dead letters, audit events, and schema migration history.

Object storage protection must be explicit: versioning/replication or a tested copy process. A PostgreSQL dump that contains keys is not a backup of the artifact bytes.

### 5.2 Produce a safe metadata backup package

Recommended package:

```text
backup-{timestamp}/
├── metadata.dump                 # pg_dump custom format
├── artifact-inventory.jsonl      # key, sha256, size, media type, run/export reference
├── migrations.txt
├── backup-metadata.json          # source DB identity, app release, timestamps, tool versions
└── manifest.sha256
```

Use `pg_dump --format=custom --no-owner --no-acl`. Encrypt and store the package in the approved backup location. Do not commit backups. Avoid `--clean` in the backup itself; restore policy belongs in the restore command.

```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file "$BACKUP_DIR/metadata.dump"

psql "$DATABASE_URL" --csv -c "
  SELECT storage_key, sha256, size_bytes, mime_type, step_evidence_id
  FROM step_artifacts
  ORDER BY storage_key
" > "$BACKUP_DIR/artifact-inventory.csv"

sha256sum "$BACKUP_DIR"/metadata.dump "$BACKUP_DIR"/artifact-inventory.csv \
  > "$BACKUP_DIR/manifest.sha256"
```

Use the platform-equivalent hash command on macOS. The final script should detect the command and write one stable manifest format.

### 5.3 Restore only into an isolated target

The restore script must require an explicit target database, refuse known production hosts by default, verify backup checksums before mutation, confirm the target is empty or require an explicit destructive flag, restore with `pg_restore`, run migrations, and then run application-level verification.

```bash
test "${ALLOW_DESTRUCTIVE_RESTORE:-false}" = "true" || {
  echo "Set ALLOW_DESTRUCTIVE_RESTORE=true for the isolated restore target" >&2
  exit 2
}

sha256sum --check "$BACKUP_DIR/manifest.sha256"
pg_restore \
  --dbname "$RESTORE_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --exit-on-error \
  "$BACKUP_DIR/metadata.dump"
```

Never default a restore script to a production-looking database URL.

### 5.4 Verify metadata-to-object integrity

For every reference-run object and, if practical, every object:

- HEAD object exists.
- Content length equals metadata.
- stored checksum metadata equals DB SHA-256.
- GET and recompute SHA-256 for the reference run or a statistically documented sample.
- run/export manifest hashes recompute.
- tenant authorization still scopes restored records.
- signed download of a restored export works and expires.

Classify `missing`, `size_mismatch`, `metadata_checksum_mismatch`, `content_checksum_mismatch`, and `access_error` separately. A HEAD success alone is insufficient.

### 5.5 Record the restore drill

Capture:

- source backup ID/hash and application/schema version
- isolated destination identity
- start/end time and measured RTO
- latest included source transaction/time and measured RPO
- row counts by critical table
- artifact references checked/valid/missing/mismatched
- run, replay, export, and auth smoke results
- operator and independent reviewer
- cleanup confirmation for restored sensitive data
- decision: pass, pass with condition, or fail

### Backup/restore acceptance

- Backup package checksums validate before restore.
- Restore succeeds in a clean isolated environment using documented commands.
- Critical table counts and constraints match expected values.
- Reference-run artifact bytes and hashes validate.
- Restored metadata generates working replay/export references without pointing to missing evidence.
- Restore record is reviewed by SRE and Security/Privacy.

## Complete Day 7 file plan

Legend: **M** modify existing, **N** create, **B** backend/domain, **C** contract/config, **T** test, **I** infrastructure, **D** documentation.

```text
ai-parallel-web/
├── package.json                                             M C  add Day 7 worker/reconcile/backup/test scripts
├── package-lock.json                                        M C  lock any queue/ZIP/test dependencies
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── app.ts                                       M B  route-specific admission hooks; export routes
│   │       ├── config.ts                                    M C  queue, lease, retry, download, capacity settings
│   │       ├── dependencies.ts                              M B  job/capacity/download-token dependencies
│   │       ├── middleware/
│   │       │   └── backpressure.ts                          M B  structured, route-scoped, fail-safe admission
│   │       └── routes/
│   │           ├── exports.ts                               M B  202 create, status, token, download authorization
│   │           └── runs.ts                                  M B  workload admission before durable enqueue
│   ├── worker-browser/
│   │   └── src/
│   │       ├── index.ts                                     M B  export resilient worker APIs
│   │       ├── resilient-worker-loop.ts                     N B  lease/fencing/heartbeat/shutdown loop
│   │       ├── surface-capacity.ts                          N B  surface slot lease integration
│   │       └── request-pacer.ts                             N B  token-bucket check before target requests
│   └── worker-export/
│       ├── package.json                                     N B  independently runnable export worker
│       ├── tsconfig.json                                    N C
│       └── src/
│           ├── index.ts                                     N B  process entry and graceful shutdown
│           ├── export-worker.ts                             N B  snapshot/build/upload/verify/finalize phases
│           └── bundle-writer.ts                             N B  ZIP and exact-byte file assembly
├── packages/
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── index.ts                                    M C
│   │   │   ├── export-contracts.ts                         N C  request/status/manifest/download public types
│   │   │   └── job-contracts.ts                            N C  job type and sanitized failure codes
│   │   ├── schemas/
│   │   │   ├── export-manifest.schema.json                 M C  canonical portable manifest
│   │   │   ├── export-request.schema.json                  N C
│   │   │   └── export-status.schema.json                   N C
│   │   ├── examples/
│   │   │   ├── export-manifest.example.json                M C
│   │   │   └── export-status.example.json                  N C
│   │   └── openapi/openapi.yaml                            M C  202/status/token/download/429 contracts
│   ├── domain/
│   │   └── src/
│   │       ├── index.ts                                    M B
│   │       ├── export-builder.ts                           M B  canonical JSON, safe CSV, exact manifest
│   │       ├── failure-classifier.ts                       N B  centralized retry decision
│   │       ├── resilience-policy.ts                        M B  lease heartbeat/fencing/retry budgets
│   │       ├── reconciliation-engine.ts                    M B  jobs/exports/orphan invariants
│   │       └── backpressure-policy.ts                      N B  admission decisions and public codes
│   ├── db/
│   │   └── src/
│   │       ├── index.ts                                    M B
│   │       ├── types.ts                                    M B  job/export/DLQ/capacity rows
│   │       └── repositories/
│   │           ├── exports.ts                              M B  idempotency, status, fenced finalization
│   │           ├── jobs.ts                                 N B  claim/renew/complete/retry/DLQ operations
│   │           ├── reconciliation.ts                       M B  SKIP LOCKED repair and orphan candidates
│   │           ├── resilience.ts                           M B  migrate run-specific logic or remove duplicate
│   │           ├── capacity.ts                             N B  surface slot lease and queue counts
│   │           └── download-tokens.ts                      N B  hashed nonce/expiry/consumption
│   └── storage/
│       └── src/
│           ├── index.ts                                    M B
│           ├── types.ts                                    M C  head/get/list/prefix-delete verification APIs
│           ├── s3-storage.ts                               M B  fail-closed signing and checksum metadata
│           ├── export-storage.ts                           N B  attempt prefix/promotion/cleanup patterns
│           └── backup-restore.ts                           M B  size/checksum/content verification report
├── config/
│   └── environments/
│       ├── development.env.example                         M C
│       ├── staging.env.example                             M C
│       └── production.env.example                          M C
├── infra/
│   ├── migrations/
│   │   └── 007_resilience_and_exports.sql                  M I  generic jobs, attempts, DLQ, export files,
│   │                                                            download tokens, capacity leases, indexes
│   ├── scripts/
│   │   ├── backup-metadata.sh                              M I  custom dump, inventory, metadata, checksum
│   │   ├── restore-metadata.sh                             M I  guarded isolated restore
│   │   ├── verify-export-bundle.ts                         N I  standalone schema and file-hash validator
│   │   └── verify-restored-artifacts.ts                    N I  DB/object size and checksum verification
│   └── compose/
│       ├── docker-compose.yml                              M I  export/reconcile worker profiles and health
│       └── docker-compose.failure.yml                      N I  toxics/proxies for DB/storage/target failures
├── tests/
│   ├── contract/
│   │   ├── export-manifest.test.ts                         N T  schema, exact files, independent hashes
│   │   └── export-csv.test.ts                              N T  quoting, Unicode, CRLF, formula injection
│   ├── integration/
│   │   ├── export.test.ts                                  M T  real DB/storage async lifecycle
│   │   ├── job-leases.test.ts                              N T  fencing, heartbeat, retry budget, DLQ
│   │   ├── reconciliation.test.ts                          M T  real stranded/partial/orphan recovery
│   │   ├── backpressure.test.ts                            N T  atomic slots, queue 429, status availability
│   │   └── backup-restore.test.ts                          N T  restored rows and artifact references
│   ├── failure-injection/
│   │   ├── worker-crash.test.ts                            M T  real child process SIGKILL
│   │   ├── db-timeout.test.ts                              M T  before/after commit ambiguity
│   │   ├── storage-failure.test.ts                         M T  partial upload and retry/quarantine
│   │   └── target-timeout.test.ts                          M T  target budget, pacing, partial outcome
│   └── security/
│       └── export-auth.test.ts                             M T  real tenant/link/download/expiry/audit checks
└── docs/
    ├── day-7/
    │   ├── execution-guide.md                              N D  this guide
    │   ├── day-7-approval.md                               N D  gate evidence and reviewer decisions
    │   ├── failure-classification.md                       N D  retry matrix and public codes
    │   ├── capacity-record.md                              N D  workload, stop conditions, chosen limits
    │   └── restore-record.md                               N D  RPO/RTO and evidence validation record
    └── runbooks/
        ├── export-failure.md                               N D  retry/DLQ/operator actions
        ├── queue-backpressure.md                           N D  limits, 429, safe degradation
        └── metadata-restore.md                             N D  guarded restore and verification
```

## Configuration values to add

```dotenv
# Job leases and retry budgets
JOB_LEASE_MS=30000
JOB_HEARTBEAT_MS=10000
JOB_CLAIM_BATCH=10
EXPORT_MAX_ATTEMPTS=4
EXPORT_MAX_ELAPSED_MS=1800000
RECONCILIATION_INTERVAL_MS=30000
ORPHAN_GRACE_MS=86400000

# Admission and capacity
GLOBAL_QUEUE_DEPTH_MAX=1000
TENANT_QUEUE_DEPTH_MAX=100
SURFACE_QUEUE_DEPTH_MAX=25
CAPACITY_DEPENDENCY_FAILURE_MODE=closed

# Export and download
EXPORT_SCHEMA_VERSION=1.0.0
EXPORT_MAX_BYTES=104857600
EXPORT_RETENTION_DAYS=30
DOWNLOAD_TOKEN_TTL_SECONDS=120
SIGNED_URL_TTL_SECONDS=30

# Restore verification
RESTORE_VERIFY_SAMPLE_PERCENT=100
BACKUP_OUTPUT_DIR=./infra/backups
```

Validate that heartbeat is comfortably below the lease duration, signed URL TTL is no longer than the authenticated token exchange needs, and environment examples contain no real credentials.

## Failure-injection suite

Use real dependencies and process boundaries. A mock can prove decision logic, but the gate needs the following scenarios.

### Worker crash

**Setup:** Start worker A as a child process, claim a job, write one idempotent step/artifact, then send `SIGKILL` before completion. Start worker B after lease expiry and run reconciliation.

**Proves:** Lease expiry, fencing, idempotent writes, and recovery.

**Success:** Worker B or reconciler completes/requeues exactly once; no duplicate logical step or ready export; late worker A cannot commit; retry count increments once.

### Database timeout

Run two cases through a TCP failure proxy:

1. Connection fails before transaction commit.
2. Commit reaches PostgreSQL but client response is dropped.

**Proves:** Transient retry versus ambiguous-commit reconciliation.

**Success:** Case 1 retries within budget. Case 2 reads by dedupe/idempotency key and does not create a second job/export/artifact.

### Object-storage failure

Inject `500`, connection reset, and timeout during the second file upload and during HEAD verification.

**Proves:** Attempt prefixes, no partial publication, retry budget, cleanup/reconciliation, and DLQ behavior.

**Success:** Export remains non-downloadable until all files verify; retry produces one ready bundle; exhausted attempts become failed/DLQ; partial objects become deferred orphan candidates, not immediate unsafe deletion.

### Target timeout/rate limit

Configure the deterministic fixture to delay, return `429 Retry-After`, and time out after receiving a request.

**Proves:** Separate target retry budget, pacing, partial-result classification, and protection of other surfaces.

**Success:** Worker honors pacing and `Retry-After`; no retry storm; outcome is completed/partial/failed according to recorded evidence; unrelated status/download traffic remains available.

### Graceful shutdown

Send `SIGTERM` during browser execution and export upload.

**Success:** Worker stops claiming, marks unready, finishes or safely hands off before deadline, closes resources, and creates no duplicate completion.

### Queue saturation

Fill global, tenant, and surface queues to exact limits, then issue concurrent submissions.

**Success:** No more than the configured number is durably accepted; rejected requests receive stable `429` problem details and `Retry-After`; existing status/replay/download calls continue to work.

### Restore failure

Corrupt the backup checksum, remove one referenced object, and alter one object checksum metadata value in separate runs.

**Success:** Corrupt backup is rejected before database mutation. Missing/mismatched objects appear in distinct restore-report categories and cause the drill to fail.

## Learning outcomes checklist

### Learning 1 — Can an independent consumer validate an export?

- **Question:** Can someone with only the downloaded bundle, published schemas, and standard SHA-256/CSV/ZIP tools understand provenance and validate every included file without database access or internal documentation?
- **Evidence:** One reference bundle, schema files, README, independent validation script/output, manifest/file hashes, configuration snapshot hash, metric definitions, warnings, and artifact index.
- **Validation:** Give the bundle to a reviewer who did not implement export. They must validate the schema, recompute all hashes, parse JSON/CSV, identify missing/redacted evidence, and explain metric versions without asking the developer.
- **Success by 17:00:** Reviewer completes the checklist; zero undocumented field or internal storage dependency; bundle contains no secret/signed URL/provider key.

### Learning 2 — Which failures retry safely and does recovery duplicate state?

- **Question:** For DB, storage, target, validation, cancellation, and crash failures, can the system decide retry/fail/quarantine/operator action consistently, including ambiguous commits?
- **Evidence:** Approved failure-classification matrix, retry-budget tests, fenced-lease tests, real crash/timeout/storage scenarios, DLQ record, reconciliation summary, database uniqueness queries, and artifact inventory comparison.
- **Validation:** Run every failure scenario twice. Compare run/job/export/step/artifact counts and logical IDs before/after reconciliation.
- **Success by 17:00:** No duplicate completed logical step/export, no late-worker commit, attempts never exceed budget, poison data is quarantined once, and operator-required failures are visible with safe public codes.

### Learning 3 — What limits protect the system and approved surface?

- **Question:** What concurrency, request rate, and queue depth remain stable for the reference workload while respecting the surface policy?
- **Evidence:** Capacity record with workload/environment versions, concurrency levels, request rate, run success, p95 duration, queue age, CPU/memory, DB pool wait, Redis/storage latency, target outcomes, stop condition, and chosen safety margin.
- **Validation:** Repeat the chosen limit long enough to cover normal variance, then send a 2× submission burst while holding target request rate at the approved limit.
- **Success by 17:00:** Stable reference runs, no evidence-completeness regression, no unapproved request burst, useful `429` before saturation, and a documented production default below the first unstable point.

## Validation gates and exact checks

### Gate 0 — Baseline is reproducible

```bash
node --version                     # must be supported Node 24+
npm install                        # synchronize package-lock with workspaces
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run contracts:validate
```

**Pass:** Every command exits zero. Do not accept Day 7 while the API project-reference or frontend dependency errors remain.

### Gate 1 — Migration and constraints

Apply migrations to an isolated database, then verify:

```sql
SELECT version FROM schema_migrations ORDER BY applied_at;
SELECT indexname FROM pg_indexes WHERE tablename IN ('jobs', 'exports', 'dead_letter_jobs');
SELECT conname FROM pg_constraint WHERE conrelid IN ('jobs'::regclass, 'exports'::regclass);
```

**Pass:** Job dedupe, legal status, lease indexes, export idempotency, and DLQ references exist. Migration is tested from both an empty database and the Day 6 schema.

### Gate 2 — Export portability and security

```bash
npx vitest run --config config/tooling/vitest.config.ts \
  tests/contract/export-manifest.test.ts \
  tests/contract/export-csv.test.ts \
  tests/integration/export.test.ts \
  tests/security/export-auth.test.ts
```

Independent bundle check:

```bash
unzip -t reference-export.zip
unzip -q reference-export.zip -d /tmp/parallelweb-export-check
jq -r '.files[] | "\(.sha256)  \(.path)"' \
  /tmp/parallelweb-export-check/manifest.json \
  > /tmp/parallelweb-export-check/checksums.sha256
(cd /tmp/parallelweb-export-check && sha256sum --check checksums.sha256)
```

Use `shasum -a 256 -c checksums.sha256` or
`npx tsx infra/scripts/verify-export-bundle.ts reference-export.zip` on macOS.

**Pass:** Async lifecycle reaches ready; schemas/hashes/CSV pass; cross-tenant, expired, consumed, and revoked access fail; audit events exist.

### Gate 3 — Job resilience and reconciliation

```bash
npx vitest run --config config/tooling/vitest.config.ts \
  tests/integration/job-leases.test.ts \
  tests/integration/reconciliation.test.ts \
  tests/failure-injection/worker-crash.test.ts \
  tests/failure-injection/db-timeout.test.ts \
  tests/failure-injection/storage-failure.test.ts \
  tests/failure-injection/target-timeout.test.ts
```

Post-test uniqueness checks:

```sql
SELECT dedupe_key, count(*) FROM jobs GROUP BY dedupe_key HAVING count(*) > 1;
SELECT run_id, persona_version_id, step_id, count(*)
FROM step_evidence
GROUP BY run_id, persona_version_id, step_id
HAVING count(*) > 1;
```

**Pass:** Queries return zero duplicates; killed worker is recovered/failed once; late lease completion fails; partial export never becomes downloadable; retry/DLQ state matches classification.

### Gate 4 — Back-pressure and pacing

```bash
npx vitest run --config config/tooling/vitest.config.ts \
  tests/integration/backpressure.test.ts \
  tests/failure-injection/target-timeout.test.ts
```

Run the documented fixture capacity experiment and save its output in `docs/day-7/capacity-record.md`.

**Pass:** Atomic surface slots and target token bucket never exceed approved values; burst submissions receive useful `429`; capacity dependency failure safely rejects new work; read/download paths remain healthy.

### Gate 5 — Backup and restore

```bash
BACKUP_OUTPUT_DIR=/approved/temporary/location \
DATABASE_URL="$SOURCE_DATABASE_URL" \
bash infra/scripts/backup-metadata.sh

ALLOW_DESTRUCTIVE_RESTORE=true \
RESTORE_DATABASE_URL="$ISOLATED_RESTORE_DATABASE_URL" \
bash infra/scripts/restore-metadata.sh /approved/temporary/location/backup-id

npx tsx infra/scripts/verify-restored-artifacts.ts
npx vitest run --config config/tooling/vitest.config.ts tests/integration/backup-restore.test.ts
```

**Pass:** Backup hashes verify, isolated restore completes inside RTO, critical row counts match, reference evidence bytes/hashes resolve, and restore record is independently reviewed.

## Day 7 gate checklist

- [ ] Root formatting, lint, type check, build, contracts, and tests pass on Node 24.
- [ ] `POST /v1/runs/{id}/exports` returns `202` and durable queued work.
- [ ] Export status is pollable and terminal status is explicit.
- [ ] JSON, CSV, artifact index, README, ZIP, and manifest contain only real files and validate independently.
- [ ] Every exported file and source artifact has matching size/SHA-256.
- [ ] CSV escaping and formula-injection tests pass.
- [ ] Link request and actual download both reauthorize tenant/user/export/file.
- [ ] Download token/URL expires and cannot be reused beyond policy.
- [ ] Export/download audit events contain no secret URL or raw evidence.
- [ ] Generic job leases have epoch fencing; heartbeat loss aborts authority.
- [ ] Retry classes and budgets are centralized, tested, and documented.
- [ ] Poison jobs and exhausted retries enter a redacted DLQ with operator disposition.
- [ ] `SIGTERM` drains safely; `SIGKILL` recovers through lease expiry/reconciliation.
- [ ] Concurrent reconcilers do not duplicate retry/finalization actions.
- [ ] Stale exports and orphaned attempt objects reconcile idempotently.
- [ ] Per-surface concurrency and request pacing use approved surface values.
- [ ] Queue saturation returns structured `429` and `Retry-After` before overload.
- [ ] Capacity dependency failure does not allow uncontrolled public-surface work.
- [ ] Metadata backup includes artifact inventory and checksums.
- [ ] Isolated restore resolves and verifies intact reference evidence.
- [ ] Failure suite covers worker crash, DB pre/post-commit timeout, storage partial failure, target timeout/429, queue saturation, and corrupt restore.
- [ ] Security/Privacy approves export contents, download model, DLQ redaction, retention, and restore handling.
- [ ] QA/SRE signs the capacity record and restore record.

## Required Day 7 evidence package

Before moving to Day 8, store or link:

1. Reference export bundle and independent validation output.
2. Export schema/OpenAPI validation output.
3. Fenced lease and duplicate-state query results.
4. Failure-injection logs and reconciliation summary for each scenario.
5. Dead-letter/quarantine example with redaction review.
6. Capacity experiment and chosen limits.
7. Backup manifest, isolated restore log, RPO/RTO, and artifact verification report.
8. Security/Privacy review and QA/SRE approval.

Do not commit raw public-surface evidence, signed URLs, database dumps, backup archives, or failure logs containing secrets to Git.

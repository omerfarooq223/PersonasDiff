# AI Parallel Web — Day 9 Execution Guide

## Day 9 outcome

By the end of today, an operator who did not build the system can identify whether a failed workflow is a product defect, an infrastructure failure, an approved-target failure, or a policy block; the reference workload and a 2× arrival-rate burst have passed declared service objectives; the browser-worker operating envelope and autoscaling ceiling are recorded; rollback and restore have been timed by an independent executor; and one immutable, reviewable release-candidate image has been created.

Day 9 is not complete because a dashboard exists or a load test produced requests. It is complete only when the release-candidate digest, raw test results, dashboards, alert delivery evidence, dependency/migration review, and timed recovery records all refer to the same Git SHA and configuration snapshot.

## Owners and working order

- **QA/SRE:** owns the Day 9 evidence set, telemetry backend, load profile, capacity decision, alerts, recovery drills, and gate decision.
- **Tech Lead:** reviews instrumentation semantics, performance changes, dependency/migration diff, image provenance, and rollback decision points.
- **Product Owner:** approves the reference workload, service objectives, known limitations, and whether target-side blocks count in each product SLI.
- **Security/Privacy:** reviews log fields and redaction, telemetry retention/access, test data, release SBOM, and artifact handling.
- **Independent drill executor:** runs rollback and restore from the runbooks without verbal help from their author.

### Suggested schedule

| Time        | Workstream                                   | Exit condition                                                     |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------ |
| 08:30–09:15 | Freeze SLOs, workload, owners, and baseline  | One signed measurement contract; baseline CI is green              |
| 09:15–11:00 | Logs, traces, metrics, and correlation       | One reference run is visible end to end with no sensitive fields   |
| 11:00–12:00 | Dashboards and alert routing                 | Every alert has owner, action, runbook, duration, and inhibition   |
| 13:00–14:30 | Expected-load and 2× burst tests             | Raw k6/Prometheus results captured; SLO thresholds pass            |
| 14:30–15:30 | Browser profile and concurrency tuning       | First saturation point and safe envelope recorded                  |
| 15:30–16:30 | Regression, migration, rollback, restore, DR | Independent executor meets RTO/RPO and records timestamps          |
| 16:30–17:30 | Freeze and validate RC                       | Digest-pinned image, SBOM, notes, approvals, and gate record exist |

## Toolchain selected for this project

- **OpenTelemetry for traces:** W3C `traceparent` survives API-to-job-to-worker boundaries and avoids coupling the code to one backend. Export through an OpenTelemetry Collector, not directly to Tempo.
- **Pino/Fastify JSON logs:** the API already uses Fastify's Pino logger. Keep JSON on stdout, add a strict allowlist/redaction policy, and correlate logs with trace/request/run IDs.
- **Prometheus metrics:** explicit counters, histograms, and gauges give stable SLI queries. Workflow IDs belong in logs/traces, never Prometheus labels.
- **Grafana + Tempo + Loki:** one operational UI links bounded-cardinality metrics, traces, and structured logs. The included single-node configuration is for local/staging verification; production must use an authenticated, durable deployment or managed equivalent.
- **Grafana Alloy:** tails Docker JSON logs into Loki locally without changing the Docker daemon or installing the less-supported Loki logging plugin.
- **k6:** arrival-rate scenarios model reference traffic and the 2× burst, and thresholds make the command fail when the service objectives fail.
- **KEDA:** scales browser workers from queue age through Prometheus. Queue age is safer than CPU alone because it measures user-visible backlog; CPU remains a resource safeguard.

Primary implementation references:

- OpenTelemetry recommends exporting through a Collector and documents OTLP HTTP/protobuf for Node: <https://opentelemetry.io/docs/languages/js/exporters/>
- OpenTelemetry JavaScript trace and metric SDKs are stable; its log SDK remains in development, so application logs stay with Pino: <https://opentelemetry.io/docs/languages/js/>
- `prom-client` collects Node process metrics at scrape time and supports isolated registries: <https://github.com/siimon/prom-client>
- Grafana provisioning keeps data sources and dashboards version controlled: <https://grafana.com/docs/grafana/latest/administration/provisioning/>
- Prometheus recommends symptom-based alerts with slack for short blips: <https://prometheus.io/docs/practices/alerting/>
- k6 thresholds convert latency/error objectives into a failing process exit: <https://grafana.com/docs/k6/latest/using-k6/thresholds/>
- KEDA `ScaledObject` supports bounded replicas, fallback, cooldown, and HPA behavior: <https://keda.sh/docs/2.20/concepts/scaling-deployments/>

## Repository baseline and blockers

Preserve the current implementation; instrument it rather than creating a second workflow.

### Existing integration points

- `packages/observability/src/index.ts` already defines the required correlation fields.
- `apps/api/src/app.ts` already configures Fastify logging, request IDs, rate limiting, and back-pressure.
- `apps/api/src/server.ts` already has graceful shutdown hooks.
- `apps/worker-browser/src/index.ts` currently contains leases, heartbeats, retry budgets, and graceful-shutdown intent; extract that runtime logic into the new consumer/entrypoint instead of duplicating it.
- `apps/worker-compare/src/comparison-worker.ts` is the comparison timing/error boundary.
- `apps/api/src/routes/exports.ts`, the Day 7 failure tests, and backup/restore scripts are the export and recovery boundaries.
- `infra/compose/docker-compose.yml`, staging manifests, and CI are the deployment/release integration points.

### Blockers to close before performance evidence is accepted

1. **There is no executable browser-worker service.** `apps/worker-browser/src/index.ts` exports library classes; it does not start a queue-consumer process. Create the durable worker entrypoint defined by Day 7 before measuring worker capacity.
2. **There is no executable comparison-worker service.** The same issue applies to `apps/worker-compare`; a direct unit benchmark is not end-to-end evidence.
3. **The OpenAPI contract is behind the web client.** The client calls comparison, replay, and `/api/v1` export routes that are absent from the current OpenAPI. Reconcile all paths under `/v1` before scripting load.
4. **The current worker loop logs through `console`.** Replace this with the shared structured logger before testing failure diagnosis.
5. **The browser pool concurrency implementation is unsafe.** It calls `Promise.race(executing)` without removing settled promises, so after the first completion later personas can bypass the intended limit. Fix this with a real semaphore/queue before tuning concurrency.
6. **Local Compose does not run workers or telemetry.** Add executable workers first, then the observability override in this guide.
7. **No approved SLO/reference workload is stored in the repository.** The numbers below are recommended starting values, not product approval. Product Owner and SRE must sign them before they become a gate.
8. **Finder `.DS_Store` files exist locally but are not tracked.** The current `.gitignore` already excludes them. Do not force-add them; deleting the local copies is optional and unrelated to the Day 9 gate.

Do not compensate for these blockers by pointing k6 at fixture-only endpoints and calling that a system-capacity result. Fixture tests validate the harness; the gate uses the real API, queue, workers, PostgreSQL, and object storage.

## Freeze the measurement contract first

Create `docs/day-9/slo-and-capacity-contract.md` from the complete template later in this guide. Do not tune against changing targets.

### Recommended Day 9 SLOs and load profile

| Capability            | SLI and window                                            | Day 9 target                              | Measurement rule                                                          |
| --------------------- | --------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| API availability      | non-5xx responses / eligible requests, rolling 30 d       | 99.9%                                     | Exclude authenticated 4xx, planned maintenance, and client cancellations  |
| API reads             | p95 server duration for run list/detail/comparison/replay | ≤ 500 ms                                  | Separate cold artifact download from metadata reads                       |
| Run acceptance        | p95 `POST /v1/runs` duration                              | ≤ 1 s                                     | A `202` means durably queued, not merely received                         |
| Run completion        | completed eligible runs / accepted eligible runs          | ≥ 95%                                     | Report gross and policy-approved target-excluded rates together           |
| Queue age             | p95 oldest ready job age                                  | ≤ 30 s reference; ≤ 120 s during 2× burst | Must return below 30 s within 10 min after burst                          |
| Evidence completeness | present required artifacts / required artifacts           | ≥ 99%                                     | `BLOCKED` is distinct from `MISSING_FAILURE`; neither is silently present |
| Comparison            | p95 worker duration for reference run                     | ≤ 5 s                                     | Same metric algorithm/version and fixture                                 |
| Export                | ready within 60 s and valid / accepted exports            | ≥ 99%                                     | Schema validates and every manifest checksum matches                      |
| Saturation            | container CPU/memory and browser contexts                 | no OOM/thrash                             | CPU ≤ 70% sustained, memory ≤ 75% limit, event-loop p99 ≤ 100 ms          |
| Recovery              | rollback RTO / metadata restore RTO / RPO                 | ≤ 15 min / ≤ 60 min / ≤ 15 min            | Timed by independent executor from declared start to verification         |

### Reference load that must be approved

Record exact numbers instead of “normal traffic.” A workable starting profile is:

- 20 API metadata reads/s sustained for 20 minutes.
- 2 new runs/minute, each with 2 personas × 10 steps, sustained for 20 minutes.
- 1 comparison request/s, 1 replay request/s, and 1 export request/minute against prepared completed runs.
- Artifact traffic comes from the workflow: 40 step captures/minute plus their expected object uploads. Do not add a production-only upload endpoint just for k6.
- Burst phase doubles arrival rates for 10 minutes without changing worker limits mid-test.
- Recovery phase returns to reference arrival rates for 10 minutes and proves queue age drains below 30 seconds.

If the approved public surface permits less traffic, the public-surface limit wins. Run higher capacity experiments only against the deterministic internal fixture.

## Complete Day 9 file map

Legend: **[M]** modify an existing file, **[N]** create a new file, **[E]** generated evidence; never hand-edit.

```text
AI-Parallel-Web/
├── package.json                                             [M] root observability/load/RC commands
├── package-lock.json                                        [M] exact reviewed dependency graph
├── .gitignore                                               [M] ignore reports, profiles, secrets, .DS_Store
├── .github/workflows/
│   ├── ci.yml                                               [M] telemetry config tests + Day 9 regression
│   └── release-candidate.yml                                [N] approval-bound, digest-producing RC workflow
├── apps/
│   ├── api/src/
│   │   ├── app.ts                                           [M] logger, HTTP metrics, metrics endpoint
│   │   ├── config.ts                                        [M] telemetry and protected metrics config
│   │   ├── main.ts                                          [N] start OTel before importing Fastify
│   │   └── server.ts                                        [M] graceful close and telemetry flush
│   ├── worker-browser/src/
│   │   ├── main.ts                                          [N] executable queue consumer
│   │   ├── job-consumer.ts                                  [N] extracted loop, trace context, bounded metrics
│   │   ├── index.ts                                         [M] export consumer without owning process hooks
│   │   └── worker-pool.ts                                   [M] correct semaphore and saturation metrics
│   └── worker-compare/src/
│       ├── main.ts                                          [N] executable queue consumer
│       └── comparison-worker.ts                             [M] comparison span, duration, and outcome
├── packages/observability/
│   ├── package.json                                         [M] exact telemetry dependencies
│   └── src/
│       ├── index.ts                                         [M] public exports
│       ├── logger.ts                                        [N] redaction and trace correlation
│       ├── tracing.ts                                       [N] OTel SDK lifecycle
│       ├── propagation.ts                                   [N] job trace carrier helpers
│       ├── metrics.ts                                       [N] all Day 9 metrics
│       ├── metrics-server.ts                                [N] private worker health/scrape listener
│       └── fastify.ts                                       [N] request metrics and protected scrape route
├── config/environments/
│   ├── development.env.example                              [M] local telemetry defaults
│   ├── staging.env.example                                  [M] staging endpoints/tokens/sample ratio
│   └── production.env.example                               [M] production boundaries; no secret values
├── infra/
│   ├── compose/
│   │   └── docker-compose.observability.yml                 [N] local Grafana/Loki/Tempo/Prometheus/Alloy
│   ├── containers/
│   │   └── node-service.Dockerfile                          [M] reproducible minimal runtime images
│   ├── observability/
│   │   ├── prometheus.yml                                   [N] scrape and rule loading
│   │   ├── alertmanager.yml                                 [N] owner routes, grouping, inhibition
│   │   ├── alerts/parallelweb.rules.yml                     [N] symptom and capacity alerts
│   │   ├── otel-collector.yaml                              [N] OTLP receive/process/export
│   │   ├── tempo.yaml                                       [N] local trace backend
│   │   ├── loki.yaml                                        [N] local log backend
│   │   ├── alloy.alloy                                      [N] Docker log discovery and shipping
│   │   ├── secrets/                                         [ignored] local metrics token only
│   │   └── grafana/
│   │       ├── provisioning/datasources/datasources.yml     [N] metrics/log/trace links
│   │       ├── provisioning/dashboards/dashboards.yml       [N] immutable dashboard provider
│   │       └── dashboards/
│   │           ├── operations-overview.json                 [N] SLO and failure-domain view
│   │           └── worker-capacity.json                     [N] queue/browser/resource view
│   ├── environments/staging/
│   │   ├── worker-browser-deployment.yaml                   [N] measured requests/limits
│   │   ├── worker-browser-scaledobject.yaml                 [N] queue-age autoscaling bounds
│   │   ├── resource-guardrails.yaml                         [N] quota, limit range, disruption budget
│   │   └── kustomization.yaml                               [M] include reviewed resources
│   └── scripts/
│       ├── day9-validate.sh                                  [N] reproducible gate runner
│       ├── profile-browser-container.sh                      [N] CPU/memory time series
│       ├── migration-rollback-drill.sh                       [N] isolated forward/rollback test
│       ├── disaster-recovery-drill.sh                        [N] independent restore verification
│       ├── verify-restored-evidence.ts                       [N] HEAD/size/hash validation
│       └── build-release-candidate.sh                        [N] clean, reviewed, digest-pinned RC
├── tests/
│   ├── load/
│   │   ├── day9.js                                          [N] reads/create/queue/compare/replay/export load
│   │   └── README.md                                        [N] safe data and environment contract
│   ├── performance/
│   │   └── tune-concurrency.ts                              [N] candidate-envelope runner
│   ├── observability/
│   │   ├── redaction.test.ts                                [N] sensitive-data non-disclosure
│   │   ├── metrics.test.ts                                  [N] names, label bounds, values
│   │   └── propagation.test.ts                              [N] API/job/worker parent trace
│   └── e2e/
│       ├── playwright.config.ts                             [N] Chromium/Firefox/WebKit + a11y
│       └── day9-regression.spec.ts                          [N] critical workflow and WCAG checks
├── docs/
│   ├── day-9/
│   │   ├── execution-guide.md                               [N] this guide
│   │   ├── slo-and-capacity-contract.md                     [N] signed measurement contract
│   │   ├── performance-report.md                            [N/E] raw-result links and envelope decision
│   │   ├── release-rollback-plan.md                         [N] release ownership and decision tree
│   │   └── gate-record.md                                   [N/E] pass/fail evidence and approvals
│   ├── releases/
│   │   ├── release-notes-template.md                        [N] user/ops/security notes
│   │   └── approvals/<rc-version>/                          [E] dependency + migration reviews
│   └── runbooks/
│       ├── triage.md                                        [N] failure-domain diagnosis
│       ├── rollback.md                                      [N] immutable image rollback
│       └── restore.md                                       [N] metadata/artifact-reference recovery
└── artifacts/day-9/<release-sha>/                            [E, ignored]
    ├── k6-summary.json
    ├── prometheus-snapshot/
    ├── browser-profile.jsonl
    ├── performance-report.json
    ├── regression-results/
    ├── rollback-record.json
    ├── restore-record.json
    ├── alert-delivery.json
    ├── sbom.spdx.json
    ├── image-metadata.json
    └── gate-record.json
```

Do not commit raw telemetry containing tenant data. Commit sanitized reports and references to access-controlled evidence; keep the raw `artifacts/day-9` directory ignored.

## Sequential execution plan

### Task 0 — Establish a trustworthy baseline

#### 0.1 Freeze scope, SLOs, and workload

**Do:** Fill in the contract template, get Product Owner/SRE approval, name alert owners and backups, declare RTO/RPO, and record the exact fixture IDs, personas, steps, artifact sizes, expected arrival rates, and public-surface cap.

**Why:** A target chosen after seeing results is not an objective and cannot support a release decision.

**Verify:** Every `TBD` is resolved and the file contains reviewer name, UTC approval timestamp, Git SHA, and configuration hash.

#### 0.2 Capture a clean baseline

Run from the repository root:

```bash
git status --short
node --version
npm ci
npm run check
npm run build
docker compose -f infra/compose/docker-compose.yml config --quiet
```

**Pass:** clean working tree before implementation; Node satisfies `>=24`; lockfile install, check, build, and Compose validation pass. Store the baseline CI URL/SHA in the gate record.

### Task 1 — Add structured, redacted logs and end-to-end traces

#### 1.1 Implement one log schema

**Do:** Use `logger.ts` below in API and every worker. Emit `timestamp`, `level`, `service`, `environment`, `release_sha`, `message`, and the available `request_id`, `trace_id`, `span_id`, `run_id`, `job_id`, `step_id`, `failure_domain`, `error_class`, and `retryable` fields.

**Why:** An operator must correlate a symptom without searching free-form messages or exposing credentials/evidence.

**Rules:**

- Never log authorization/cookie headers, tokens, signed URLs, request/response bodies, DOM, screenshots, extracted text, raw SQL parameters, storage credentials, or full target query strings.
- Log target origin plus normalized path template, not the full URL.
- `failure_domain` is exactly `product`, `infrastructure`, `target`, or `policy`.
- Error objects use Pino's `err` serializer after sanitizing custom metadata; do not serialize arbitrary job payloads.
- IDs stay fields, never interpolated into messages.

**Verify:** `tests/observability/redaction.test.ts` sends every known secret field and asserts none of the values occur in serialized output.

#### 1.2 Start OTel before service modules

**Do:** Make each executable import a tiny bootstrap module first, start the Node SDK with `service.name`, `service.version`, `deployment.environment.name`, and OTLP HTTP exporter settings, then dynamically import its server/consumer.

**Why:** Auto-instrumentation must load before Fastify, PostgreSQL, Redis, and HTTP clients. Static imports in the same module may load too early.

**Verify:** One API request produces a server span plus PostgreSQL/Redis child spans in Tempo. A run job carries the API trace into the browser and comparison worker. Search logs by the trace ID and get the same request/run.

#### 1.3 Propagate across the durable queue

**Do:** Store only `traceparent` and `tracestate` with each job. On consume, extract that carrier and create a `CONSUMER` span with a span link when a job is retried from an older attempt. Keep `run_id` and `job_id` as span attributes, not baggage.

**Why:** Process boundaries do not inherit in-memory context, and uncontrolled baggage risks sensitive-data propagation.

**Verify:** `propagation.test.ts` proves the worker span's parent trace ID equals the enqueue trace ID. A retry retains the logical trace but gets a new span ID and `job.attempt` attribute.

### Task 2 — Instrument the service objectives

#### 2.1 Register bounded metrics

**Do:** Add the complete `metrics.ts` definitions. Use route templates, job type, outcome, failure domain, artifact type, and worker pool as labels. Never use user, tenant, request, run, job, persona, step, hostname, URL, error message, storage key, or release SHA as Prometheus labels.

**Why:** High-cardinality labels can make the monitoring system itself the first component to fail.

**Verify:** Metrics tests enumerate every custom metric and reject forbidden label names. `curl` the protected internal metrics endpoint and confirm default Node resource metrics plus all Day 9 metric families.

#### 2.2 Put metrics at state-transition boundaries

Instrument these exact authoritative points:

| Metric                                                 | Increment/observe at                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `parallelweb_runs_total`                               | transaction that commits a terminal run state                          |
| `parallelweb_run_duration_seconds`                     | same terminal transition using persisted `started_at`                  |
| `parallelweb_step_errors_total`                        | final classified step-attempt failure, not every thrown internal error |
| `parallelweb_job_retries_total`                        | transaction that schedules a retry                                     |
| `parallelweb_queue_depth` / `queue_oldest_age_seconds` | scrape-time query of durable ready/leased jobs                         |
| `parallelweb_evidence_completeness_ratio`              | completeness computation after capture finalization                    |
| `parallelweb_comparison_duration_seconds`              | comparison job outcome boundary                                        |
| `parallelweb_exports_total` / duration                 | terminal export state transaction                                      |
| browser CPU/RSS/contexts                               | worker sample and default process collector                            |

**Why:** Counting at API response or catch blocks produces duplicates under retry and diverges from durable truth.

**Verify:** Re-run the Day 7 crash test and compare terminal database rows with counter increases. They must match exactly and retries must not duplicate completed steps.

#### 2.3 Protect the scrape endpoint

**Do:** Expose `/_internal/metrics` only on the cluster network, require a secret token, exclude it from public ingress/rate-limit SLIs, and return Prometheus content type. Production token comes from the secret store.

**Verify:** No token and a wrong token return `404`; the Prometheus service identity succeeds; public ingress cannot route the path.

### Task 3 — Stand up the telemetry path

#### 3.1 Start the local/staging stack

**Do:** Add the observability Compose override and configs below. Pin every image by digest in the reviewed environment file; never use `latest` in the RC.

```bash
docker compose \
  -f infra/compose/docker-compose.yml \
  -f infra/compose/docker-compose.observability.yml \
  config --quiet
docker compose \
  -f infra/compose/docker-compose.yml \
  -f infra/compose/docker-compose.observability.yml \
  up --build -d --wait
```

**Why:** Telemetry is part of operability and must fail independently without taking the product down.

**Verify:** Prometheus targets are up; Collector and Alloy report healthy components; Grafana has Prometheus/Loki/Tempo data sources; stopping Loki does not block application request processing.

#### 3.2 Prove correlation and redaction manually

**Do:** Run one reference workflow, copy its `trace_id`, open the trace, jump to matching Loki logs, and inspect the metric change. Then run the seeded-secret test payload.

**Verify:** one trace shows API → queue publish → browser consume/steps/storage → compare → export; no seeded secret appears in Loki, Tempo attributes, or Prometheus label values.

### Task 4 — Build dashboards and actionable alerts

#### 4.1 Provision two operator dashboards

**Do:** Provision `operations-overview.json` and `worker-capacity.json` as immutable Git-managed dashboards. Every top-level symptom panel links to the triage runbook. Use dashboard variables only for bounded `environment` and `service` values.

**Why:** The overview answers “are users affected and which failure domain?”; the capacity dashboard answers “what is saturated and do we scale or shed load?”

**Verify:** Import/provision from a clean Grafana database, not an author's saved UI state. Each required metric appears under a controlled failure.

#### 4.2 Add alert rules and routing

**Do:** Install the rules below. Pages cover user-visible SLO burn, stuck queue, missing evidence, and imminent browser memory exhaustion. Tickets cover retry/export increases and capacity forecasts. Every rule has `owner`, `severity`, `service`, `runbook_url`, `dashboard_url`, a useful `for`, and a human action.

**Noise controls:** group by alert/service/environment; inhibit warnings when their critical alert is firing; inhibit component warnings when the service SLO page is active; use `for` durations; no page on a single job; route target-policy blocks to product/security review rather than infrastructure on-call.

**Verify:** use `promtool check rules`, `amtool check-config`, then inject one controlled signal for each route. Capture receiver, timestamps, grouped labels, and resolution notification. No alert may route to `null`, “TBD,” or an unacknowledged mailbox.

### Task 5 — Run reference and 2× load tests

#### 5.1 Prepare isolated data and safety controls

**Do:** Use a staging tenant, approved synthetic personas, deterministic fixture, dedicated load-test token, fixed completed-run IDs for read/replay/export, and a maximum test duration. Confirm target request pacing is lower than the approved cap. Announce the window to SRE.

**Why:** Load tests must not create privacy data, evade target controls, or contaminate production statistics.

**Verify:** preflight script rejects production base URLs unless `ALLOW_PRODUCTION_LOAD_TEST=true` and a second approval token is present. Default is fixture/staging only.

#### 5.2 Execute four phases

1. **Warm-up:** 5 min at 25% reference load; discard from gate aggregates.
2. **Reference:** 20 min at expected arrival rates.
3. **2× burst:** 10 min at twice the arrivals, without raising target pacing or autoscaling ceiling.
4. **Recovery:** 10 min at reference arrivals; queue age must return below 30 s within 10 min.

Run:

```bash
k6 run --summary-export artifacts/day-9/$RELEASE_SHA/k6-summary.json \
  -e BASE_URL="$STAGING_BASE_URL" \
  -e AUTH_TOKEN="$LOAD_TEST_TOKEN" \
  -e RUN_FIXTURE_JSON="$RUN_FIXTURE_JSON" \
  -e COMPLETED_RUN_IDS="$COMPLETED_RUN_IDS" \
  tests/load/day9.js
```

**Why:** A concurrency-only test hides queuing; constant-arrival-rate scenarios reveal whether the system keeps up.

**Verify:** k6 exits zero; server-side SLI queries pass; no target pacing violation occurs; no OOM/restart; database/storage error rates stay within budget; the recovery condition passes. Record both client and server measurements and explain material differences.

#### 5.3 Attribute artifact and async stages correctly

**Do:** k6 measures API reads and acceptance directly. Artifact upload, comparison, replay materialization, and export completion are measured from server histograms and durable state for the k6-created correlation IDs. Do not add unauthenticated internal upload/comparison routes to make load generation easier.

**Verify:** report includes throughput, p50/p95/p99, errors by failure domain, queue age/depth, retries, DB pool wait, storage latency, browser CPU/RSS/contexts, evidence completeness, comparison duration, and export-ready latency for every phase.

### Task 6 — Profile and set the safe operating envelope

#### 6.1 Sweep browser concurrency

**Do:** Against the deterministic fixture, test worker context concurrency 1, 2, 3, 4, and only higher if approved. Restart the worker between candidates; run a warm-up plus at least 15 minutes steady state. Capture container CPU/RSS, event-loop delay, Chromium child-process RSS, completion rate, step p95, queue age, and target request rate.

**Stop immediately** on OOM, >85% memory limit for 2 minutes, >90% CPU for 5 minutes, event-loop p99 >200 ms, target throttling, evidence completeness <99%, or rising queue age after autoscaling reaches its ceiling.

**Why:** Browser memory usually constrains this system before API CPU. A one-minute peak result is not a safe setting.

**Verify:** choose the largest concurrency that remains below 70% sustained CPU and 75% memory, passes quality/SLO targets, and leaves at least 25% headroom. Recommended initial production setting remains provisional until measured: 2 browser contexts per pod.

#### 6.2 Configure bounded autoscaling and cost controls

**Do:** Scale browser pods on oldest ready-job age with `minReplicaCount: 1`, a measured `maxReplicaCount`, slow scale-down, rapid but bounded scale-up, and fallback replicas when Prometheus is unavailable. Apply CPU/memory requests and limits from observed p95 plus headroom. Add namespace quota and PodDisruptionBudget.

**Cost guardrail formula:**

```text
max browser pods = min(
  floor(approved target request rate / worst-case per-pod request rate),
  floor(monthly compute budget / per-pod monthly cost),
  database/storage safe-client limit,
  measured cluster capacity
)
```

**Verify:** synthetic queue age scales up within the declared delay, never exceeds max replicas, stops accepting work with useful `429` before unsafe depth, and scales down only after the cooldown. A telemetry outage uses the conservative fallback and raises a warning.

### Task 7 — Run the complete release regression and recovery drills

#### 7.1 Full regression, accessibility, and browser compatibility

**Do:** Run unit/contract/integration/security/failure-injection suites, then Playwright against Chromium, Firefox, and WebKit. Run axe on run list, create, detail, comparison, and replay screens.

**Verify:** zero critical/serious accessibility violations; critical workflow passes all three engines; exceptions require owner, affected users, mitigation, and release approval—never a silent skip.

#### 7.2 Migration and rollback drill

**Do:** Restore a production-shaped sanitized backup into an isolated database; time backup restore, forward migration, application smoke test, rollback image deployment, and schema compatibility validation. Prefer expand/contract migrations; a destructive down migration is not a rollback strategy.

**Verify:** previous application image works against the declared rollback-compatible schema. Checksums and row counts match. If it cannot, release plan must be roll-forward-only and the Product Owner/SRE explicitly accept that constraint before RC.

#### 7.3 Backup/restore and disaster recovery

**Do:** Have someone other than the author execute `docs/runbooks/restore.md` using a new database and storage credentials. Restore metadata, resolve artifact references, HEAD every reference object, verify stored size/hash metadata, and byte-hash the reference sample. Simulate loss of the primary API/worker deployment and restore the service in the declared recovery location.

**Verify:** RPO and both RTOs pass; restored metadata resolves intact evidence; no source environment is mutated; executor records every ambiguity. Any verbal intervention fails the runbook-usability checkpoint and requires a rerun.

### Task 8 — Freeze and validate the release candidate

#### 8.1 Freeze inputs

**Do:** stop feature merges; start from a clean signed/tagged commit; require reviewed lockfile, migration, container-base, workflow, and infrastructure diffs. Generate an SBOM and vulnerability report. Record known limitations.

**Why:** Rebuilding from a moving branch invalidates all Day 9 evidence.

#### 8.2 Build once, promote by digest

**Do:** build the RC with OCI labels for source SHA/version, produce the image digest, sign/attest according to the registry policy, deploy that exact digest to staging, rerun smoke/security/export verification, and later promote the same digest. Never rebuild for production.

**Verify:** `image-metadata.json` contains Git SHA, image reference and digest, lockfile hash, migration-set hash, SBOM hash, build URL, builder identity, UTC time, and approvals. Staging reports the same release SHA and image digest.

#### 8.3 Final gate review

**Do:** complete `gate-record.md`. Required reviewers sign the evidence, capacity setting, limitations, alert ownership, rollback plan, and restoration record.

**Verify:** no `TBD`, failed threshold, unreviewed dependency/migration, ownerless alert, mutable image tag, or unexplained excluded test remains.

## Ready-to-use implementation contents

The following files are the Day 9 reference implementation. Keep the names and metric semantics stable. Install packages with `--save-exact`, review the resulting `package.json` and lockfile diff, then commit both; do not hand-copy guessed package versions from a document:

```bash
npm install --save-exact --workspace=@ai-parallel-web/observability \
  @opentelemetry/api \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/sdk-node \
  @opentelemetry/sdk-trace-base \
  @opentelemetry/semantic-conventions \
  prom-client
npm install --save-dev --save-exact @axe-core/playwright @playwright/test
```

After installation, `packages/observability/package.json` retains its current metadata/scripts and contains the exact dependency versions produced above. The lockfile is the install output; it is a generated, reviewed artifact rather than a handwritten template.

### `packages/observability/src/logger.ts`

```ts
import { trace } from '@opentelemetry/api';

export type FailureDomain = 'product' | 'infrastructure' | 'target' | 'policy';

export interface LoggerIdentity {
  environment: string;
  releaseSha: string;
  service: string;
}

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.set-cookie',
  'request.headers.authorization',
  'request.headers.cookie',
  'request.body',
  'response.body',
  'headers.authorization',
  'headers.cookie',
  'authorization',
  'cookie',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'signedUrl',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.apiKey',
  '*.secret',
  '*.signedUrl',
] as const;

export function createLoggerOptions(identity: LoggerIdentity, level = 'info') {
  return {
    level,
    base: {
      environment: identity.environment,
      release_sha: identity.releaseSha,
      service: identity.service,
    },
    messageKey: 'message',
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    redact: {
      paths: [...REDACT_PATHS],
      censor: '[REDACTED]',
      remove: false,
    },
    mixin(): Record<string, string> {
      const spanContext = trace.getActiveSpan()?.spanContext();
      if (!spanContext) return {};
      return {
        span_id: spanContext.spanId,
        trace_id: spanContext.traceId,
      };
    },
    serializers: {
      req(request: { id?: string; method?: string; routeOptions?: { url?: string } }) {
        return {
          method: request.method,
          request_id: request.id,
          route: request.routeOptions?.url,
        };
      },
      res(reply: { statusCode?: number }) {
        return { status_code: reply.statusCode };
      },
    },
  } as const;
}
```

### `packages/observability/src/tracing.ts`

```ts
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

export interface TelemetryConfig {
  enabled: boolean;
  environment: string;
  otlpEndpoint: string;
  releaseSha: string;
  sampleRatio: number;
  serviceName: string;
}

let sdk: NodeSDK | null = null;

export function loadTelemetryConfig(
  serviceName: string,
  env: NodeJS.ProcessEnv = process.env,
): TelemetryConfig {
  const sampleRatio = Number(env.OTEL_TRACE_SAMPLE_RATIO ?? '1');
  if (!Number.isFinite(sampleRatio) || sampleRatio < 0 || sampleRatio > 1) {
    throw new Error('OTEL_TRACE_SAMPLE_RATIO must be between 0 and 1');
  }
  return {
    enabled: env.OTEL_ENABLED !== 'false',
    environment: env.APP_ENV ?? 'development',
    otlpEndpoint: (env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4318').replace(
      /\/$/,
      '',
    ),
    releaseSha: env.RELEASE_SHA ?? 'local',
    sampleRatio,
    serviceName,
  };
}

export async function startTelemetry(config: TelemetryConfig): Promise<void> {
  if (!config.enabled || sdk) return;

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.releaseSha,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.environment,
    }),
    sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(config.sampleRatio) }),
    traceExporter: new OTLPTraceExporter({
      url: `${config.otlpEndpoint}/v1/traces`,
      timeoutMillis: 5_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (request) =>
            request.url === '/health/live' || request.url === '/_internal/metrics',
        },
      }),
    ],
  });
  sdk.start();
}

export async function stopTelemetry(): Promise<void> {
  const activeSdk = sdk;
  sdk = null;
  if (activeSdk) await activeSdk.shutdown();
}
```

### `packages/observability/src/propagation.ts`

```ts
import {
  context,
  propagation,
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
  type Attributes,
} from '@opentelemetry/api';

export interface TraceCarrier {
  traceparent?: string;
  tracestate?: string;
}

export function injectTraceCarrier(): TraceCarrier {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return {
    ...(carrier.traceparent ? { traceparent: carrier.traceparent } : {}),
    ...(carrier.tracestate ? { tracestate: carrier.tracestate } : {}),
  };
}

export async function withConsumedJobSpan<T>(input: {
  attributes: Attributes;
  carrier: TraceCarrier;
  jobType: string;
  operation: () => Promise<T>;
}): Promise<T> {
  const parent = propagation.extract(ROOT_CONTEXT, input.carrier);
  const tracer = trace.getTracer('ai-parallel-web-jobs');

  return context.with(parent, () =>
    tracer.startActiveSpan(
      `job consume ${input.jobType}`,
      { kind: SpanKind.CONSUMER, attributes: input.attributes },
      async (span) => {
        try {
          const result = await input.operation();
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error instanceof Error ? error : new Error(String(error)));
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      },
    ),
  );
}
```

### `packages/observability/src/metrics.ts`

```ts
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  prefix: 'parallelweb_node_',
  register: metricsRegistry,
});

const seconds = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300];

export const httpRequests = new Counter({
  name: 'parallelweb_http_requests_total',
  help: 'HTTP requests completed by route template, method, and status family.',
  labelNames: ['service', 'route', 'method', 'status_family'] as const,
  registers: [metricsRegistry],
});

export const httpDuration = new Histogram({
  name: 'parallelweb_http_request_duration_seconds',
  help: 'HTTP server duration by route template and method.',
  labelNames: ['service', 'route', 'method'] as const,
  buckets: seconds,
  registers: [metricsRegistry],
});

export const runs = new Counter({
  name: 'parallelweb_runs_total',
  help: 'Durably committed terminal run outcomes.',
  labelNames: ['outcome', 'failure_domain'] as const,
  registers: [metricsRegistry],
});

export const runDuration = new Histogram({
  name: 'parallelweb_run_duration_seconds',
  help: 'Duration from persisted run start to terminal state.',
  labelNames: ['outcome'] as const,
  buckets: seconds,
  registers: [metricsRegistry],
});

export const stepErrors = new Counter({
  name: 'parallelweb_step_errors_total',
  help: 'Final classified step-attempt errors.',
  labelNames: ['failure_domain', 'error_class', 'retryable'] as const,
  registers: [metricsRegistry],
});

export const jobRetries = new Counter({
  name: 'parallelweb_job_retries_total',
  help: 'Durably scheduled job retries.',
  labelNames: ['job_type', 'failure_domain', 'error_class'] as const,
  registers: [metricsRegistry],
});

export const queueDepth = new Gauge({
  name: 'parallelweb_queue_depth',
  help: 'Durable jobs by bounded job type and state.',
  labelNames: ['job_type', 'state'] as const,
  registers: [metricsRegistry],
});

export const queueOldestAge = new Gauge({
  name: 'parallelweb_queue_oldest_age_seconds',
  help: 'Age of the oldest ready job by job type.',
  labelNames: ['job_type'] as const,
  registers: [metricsRegistry],
});

export const evidenceCompleteness = new Histogram({
  name: 'parallelweb_evidence_completeness_ratio',
  help: 'Required evidence present divided by required evidence expected.',
  labelNames: ['surface_class'] as const,
  buckets: [0, 0.5, 0.75, 0.9, 0.95, 0.98, 0.99, 1],
  registers: [metricsRegistry],
});

export const comparisonDuration = new Histogram({
  name: 'parallelweb_comparison_duration_seconds',
  help: 'Comparison job duration by stable algorithm version and outcome.',
  labelNames: ['algorithm_version', 'outcome'] as const,
  buckets: seconds,
  registers: [metricsRegistry],
});

export const exportsTotal = new Counter({
  name: 'parallelweb_exports_total',
  help: 'Durably committed terminal export outcomes.',
  labelNames: ['format', 'outcome', 'failure_domain'] as const,
  registers: [metricsRegistry],
});

export const exportDuration = new Histogram({
  name: 'parallelweb_export_duration_seconds',
  help: 'Export duration from accepted to terminal state.',
  labelNames: ['format', 'outcome'] as const,
  buckets: seconds,
  registers: [metricsRegistry],
});

export const browserContexts = new Gauge({
  name: 'parallelweb_browser_contexts',
  help: 'Browser contexts by worker pool and state.',
  labelNames: ['pool', 'state'] as const,
  registers: [metricsRegistry],
});

export const browserChildRss = new Gauge({
  name: 'parallelweb_browser_child_rss_bytes',
  help: 'Aggregate RSS of Chromium child processes for this worker.',
  labelNames: ['pool'] as const,
  registers: [metricsRegistry],
});

export const backpressureRejections = new Counter({
  name: 'parallelweb_backpressure_rejections_total',
  help: 'Work rejected before unsafe queue growth.',
  labelNames: ['work_type', 'reason'] as const,
  registers: [metricsRegistry],
});
```

### `packages/observability/src/fastify.ts`

```ts
import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { httpDuration, httpRequests, metricsRegistry } from './metrics.js';

declare module 'fastify' {
  interface FastifyRequest {
    metricsStartedAt?: bigint;
  }
}

function constantTimeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function routeTemplate(request: FastifyRequest): string {
  return request.routeOptions.url ?? 'unmatched';
}

export function registerHttpMetrics(app: FastifyInstance, service: string): void {
  app.addHook('onRequest', async (request) => {
    request.metricsStartedAt = process.hrtime.bigint();
  });

  app.addHook('onResponse', async (request, reply) => {
    if (!request.metricsStartedAt || request.url.startsWith('/_internal/metrics')) return;
    const duration = Number(process.hrtime.bigint() - request.metricsStartedAt) / 1e9;
    const labels = { method: request.method, route: routeTemplate(request), service };
    httpDuration.observe(labels, duration);
    httpRequests.inc({ ...labels, status_family: `${Math.floor(reply.statusCode / 100)}xx` });
  });
}

export function registerMetricsRoute(app: FastifyInstance, token: string): void {
  if (token.length < 32) throw new Error('METRICS_AUTH_TOKEN must contain at least 32 characters');

  app.get('/_internal/metrics', { logLevel: 'silent' }, async (request, reply) => {
    const provided = request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
    if (!constantTimeEqual(provided, token)) {
      return reply.status(404).send({ statusCode: 404 });
    }
    return reply
      .header('Content-Type', metricsRegistry.contentType)
      .send(await metricsRegistry.metrics());
  });
}
```

### `packages/observability/src/index.ts`

```ts
export const requiredCorrelationFields = [
  'request_id',
  'run_id',
  'persona_id',
  'step_id',
  'release_sha',
] as const;

export * from './fastify.js';
export * from './logger.js';
export * from './metrics.js';
export * from './propagation.js';
export * from './tracing.js';
```

### Service bootstrap and integration patches

Use a bootstrap file so OTel loads before instrumented libraries. This is complete for each executable; substitute only the service name and imported runtime module.

```ts
// apps/api/src/main.ts
import { loadTelemetryConfig, startTelemetry } from '@ai-parallel-web/observability';

await startTelemetry(loadTelemetryConfig('api'));
await import('./server.js');
```

Change the API `dev` and `start` scripts to point to `src/main.ts` and `dist/main.js`. In `app.ts`, replace the logger object with:

```ts
logger: createLoggerOptions(
  { environment: config.appEnv, releaseSha: config.releaseSha, service: 'api' },
  config.logLevel,
),
```

After decorating dependencies, register HTTP metrics and the protected route:

```ts
registerHttpMetrics(app, 'api');
registerMetricsRoute(app, config.metricsAuthToken);
```

Add `metricsAuthToken: string` to `ApiConfig`, load it from `METRICS_AUTH_TOKEN`, and fail startup outside tests when it is absent or under 32 characters. In `server.ts`, flush traces after closing application dependencies:

```ts
const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await stopTelemetry();
};
```

Do not call `process.exit(0)` in the success path; let Node exit after handles close so buffered telemetry can flush. Add a 30-second orchestrator termination grace period and a separate forced-exit timer only as a last resort.

For a producer, persist the carrier inside the durable job record in the same transaction:

```ts
const traceCarrier = injectTraceCarrier();
await jobs.enqueue(tx, { ...job, traceCarrier });
```

For every consumer, wrap the claimed attempt:

```ts
await withConsumedJobSpan({
  attributes: {
    'job.attempt': claim.attempt,
    'job.id': claim.id,
    'job.type': claim.type,
    'run.id': claim.runId,
  },
  carrier: claim.traceCarrier,
  jobType: claim.type,
  operation: () => processClaim(claim, signal),
});
```

`job.id` and `run.id` are acceptable trace attributes but forbidden metric labels. Classify the final failure once and write the same `failure_domain`, `error_class`, and `retryable` values to the log, span attributes, audit event, and bounded metric.

### Worker metrics server addition

Workers need a private scrape listener because they do not run Fastify. Add `packages/observability/src/metrics-server.ts` and export it from `index.ts`:

```ts
import { timingSafeEqual } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { metricsRegistry } from './metrics.js';

function authorized(header: string | undefined, token: string): boolean {
  const provided = Buffer.from(header?.replace(/^Bearer\s+/i, '') ?? '');
  const expected = Buffer.from(token);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function startWorkerMetricsServer(input: {
  host?: string;
  isReady: () => boolean | Promise<boolean>;
  port: number;
  token: string;
}): Promise<{ close: () => Promise<void> }> {
  if (input.token.length < 32) throw new Error('metrics token must be at least 32 characters');
  const server: Server = createServer(async (request, response) => {
    if (request.url === '/health/live') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end('{"status":"ok"}');
      return;
    }
    if (request.url === '/health/ready') {
      const ready = await input.isReady();
      response.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ status: ready ? 'ready' : 'not_ready' }));
      return;
    }
    if (
      request.url !== '/_internal/metrics' ||
      !authorized(request.headers.authorization, input.token)
    ) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': metricsRegistry.contentType });
    response.end(await metricsRegistry.metrics());
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(input.port, input.host ?? '0.0.0.0', resolve);
  });

  return {
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
```

Set a constant worker-memory-limit metric during startup so an alert can compare RSS with the orchestrator limit. Add this to `metrics.ts`:

```ts
export const workerMemoryLimit = new Gauge({
  name: 'parallelweb_worker_memory_limit_bytes',
  help: 'Configured memory limit for this service process and browser children.',
  registers: [metricsRegistry],
});
```

### Environment additions

Append these keys to each environment example. Development values are shown; staging/production must inject secrets and use the private Collector endpoint. A production sample ratio of `0.10` is a starting point, while errors and selected reference workflows should be tail-sampled at the Collector if the production backend supports it.

```dotenv
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_TRACE_SAMPLE_RATIO=1
METRICS_AUTH_TOKEN=__INJECT_AT_LEAST_32_RANDOM_CHARACTERS__
METRICS_HOST=0.0.0.0
METRICS_PORT=9464
WORKER_MEMORY_LIMIT_BYTES=1073741824
```

Never put the real metrics token, Grafana password, telemetry credentials, or alert receiver URLs in an example file.

### `infra/compose/docker-compose.observability.yml`

The image variables must be full reviewed references containing `@sha256:`. A preflight should reject mutable tags. Set them through the deployment environment; they are intentionally not invented here.

```yaml
services:
  api:
    environment:
      OTEL_ENABLED: 'true'
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4318
      OTEL_TRACE_SAMPLE_RATIO: '1'
      METRICS_AUTH_TOKEN: ${METRICS_AUTH_TOKEN:?set METRICS_AUTH_TOKEN}
    labels:
      com.ai-parallel-web.telemetry: 'true'
    depends_on:
      otel-collector:
        condition: service_healthy

  prometheus:
    image: ${PROMETHEUS_IMAGE:?use a reviewed digest-pinned Prometheus image}
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --storage.tsdb.retention.time=7d
      - --web.enable-lifecycle
    ports:
      - '127.0.0.1:9090:9090'
    volumes:
      - ../observability/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ../observability/alerts:/etc/prometheus/alerts:ro
      - ../observability/secrets:/etc/prometheus/secrets:ro
      - prometheus-data:/prometheus
    depends_on:
      alertmanager:
        condition: service_started
    restart: unless-stopped

  alertmanager:
    image: ${ALERTMANAGER_IMAGE:?use a reviewed digest-pinned Alertmanager image}
    command: [--config.file=/etc/alertmanager/alertmanager.yml]
    ports:
      - '127.0.0.1:9093:9093'
    volumes:
      - ../observability/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
    restart: unless-stopped

  tempo:
    image: ${TEMPO_IMAGE:?use a reviewed digest-pinned Tempo image}
    command: [-config.file=/etc/tempo.yaml]
    ports:
      - '127.0.0.1:3200:3200'
    volumes:
      - ../observability/tempo.yaml:/etc/tempo.yaml:ro
      - tempo-data:/var/tempo
    restart: unless-stopped

  otel-collector:
    image: ${OTEL_COLLECTOR_IMAGE:?use a reviewed digest-pinned Collector image}
    command: [--config=/etc/otelcol-contrib/config.yaml]
    volumes:
      - ../observability/otel-collector.yaml:/etc/otelcol-contrib/config.yaml:ro
    depends_on:
      tempo:
        condition: service_started
    healthcheck:
      test: [CMD, /otelcol-contrib, components]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  loki:
    image: ${LOKI_IMAGE:?use a reviewed digest-pinned Loki image}
    command: [-config.file=/etc/loki/local-config.yaml]
    ports:
      - '127.0.0.1:3100:3100'
    volumes:
      - ../observability/loki.yaml:/etc/loki/local-config.yaml:ro
      - loki-data:/loki
    restart: unless-stopped

  alloy:
    image: ${ALLOY_IMAGE:?use a reviewed digest-pinned Alloy image}
    command:
      - run
      - --server.http.listen-addr=0.0.0.0:12345
      - --storage.path=/var/lib/alloy/data
      - /etc/alloy/config.alloy
    ports:
      - '127.0.0.1:12345:12345'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ../observability/alloy.alloy:/etc/alloy/config.alloy:ro
      - alloy-data:/var/lib/alloy/data
    depends_on:
      loki:
        condition: service_started
    restart: unless-stopped

  grafana:
    image: ${GRAFANA_IMAGE:?use a reviewed digest-pinned Grafana image}
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: 'false'
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:?set a local Grafana password}
      GF_USERS_ALLOW_SIGN_UP: 'false'
    ports:
      - '127.0.0.1:3001:3000'
    volumes:
      - ../observability/grafana/provisioning:/etc/grafana/provisioning:ro
      - ../observability/grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
      - loki
      - tempo
    restart: unless-stopped

volumes:
  alloy-data:
  grafana-data:
  loki-data:
  prometheus-data:
  tempo-data:
```

The Collector image health command varies between approved distributions. If the pinned image does not expose `components`, replace only that health check with a check against the configured `health_check` extension; do not disable readiness silently.

### `infra/observability/otel-collector.yaml`

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 256
    spike_limit_mib: 64
  batch:
    send_batch_size: 1024
    timeout: 2s
  resource:
    attributes:
      - key: telemetry.collector
        value: ai-parallel-web
        action: upsert

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true
  debug:
    verbosity: basic

service:
  extensions: [health_check]
  telemetry:
    logs:
      level: info
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp/tempo]
```

Production uses TLS/authentication between service, Collector, and backend. `insecure: true` is local Compose only.

### `infra/observability/tempo.yaml`

```yaml
stream_over_http_enabled: true

server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318

storage:
  trace:
    backend: local
    wal:
      path: /var/tempo/wal
    local:
      path: /var/tempo/blocks

compactor:
  compaction:
    block_retention: 168h

usage_report:
  reporting_enabled: false
```

### `infra/observability/loki.yaml`

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  allow_structured_metadata: true
  retention_period: 168h

compactor:
  working_directory: /loki/compactor
  retention_enabled: true
  delete_request_store: filesystem

analytics:
  reporting_enabled: false
```

Loki has no built-in authentication in this configuration. Bind it to loopback locally and place production behind authenticated network policy/proxying.

### `infra/observability/alloy.alloy`

```alloy
logging {
  level  = "info"
  format = "logfmt"
}

discovery.docker "local" {
  host = "unix:///var/run/docker.sock"
}

discovery.relabel "parallelweb" {
  targets = discovery.docker.local.targets

  rule {
    source_labels = ["__meta_docker_container_label_com_ai_parallel_web_telemetry"]
    regex         = "true"
    action        = "keep"
  }

  rule {
    source_labels = ["__meta_docker_container_label_com_docker_compose_service"]
    target_label  = "service"
  }
}

loki.source.docker "parallelweb" {
  host       = "unix:///var/run/docker.sock"
  targets    = discovery.relabel.parallelweb.output
  labels     = { environment = "development" }
  forward_to = [loki.process.parallelweb.receiver]
}

loki.process "parallelweb" {
  stage.json {
    expressions = { level = "level" }
  }
  stage.labels {
    values = { level = "" }
  }
  forward_to = [loki.write.local.receiver]
}

loki.write "local" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```

Only `service`, `environment`, and `level` become Loki stream labels. Parse `trace_id`, `request_id`, `run_id`, and `failure_domain` from JSON at query time to avoid stream explosion.

### `infra/observability/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/alerts/*.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: ai-parallel-web-api
    metrics_path: /_internal/metrics
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/secrets/metrics-token
    static_configs:
      - targets: ['api:3000']
        labels:
          environment: development
          service: api

  - job_name: ai-parallel-web-browser-worker
    metrics_path: /_internal/metrics
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/secrets/metrics-token
    static_configs:
      - targets: ['worker-browser:9464']
        labels:
          environment: development
          service: browser-worker

  - job_name: ai-parallel-web-compare-worker
    metrics_path: /_internal/metrics
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/secrets/metrics-token
    static_configs:
      - targets: ['worker-compare:9464']
        labels:
          environment: development
          service: compare-worker

  - job_name: prometheus
    static_configs:
      - targets: ['localhost:9090']
```

Create `infra/observability/secrets/metrics-token` locally with mode `0600`, add the entire `secrets/` directory to `.gitignore`, and ensure its contents equal the API/worker `METRICS_AUTH_TOKEN`. In Kubernetes use a Secret plus Prometheus Operator authorization, not a committed file.

### `infra/observability/grafana/provisioning/datasources/datasources.yml`

```yaml
apiVersion: 1
prune: true

datasources:
  - name: Prometheus
    uid: prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: 15s
      exemplarTraceIdDestinations:
        - name: trace_id
          datasourceUid: tempo

  - name: Loki
    uid: loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
    jsonData:
      derivedFields:
        - name: TraceID
          matcherRegex: '"trace_id":"([0-9a-f]{32})"'
          datasourceUid: tempo
          url: '$${__value.raw}'

  - name: Tempo
    uid: tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    editable: false
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki
        filterByTraceID: true
        spanStartTimeShift: '-1m'
        spanEndTimeShift: '1m'
      nodeGraph:
        enabled: true
```

### `infra/observability/grafana/provisioning/dashboards/dashboards.yml`

```yaml
apiVersion: 1

providers:
  - name: ai-parallel-web
    orgId: 1
    folder: AI Parallel Web
    folderUid: ai-parallel-web
    type: file
    disableDeletion: true
    allowUiUpdates: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
```

### `infra/observability/alerts/parallelweb.rules.yml`

```yaml
groups:
  - name: ai-parallel-web-slo
    interval: 30s
    rules:
      - alert: ApiErrorBudgetFastBurn
        expr: |
          (
            sum by (environment) (rate(parallelweb_http_requests_total{status_family="5xx"}[5m]))
            /
            clamp_min(sum by (environment) (rate(parallelweb_http_requests_total[5m])), 0.001)
          ) > 0.0144
          and on (environment)
          (
            sum by (environment) (rate(parallelweb_http_requests_total{status_family="5xx"}[1h]))
            /
            clamp_min(sum by (environment) (rate(parallelweb_http_requests_total[1h])), 0.001)
          ) > 0.0144
        for: 2m
        labels:
          severity: page
          owner: qa-sre
          service: api
        annotations:
          summary: API is rapidly consuming its availability error budget
          description: 5xx ratio exceeds the 14.4x burn threshold in both 5m and 1h windows.
          action: Check failure-domain logs and traces; rollback if the RC introduced product failures.
          runbook_url: https://github.com/ORG/ai-parallel-web/blob/main/docs/runbooks/triage.md
          dashboard_url: http://grafana:3000/d/parallelweb-ops

      - alert: ApiReadLatencyHigh
        expr: |
          histogram_quantile(
            0.95,
            sum by (environment, route, le) (
              rate(parallelweb_http_request_duration_seconds_bucket{route=~"/v1/runs.*"}[10m])
            )
          ) > 0.5
        for: 10m
        labels:
          severity: ticket
          owner: backend
          service: api
        annotations:
          summary: API read p95 exceeds 500 ms
          description: Sustained metadata-read latency is outside the Day 9 objective.
          action: Inspect DB pool wait, query traces, CPU, and queue contention before changing capacity.
          runbook_url: https://github.com/ORG/ai-parallel-web/blob/main/docs/runbooks/triage.md
          dashboard_url: http://grafana:3000/d/parallelweb-ops

      - alert: RunSuccessRateLow
        expr: |
          (
            sum by (environment) (rate(parallelweb_runs_total{outcome="completed"}[30m]))
            /
            clamp_min(sum by (environment) (rate(parallelweb_runs_total[30m])), 0.001)
          ) < 0.95
          and on (environment)
          sum by (environment) (increase(parallelweb_runs_total[30m])) >= 10
        for: 10m
        labels:
          severity: page
          owner: qa-sre
          service: workflow
        annotations:
          summary: Eligible run success rate is below 95 percent
          description: At least ten terminal runs were observed, preventing a low-traffic false page.
          action: Split failures by failure_domain before choosing rollback, infrastructure remediation, or target pause.
          runbook_url: https://github.com/ORG/ai-parallel-web/blob/main/docs/runbooks/triage.md
          dashboard_url: http://grafana:3000/d/parallelweb-ops

      - alert: QueueAgeCritical
        expr: max by (environment, job_type) (parallelweb_queue_oldest_age_seconds) > 120
        for: 5m
        labels:
          severity: page
          owner: qa-sre
          service: workflow
        annotations:
          summary: Oldest ready job has exceeded 120 seconds
          description: The queue is outside the burst objective and may be saturated or stranded.
          action: Check worker availability, lease churn, DB/storage health, target throttling, and KEDA state; shed new work if growth continues.
          runbook_url: https://github.com/ORG/ai-parallel-web/blob/main/docs/runbooks/triage.md
          dashboard_url: http://grafana:3000/d/parallelweb-capacity

      - alert: EvidenceCompletenessLow
        expr: |
          sum by (environment) (rate(parallelweb_evidence_completeness_ratio_sum[30m]))
          /
          clamp_min(sum by (environment) (rate(parallelweb_evidence_completeness_ratio_count[30m])), 0.001)
          < 0.99
        for: 15m
        labels:
          severity: page
          owner: qa-sre
          service: evidence
        annotations:
          summary: Mean evidence completeness is below 99 percent
          description: Missing required evidence can invalidate comparison and replay results.
          action: Split BLOCKED from MISSING_FAILURE; inspect storage and capture spans before retrying.
          runbook_url: https://github.com/ORG/ai-parallel-web/blob/main/docs/runbooks/triage.md
          dashboard_url: http://grafana:3000/d/parallelweb-ops

      - alert: ExportFailureRateHigh
        expr: |
          sum by (environment) (rate(parallelweb_exports_total{outcome="failed"}[30m]))
          /
          clamp_min(sum by (environment) (rate(parallelweb_exports_total[30m])), 0.001)
          > 0.01
        for: 15m
        labels:
          severity: ticket
          owner: backend
          service: export
        annotations:
          summary: Export failure rate exceeds one percent
          description: Independent-consumer portability is outside its objective.
          action: Inspect storage, schema validation, checksum, and authorization failures; quarantine poison jobs.
          runbook_url: https://github.com/ORG/ai-parallel-web/blob/main/docs/runbooks/triage.md
          dashboard_url: http://grafana:3000/d/parallelweb-ops

  - name: ai-parallel-web-capacity
    interval: 30s
    rules:
      - alert: BrowserMemoryNearLimit
        expr: |
          (
            sum by (environment, service, instance) (parallelweb_node_process_resident_memory_bytes)
            + on (environment, service, instance)
            sum by (environment, service, instance) (parallelweb_browser_child_rss_bytes)
          )
          /
          on (environment, service, instance)
          max by (environment, service, instance) (parallelweb_worker_memory_limit_bytes)
          > 0.85
        for: 2m
        labels:
          severity: page
          owner: qa-sre
          service: browser-worker
        annotations:
          summary: Browser worker memory exceeds 85 percent of its limit
          description: Sustained memory pressure risks OOM and duplicate recovery work.
          action: Stop increasing concurrency, drain the pod, inspect context leaks, and reduce the safe envelope if reproducible.
          runbook_url: https://github.com/ORG/ai-parallel-web/blob/main/docs/runbooks/triage.md
          dashboard_url: http://grafana:3000/d/parallelweb-capacity

      - alert: RetryRateElevated
        expr: sum by (environment, job_type) (rate(parallelweb_job_retries_total[15m])) > 0.1
        for: 15m
        labels:
          severity: ticket
          owner: backend
          service: workflow
        annotations:
          summary: Job retries are elevated
          description: More than six retries per minute are being durably scheduled for a job type.
          action: Inspect error class and failure domain; do not increase retry budgets until idempotency is proven.
          runbook_url: https://github.com/ORG/ai-parallel-web/blob/main/docs/runbooks/triage.md
          dashboard_url: http://grafana:3000/d/parallelweb-capacity

      - alert: BackpressureSustained
        expr: sum by (environment, work_type, reason) (rate(parallelweb_backpressure_rejections_total[10m])) > 0.05
        for: 10m
        labels:
          severity: ticket
          owner: qa-sre
          service: api
        annotations:
          summary: Capacity protection is rejecting work continuously
          description: Useful 429 responses are protecting the system, but demand exceeds the approved envelope.
          action: Verify target limits and saturation source before changing replica or queue caps.
          runbook_url: https://github.com/ORG/ai-parallel-web/blob/main/docs/runbooks/triage.md
          dashboard_url: http://grafana:3000/d/parallelweb-capacity

      - alert: TelemetryTargetMissing
        expr: up{job=~"ai-parallel-web-.*"} == 0
        for: 5m
        labels:
          severity: ticket
          owner: qa-sre
          service: observability
        annotations:
          summary: Prometheus cannot scrape an AI Parallel Web service
          description: On-call visibility is degraded; this is not itself evidence that the product is down.
          action: Check service readiness, private metrics authorization, network policy, and Prometheus configuration.
          runbook_url: https://github.com/ORG/ai-parallel-web/blob/main/docs/runbooks/triage.md
          dashboard_url: http://grafana:3000/d/parallelweb-capacity
```

Replace `ORG` during repository setup. The gate rejects `.invalid`, `ORG`, `TBD`, or inaccessible runbook URLs.

### `infra/observability/alertmanager.yml`

```yaml
global:
  resolve_timeout: 5m

route:
  receiver: local-ui
  group_by: [alertname, environment, service, owner]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - receiver: sre-oncall
      matchers:
        - owner="qa-sre"
    - receiver: backend-oncall
      matchers:
        - owner="backend"
    - receiver: product-security
      matchers:
        - owner="product-security"

inhibit_rules:
  - source_matchers: [severity="page"]
    target_matchers: [severity="ticket"]
    equal: [environment, service, alertname]
  - source_matchers: [alertname="ApiErrorBudgetFastBurn"]
    target_matchers: [severity="ticket"]
    equal: [environment]

receivers:
  - name: local-ui
  - name: sre-oncall
  - name: backend-oncall
  - name: product-security
```

This base is intentionally contact-neutral: organizations differ in PagerDuty/Slack/email credentials, and inventing an address is unsafe. The staging/production secret overlay must add a real integration to every named receiver. The Day 9 gate includes a fired-and-acknowledged delivery test, so empty receivers cannot pass outside local development.

### `infra/observability/grafana/dashboards/operations-overview.json`

```json
{
  "annotations": { "list": [] },
  "editable": false,
  "graphTooltip": 1,
  "panels": [
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "min": 0, "max": 1, "unit": "percentunit" }, "overrides": [] },
      "gridPos": { "h": 5, "w": 6, "x": 0, "y": 0 },
      "id": 1,
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "reduceOptions": { "calcs": ["lastNotNull"] }
      },
      "targets": [
        {
          "expr": "1 - (sum(rate(parallelweb_http_requests_total{status_family=\"5xx\"}[$__rate_interval])) / clamp_min(sum(rate(parallelweb_http_requests_total[$__rate_interval])), 0.001))",
          "refId": "A"
        }
      ],
      "title": "API availability",
      "type": "stat"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": {
        "defaults": {
          "unit": "s",
          "thresholds": {
            "mode": "absolute",
            "steps": [{ "color": "green" }, { "color": "red", "value": 0.5 }]
          }
        },
        "overrides": []
      },
      "gridPos": { "h": 5, "w": 6, "x": 6, "y": 0 },
      "id": 2,
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "reduceOptions": { "calcs": ["lastNotNull"] }
      },
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum by (le) (rate(parallelweb_http_request_duration_seconds_bucket{route=~\"/v1/runs.*\"}[$__rate_interval])))",
          "refId": "A"
        }
      ],
      "title": "API read p95",
      "type": "stat"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "percentunit", "min": 0, "max": 1 }, "overrides": [] },
      "gridPos": { "h": 5, "w": 6, "x": 12, "y": 0 },
      "id": 3,
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "reduceOptions": { "calcs": ["lastNotNull"] }
      },
      "targets": [
        {
          "expr": "sum(rate(parallelweb_runs_total{outcome=\"completed\"}[$__rate_interval])) / clamp_min(sum(rate(parallelweb_runs_total[$__rate_interval])), 0.001)",
          "refId": "A"
        }
      ],
      "title": "Run success rate",
      "type": "stat"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "percentunit", "min": 0, "max": 1 }, "overrides": [] },
      "gridPos": { "h": 5, "w": 6, "x": 18, "y": 0 },
      "id": 4,
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "reduceOptions": { "calcs": ["lastNotNull"] }
      },
      "targets": [
        {
          "expr": "sum(rate(parallelweb_evidence_completeness_ratio_sum[$__rate_interval])) / clamp_min(sum(rate(parallelweb_evidence_completeness_ratio_count[$__rate_interval])), 0.001)",
          "refId": "A"
        }
      ],
      "title": "Evidence completeness",
      "type": "stat"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "ops" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 5 },
      "id": 5,
      "targets": [
        {
          "expr": "sum by (failure_domain) (rate(parallelweb_runs_total{outcome!=\"completed\"}[$__rate_interval]))",
          "legendFormat": "{{failure_domain}}",
          "refId": "A"
        }
      ],
      "title": "Terminal run failures by domain",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "s" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 5 },
      "id": 6,
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum by (le, outcome) (rate(parallelweb_run_duration_seconds_bucket[$__rate_interval])))",
          "legendFormat": "{{outcome}}",
          "refId": "A"
        }
      ],
      "title": "Run duration p95",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "s" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 8, "x": 0, "y": 13 },
      "id": 7,
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum by (le, algorithm_version) (rate(parallelweb_comparison_duration_seconds_bucket[$__rate_interval])))",
          "legendFormat": "{{algorithm_version}}",
          "refId": "A"
        }
      ],
      "title": "Comparison p95",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "s" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 8, "x": 8, "y": 13 },
      "id": 8,
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum by (le, format) (rate(parallelweb_export_duration_seconds_bucket[$__rate_interval])))",
          "legendFormat": "{{format}}",
          "refId": "A"
        }
      ],
      "title": "Export ready p95",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "ops" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 8, "x": 16, "y": 13 },
      "id": 9,
      "targets": [
        {
          "expr": "sum by (failure_domain, error_class) (rate(parallelweb_step_errors_total[$__rate_interval]))",
          "legendFormat": "{{failure_domain}} / {{error_class}}",
          "refId": "A"
        }
      ],
      "title": "Step errors",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "loki", "uid": "loki" },
      "gridPos": { "h": 9, "w": 24, "x": 0, "y": 21 },
      "id": 10,
      "options": {
        "dedupStrategy": "signature",
        "enableLogDetails": true,
        "showCommonLabels": false,
        "showLabels": false,
        "showTime": true,
        "sortOrder": "Descending",
        "wrapLogMessage": true
      },
      "targets": [
        {
          "expr": "{service=~\"api|worker-browser|worker-compare\"} | json | level=~\"error|fatal\"",
          "refId": "A"
        }
      ],
      "title": "Correlated error logs",
      "type": "logs"
    }
  ],
  "refresh": "30s",
  "schemaVersion": 41,
  "tags": ["ai-parallel-web", "day-9", "slo"],
  "templating": { "list": [] },
  "time": { "from": "now-6h", "to": "now" },
  "timezone": "utc",
  "title": "AI Parallel Web — Operations Overview",
  "uid": "parallelweb-ops",
  "version": 1
}
```

### `infra/observability/grafana/dashboards/worker-capacity.json`

```json
{
  "annotations": { "list": [] },
  "editable": false,
  "graphTooltip": 1,
  "panels": [
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "short" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 8, "x": 0, "y": 0 },
      "id": 1,
      "targets": [
        {
          "expr": "max by (job_type, state) (parallelweb_queue_depth)",
          "legendFormat": "{{job_type}} / {{state}}",
          "refId": "A"
        }
      ],
      "title": "Queue depth",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": {
        "defaults": {
          "unit": "s",
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "color": "green" },
              { "color": "orange", "value": 30 },
              { "color": "red", "value": 120 }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": { "h": 8, "w": 8, "x": 8, "y": 0 },
      "id": 2,
      "targets": [
        {
          "expr": "max by (job_type) (parallelweb_queue_oldest_age_seconds)",
          "legendFormat": "{{job_type}}",
          "refId": "A"
        }
      ],
      "title": "Oldest queue age",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "short" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 8, "x": 16, "y": 0 },
      "id": 3,
      "targets": [
        {
          "expr": "sum by (pool, state) (parallelweb_browser_contexts)",
          "legendFormat": "{{pool}} / {{state}}",
          "refId": "A"
        }
      ],
      "title": "Browser contexts",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "short", "min": 0 }, "overrides": [] },
      "gridPos": { "h": 8, "w": 8, "x": 0, "y": 8 },
      "id": 4,
      "targets": [
        {
          "expr": "rate(parallelweb_node_process_cpu_seconds_total[$__rate_interval])",
          "legendFormat": "{{service}} / {{instance}}",
          "refId": "A"
        }
      ],
      "title": "Process CPU cores",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "bytes" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 8, "x": 8, "y": 8 },
      "id": 5,
      "targets": [
        {
          "expr": "parallelweb_node_process_resident_memory_bytes + on(instance) parallelweb_browser_child_rss_bytes",
          "legendFormat": "{{service}} / {{instance}}",
          "refId": "A"
        }
      ],
      "title": "Worker + browser RSS",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "s" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 8, "x": 16, "y": 8 },
      "id": 6,
      "targets": [
        {
          "expr": "parallelweb_node_nodejs_eventloop_lag_p99_seconds",
          "legendFormat": "{{service}}",
          "refId": "A"
        }
      ],
      "title": "Event-loop lag p99",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "ops" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 16 },
      "id": 7,
      "targets": [
        {
          "expr": "sum by (job_type, failure_domain) (rate(parallelweb_job_retries_total[$__rate_interval]))",
          "legendFormat": "{{job_type}} / {{failure_domain}}",
          "refId": "A"
        }
      ],
      "title": "Retry rate",
      "type": "timeseries"
    },
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": { "defaults": { "unit": "ops" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 16 },
      "id": 8,
      "targets": [
        {
          "expr": "sum by (work_type, reason) (rate(parallelweb_backpressure_rejections_total[$__rate_interval]))",
          "legendFormat": "{{work_type}} / {{reason}}",
          "refId": "A"
        }
      ],
      "title": "Back-pressure rejections",
      "type": "timeseries"
    }
  ],
  "refresh": "15s",
  "schemaVersion": 41,
  "tags": ["ai-parallel-web", "day-9", "capacity"],
  "templating": { "list": [] },
  "time": { "from": "now-3h", "to": "now" },
  "timezone": "utc",
  "title": "AI Parallel Web — Worker Capacity",
  "uid": "parallelweb-capacity",
  "version": 1
}
```

### `tests/load/day9.js`

This script drives only public authenticated APIs. Queueing and artifact upload are validated through the workflows it creates and the server-side metrics, not a test-only production route.

```js
import http from 'k6/http';
import { check, fail } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const token = __ENV.AUTH_TOKEN ?? '';
const completedRunIds = (__ENV.COMPLETED_RUN_IDS ?? '').split(',').filter(Boolean);
const runFixture = JSON.parse(
  __ENV.RUN_FIXTURE_JSON ??
    '{"journeyVersionId":"00000000-0000-0000-0000-000000000000","personaVersionIds":["00000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000002"],"surfaceId":"00000000-0000-0000-0000-000000000003"}',
);

if (!token) throw new Error('AUTH_TOKEN is required');
if (completedRunIds.length === 0) throw new Error('COMPLETED_RUN_IDS is required');
if (/prod(uction)?/i.test(baseUrl)) {
  if (__ENV.ALLOW_PRODUCTION_LOAD_TEST !== 'true' || !__ENV.PRODUCTION_LOAD_APPROVAL) {
    throw new Error('Production load tests require explicit dual approval');
  }
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

const eligible = new Rate('eligible_request_success');
const apiReadDuration = new Trend('api_read_duration', true);
const runAcceptDuration = new Trend('run_accept_duration', true);
const comparisonReadDuration = new Trend('comparison_read_duration', true);
const replayReadDuration = new Trend('replay_read_duration', true);
const exportAcceptDuration = new Trend('export_accept_duration', true);

const trafficStages = [
  { duration: '5m', target: 5 },
  { duration: '20m', target: 20 },
  { duration: '10m', target: 40 },
  { duration: '10m', target: 20 },
];

export const options = {
  discardResponseBodies: true,
  scenarios: {
    api_reads: {
      executor: 'ramping-arrival-rate',
      exec: 'apiReads',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 30,
      maxVUs: 100,
      stages: trafficStages,
      tags: { capability: 'api_read' },
    },
    run_creation: {
      executor: 'ramping-arrival-rate',
      exec: 'runCreation',
      startRate: 1,
      timeUnit: '1m',
      preAllocatedVUs: 4,
      maxVUs: 20,
      stages: [
        { duration: '5m', target: 1 },
        { duration: '20m', target: 2 },
        { duration: '10m', target: 4 },
        { duration: '10m', target: 2 },
      ],
      tags: { capability: 'run_create' },
    },
    comparison_reads: {
      executor: 'ramping-arrival-rate',
      exec: 'comparisonReads',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 4,
      maxVUs: 20,
      stages: [
        { duration: '5m', target: 1 },
        { duration: '20m', target: 1 },
        { duration: '10m', target: 2 },
        { duration: '10m', target: 1 },
      ],
      tags: { capability: 'comparison' },
    },
    replay_reads: {
      executor: 'ramping-arrival-rate',
      exec: 'replayReads',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 4,
      maxVUs: 20,
      stages: [
        { duration: '5m', target: 1 },
        { duration: '20m', target: 1 },
        { duration: '10m', target: 2 },
        { duration: '10m', target: 1 },
      ],
      tags: { capability: 'replay' },
    },
    export_creation: {
      executor: 'ramping-arrival-rate',
      exec: 'exportCreation',
      startRate: 1,
      timeUnit: '1m',
      preAllocatedVUs: 2,
      maxVUs: 8,
      stages: [
        { duration: '5m', target: 1 },
        { duration: '20m', target: 1 },
        { duration: '10m', target: 2 },
        { duration: '10m', target: 1 },
      ],
      tags: { capability: 'export' },
    },
  },
  thresholds: {
    eligible_request_success: ['rate>=0.99'],
    api_read_duration: ['p(95)<500'],
    run_accept_duration: ['p(95)<1000'],
    comparison_read_duration: ['p(95)<500'],
    replay_read_duration: ['p(95)<500'],
    export_accept_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
    dropped_iterations: ['count==0'],
  },
};

function completedRunId() {
  return completedRunIds[Math.floor(Math.random() * completedRunIds.length)];
}

function record(response, expectedStatuses, metric, assertion) {
  metric.add(response.timings.duration);
  const ok = expectedStatuses.includes(response.status);
  eligible.add(ok);
  check(response, { [assertion]: () => ok });
}

export function setup() {
  const response = http.get(`${baseUrl}/health/ready`, { tags: { name: 'health_ready' } });
  if (response.status !== 200) fail(`preflight readiness failed: ${response.status}`);
}

export function apiReads() {
  const id = completedRunId();
  const responses = http.batch([
    ['GET', `${baseUrl}/v1/runs?limit=20&offset=0`, null, { headers, tags: { name: 'list_runs' } }],
    ['GET', `${baseUrl}/v1/runs/${id}`, null, { headers, tags: { name: 'get_run' } }],
  ]);
  for (const response of responses)
    record(response, [200], apiReadDuration, 'API read returned 200');
}

export function runCreation() {
  const idempotencyKey = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const response = http.post(`${baseUrl}/v1/runs`, JSON.stringify(runFixture), {
    headers: { ...headers, 'Idempotency-Key': idempotencyKey },
    tags: { name: 'create_run' },
  });
  record(response, [202], runAcceptDuration, 'run was durably accepted');
}

export function comparisonReads() {
  const response = http.get(`${baseUrl}/v1/runs/${completedRunId()}/comparison`, {
    headers,
    tags: { name: 'get_comparison' },
  });
  record(response, [200], comparisonReadDuration, 'comparison returned 200');
}

export function replayReads() {
  const response = http.get(`${baseUrl}/v1/runs/${completedRunId()}/replay`, {
    headers,
    tags: { name: 'get_replay' },
  });
  record(response, [200], replayReadDuration, 'replay returned 200');
}

export function exportCreation() {
  const response = http.post(
    `${baseUrl}/v1/runs/${completedRunId()}/exports`,
    JSON.stringify({ formats: ['json', 'csv'] }),
    {
      headers: { ...headers, 'Idempotency-Key': `k6-export-${__VU}-${__ITER}-${Date.now()}` },
      tags: { name: 'create_export' },
    },
  );
  record(response, [202], exportAcceptDuration, 'export was durably accepted');
}
```

### `tests/load/README.md`

```md
# Day 9 load test

Run only against an isolated staging tenant and approved deterministic fixture. Never raise public-surface pacing above its approved policy. `AUTH_TOKEN`, IDs, and fixture JSON are secrets/runtime inputs and must not be committed.

The script has warm-up, reference, 2× burst, and recovery stages. A zero k6 exit is necessary but not sufficient: export readiness, artifact uploads, comparison work, queue age, retries, evidence completeness, database/storage latency, and worker saturation are evaluated from server metrics and durable records for the same time window.

Required environment:

- `BASE_URL`
- `AUTH_TOKEN`
- `RUN_FIXTURE_JSON`
- `COMPLETED_RUN_IDS` as comma-separated IDs

Production is denied by default. If an explicitly approved production smoke-load is ever required, both `ALLOW_PRODUCTION_LOAD_TEST=true` and a separate `PRODUCTION_LOAD_APPROVAL` value must be supplied, with SRE and Product Owner approval recorded first.
```

### `infra/scripts/profile-browser-container.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

container_name="${1:?usage: profile-browser-container.sh CONTAINER DURATION_SECONDS OUTPUT_JSONL [INTERVAL_SECONDS]}"
duration_seconds="${2:?duration is required}"
output_path="${3:?output path is required}"
interval_seconds="${4:-5}"

case "$duration_seconds:$interval_seconds" in
  *[!0-9:]*|:*|*:0) echo "duration and interval must be positive integers" >&2; exit 2 ;;
esac

command -v docker >/dev/null || { echo "docker is required" >&2; exit 2; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }
docker inspect "$container_name" >/dev/null
mkdir -p "$(dirname "$output_path")"
: > "$output_path"

started_epoch="$(date +%s)"
while [ "$(( $(date +%s) - started_epoch ))" -lt "$duration_seconds" ]; do
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  docker stats --no-stream --format '{{json .}}' "$container_name" \
    | jq -c --arg timestamp "$timestamp" --arg container "$container_name" \
      '. + {timestamp: $timestamp, container: $container}' >> "$output_path"
  sleep "$interval_seconds"
done

test -s "$output_path"
echo "profile written to $output_path"
```

The profiler captures whole-container CPU and memory, including Chromium child processes. Correlate it with Prometheus browser-context, queue-age, step-duration, and evidence-completeness data; Docker's human-readable percentages alone are not the capacity decision.

### `tests/performance/tune-concurrency.ts`

This analyzer consumes normalized JSON records produced after each candidate test. Do not let it deploy or mutate staging; SRE changes one reviewed candidate at a time.

```ts
import { readFile } from 'node:fs/promises';

interface CandidateRecord {
  concurrency: number;
  cpuPercent: number;
  evidenceCompleteness: number;
  eventLoopP99Ms: number;
  memoryPercent: number;
  queueAgeP95Seconds: number;
  runSuccessRate: number;
  stepP95Ms: number;
  targetThrottleCount: number;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, index)] ?? Number.NaN;
}

function passes(records: CandidateRecord[]): boolean {
  return (
    percentile(
      records.map((r) => r.cpuPercent),
      0.95,
    ) <= 70 &&
    percentile(
      records.map((r) => r.memoryPercent),
      0.95,
    ) <= 75 &&
    percentile(
      records.map((r) => r.eventLoopP99Ms),
      0.95,
    ) <= 100 &&
    percentile(
      records.map((r) => r.queueAgeP95Seconds),
      0.95,
    ) <= 30 &&
    percentile(
      records.map((r) => r.stepP95Ms),
      0.95,
    ) <= 10_000 &&
    records.every((r) => r.evidenceCompleteness >= 0.99) &&
    records.every((r) => r.runSuccessRate >= 0.95) &&
    records.every((r) => r.targetThrottleCount === 0)
  );
}

const path = process.argv[2];
if (!path) throw new Error('usage: tsx tune-concurrency.ts RESULTS.json');
const rows = JSON.parse(await readFile(path, 'utf8')) as CandidateRecord[];
const groups = Map.groupBy(rows, (row) => row.concurrency);
const evaluated = [...groups.entries()]
  .map(([concurrency, records]) => ({
    concurrency,
    passes: passes(records),
    samples: records.length,
  }))
  .sort((a, b) => a.concurrency - b.concurrency);

const safe = evaluated.filter((result) => result.passes).at(-1);
console.log(
  JSON.stringify({ evaluated, recommendedConcurrency: safe?.concurrency ?? null }, null, 2),
);
if (!safe) process.exitCode = 1;
```

Each input record must come from the same fixed-duration interval and same reference workload. A candidate needs at least 180 five-second samples (15 minutes); make the report generator reject smaller groups before the gate.

### `infra/environments/staging/worker-browser-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-parallel-web-browser-worker
  labels:
    app.kubernetes.io/name: ai-parallel-web
    app.kubernetes.io/component: browser-worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: ai-parallel-web
      app.kubernetes.io/component: browser-worker
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ai-parallel-web
        app.kubernetes.io/component: browser-worker
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: worker
          image: ghcr.io/parallelweb/ai-parallel-web-browser-worker@sha256:REPLACE_WITH_RC_DIGEST
          ports:
            - name: metrics
              containerPort: 9464
          envFrom:
            - secretRef:
                name: ai-parallel-web-staging
          env:
            - name: WORKER_CONCURRENCY
              value: '2'
            - name: WORKER_MEMORY_LIMIT_BYTES
              valueFrom:
                resourceFieldRef:
                  resource: limits.memory
                  divisor: '1'
          startupProbe:
            httpGet:
              path: /health/live
              port: metrics
            failureThreshold: 30
            periodSeconds: 2
          livenessProbe:
            httpGet:
              path: /health/live
              port: metrics
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health/ready
              port: metrics
            periodSeconds: 5
          resources:
            requests:
              cpu: '1'
              memory: 1Gi
            limits:
              cpu: '2'
              memory: 2Gi
```

The digest, concurrency, and resources are deliberately gate placeholders/provisional values. Replace them with the measured RC digest and Day 9 capacity report; the validation script rejects `REPLACE_WITH`.

### `infra/environments/staging/worker-browser-scaledobject.yaml`

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: ai-parallel-web-browser-worker
spec:
  scaleTargetRef:
    name: ai-parallel-web-browser-worker
  pollingInterval: 15
  cooldownPeriod: 300
  minReplicaCount: 1
  maxReplicaCount: 4
  fallback:
    failureThreshold: 3
    replicas: 2
  advanced:
    restoreToOriginalReplicaCount: true
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 0
          selectPolicy: Min
          policies:
            - type: Pods
              value: 2
              periodSeconds: 60
            - type: Percent
              value: 100
              periodSeconds: 60
        scaleDown:
          stabilizationWindowSeconds: 300
          selectPolicy: Max
          policies:
            - type: Pods
              value: 1
              periodSeconds: 120
  triggers:
    - type: prometheus
      name: oldest-browser-job-age
      metricType: AverageValue
      metadata:
        serverAddress: http://prometheus.monitoring.svc.cluster.local:9090
        query: max(parallelweb_queue_oldest_age_seconds{environment="staging",job_type="browser.run"})
        threshold: '30'
        activationThreshold: '5'
        ignoreNullValues: 'false'
```

`maxReplicaCount: 4` is a conservative template, not permission to send four times the target traffic. Replace it only when the formula in Task 6 and the approved surface pacing both permit the result.

### `infra/environments/staging/resource-guardrails.yaml`

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ai-parallel-web-cost-guardrail
spec:
  hard:
    requests.cpu: '8'
    requests.memory: 12Gi
    limits.cpu: '16'
    limits.memory: 24Gi
    pods: '16'
---
apiVersion: v1
kind: LimitRange
metadata:
  name: ai-parallel-web-default-limits
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      default:
        cpu: '1'
        memory: 1Gi
      max:
        cpu: '2'
        memory: 2Gi
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ai-parallel-web-browser-worker
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: ai-parallel-web
      app.kubernetes.io/component: browser-worker
```

The quota must be reconciled with every service in the namespace and the real monthly budget. Do not apply a copied quota to a shared production namespace without an SRE capacity review.

### `tests/observability/redaction.test.ts`

```ts
import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { createLoggerOptions } from '@ai-parallel-web/observability';

describe('structured log redaction', () => {
  it('does not serialize configured secret values', () => {
    let output = '';
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const logger = pino(
      createLoggerOptions({ environment: 'test', releaseSha: 'test-sha', service: 'test' }, 'info'),
      sink,
    );
    const secrets = ['bearer-secret', 'cookie-secret', 'password-secret', 'signed-url-secret'];

    logger.info(
      {
        req: { headers: { authorization: secrets[0], cookie: secrets[1] } },
        password: secrets[2],
        signedUrl: secrets[3],
        request_id: 'request-safe',
        run_id: 'run-safe',
      },
      'redaction probe',
    );

    for (const secret of secrets) expect(output).not.toContain(secret);
    expect(output).toContain('[REDACTED]');
    expect(output).toContain('request-safe');
    expect(output).toContain('run-safe');
  });
});
```

Add `pino` to the exact observability dependency installation command because this test and worker logger use it directly; do not rely on Fastify's transitive dependency.

### `tests/observability/metrics.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { metricsRegistry } from '@ai-parallel-web/observability';

const forbidden = new Set([
  'tenant',
  'tenant_id',
  'user',
  'user_id',
  'request_id',
  'run_id',
  'job_id',
  'persona_id',
  'step_id',
  'hostname',
  'url',
  'error_message',
  'storage_key',
  'release_sha',
]);

describe('Day 9 metrics contract', () => {
  it('registers every required metric family', () => {
    const names = new Set(metricsRegistry.getMetricsAsArray().map((metric) => metric.name));
    for (const name of [
      'parallelweb_runs_total',
      'parallelweb_run_duration_seconds',
      'parallelweb_step_errors_total',
      'parallelweb_job_retries_total',
      'parallelweb_queue_depth',
      'parallelweb_queue_oldest_age_seconds',
      'parallelweb_evidence_completeness_ratio',
      'parallelweb_comparison_duration_seconds',
      'parallelweb_exports_total',
      'parallelweb_export_duration_seconds',
      'parallelweb_browser_contexts',
      'parallelweb_browser_child_rss_bytes',
      'parallelweb_backpressure_rejections_total',
    ])
      expect(names.has(name), `${name} is missing`).toBe(true);
  });

  it('does not declare high-cardinality labels', () => {
    for (const metric of metricsRegistry.getMetricsAsArray()) {
      const labels = (metric as unknown as { labelNames?: string[] }).labelNames ?? [];
      for (const label of labels)
        expect(forbidden.has(label), `${metric.name}:${label}`).toBe(false);
    }
  });
});
```

### `tests/e2e/playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /day9-regression\.spec\.ts/,
  outputDir: '../../artifacts/day-9/playwright',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../../artifacts/day-9/playwright-report' }],
    ['junit', { outputFile: '../../artifacts/day-9/playwright-junit.xml' }],
  ],
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL: process.env.WEB_BASE_URL ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

### `tests/e2e/day9-regression.spec.ts`

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const completedRunId = process.env.E2E_COMPLETED_RUN_ID;

async function authenticate(page: Page) {
  const token = process.env.E2E_AUTH_TOKEN;
  if (!token) throw new Error('E2E_AUTH_TOKEN is required');
  await page.addInitScript((value) => localStorage.setItem('auth_token', value), token);
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((v) =>
    ['critical', 'serious'].includes(v.impact ?? ''),
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

test.beforeEach(async ({ page }) => authenticate(page));

test('run list loads and has no serious accessibility violations', async ({ page }) => {
  await page.goto('/runs');
  await expect(page.getByRole('heading', { name: 'Runs' })).toBeVisible();
  await expect(page.getByRole('link', { name: /New Run/i })).toBeVisible();
  await expectAccessible(page);
});

test('create form exposes the three required choices', async ({ page }) => {
  await page.goto('/runs/new');
  await expect(page.getByRole('heading', { name: 'Create New Run' })).toBeVisible();
  await expect(page.getByText('1. Select Surface')).toBeVisible();
  await expect(page.getByText('2. Select Journey Version')).toBeVisible();
  await expect(page.getByText('3. Select Personas')).toBeVisible();
  await expectAccessible(page);
});

test('completed run exposes comparison, replay, and export actions', async ({ page }) => {
  test.skip(!completedRunId, 'E2E_COMPLETED_RUN_ID is required for release-gate execution');
  await page.goto(`/runs/${completedRunId}`);
  await expect(page.getByRole('heading', { name: /Run / })).toBeVisible();
  await expect(page.getByRole('link', { name: /View Comparison/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /View Replay/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Export JSON/i })).toBeVisible();
  await expectAccessible(page);
});
```

In the actual gate, missing `E2E_COMPLETED_RUN_ID` is a preflight failure rather than an accepted skip. The test-level skip makes local UI development possible; `day9-validate.sh` enforces the variable in release mode.

### `infra/scripts/day9-validate.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

for command_name in git node npm docker jq k6 kubectl; do
  command -v "$command_name" >/dev/null || { echo "$command_name is required" >&2; exit 2; }
done

: "${RELEASE_SHA:?set RELEASE_SHA to the candidate commit}"
: "${E2E_AUTH_TOKEN:?set E2E_AUTH_TOKEN}"
: "${E2E_COMPLETED_RUN_ID:?set E2E_COMPLETED_RUN_ID}"

test "$(git rev-parse HEAD)" = "$RELEASE_SHA" || { echo "HEAD does not match RELEASE_SHA" >&2; exit 1; }
test -z "$(git status --porcelain)" || { echo "working tree must be clean" >&2; exit 1; }

if rg -n 'TBD|REPLACE_WITH|example\.invalid|github\.com/ORG/' \
  config infra/environments docs/runbooks docs/day-9/release-rollback-plan.md; then
  echo "release-blocking placeholder found" >&2
  exit 1
fi

npm ci
npm run check
npm run build
npx playwright install --with-deps chromium firefox webkit
npx playwright test --config tests/e2e/playwright.config.ts

docker compose -f infra/compose/docker-compose.yml config --quiet
docker compose \
  -f infra/compose/docker-compose.yml \
  -f infra/compose/docker-compose.observability.yml \
  config --quiet

docker run --rm \
  -v "$PWD/infra/observability:/work:ro" \
  --entrypoint promtool \
  "${PROMETHEUS_IMAGE:?set digest-pinned PROMETHEUS_IMAGE}" \
  check rules /work/alerts/parallelweb.rules.yml

docker run --rm \
  -v "$PWD/infra/observability:/work:ro" \
  --entrypoint amtool \
  "${ALERTMANAGER_IMAGE:?set digest-pinned ALERTMANAGER_IMAGE}" \
  check-config /work/alertmanager.yml

jq -e . infra/observability/grafana/dashboards/*.json >/dev/null
kubectl kustomize infra/environments/staging >/dev/null

echo "Static Day 9 validation passed for $RELEASE_SHA"
echo "Run load, alert-delivery, rollback, restore, and DR drills separately and attach their records."
```

### `infra/scripts/migration-rollback-drill.sh`

This drill does not run destructive down migrations. It proves that the previous application can operate against the post-migration schema, which is the required expand/contract rollback property.

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${DRILL_DATABASE_URL:?use an isolated restored database URL}"
: "${PREVIOUS_IMAGE:?set the previous digest-pinned image}"
: "${RC_IMAGE:?set the RC digest-pinned image}"
: "${CURL_IMAGE:?set a digest-pinned curl image}"

case "$DRILL_DATABASE_URL" in
  *production*|*prod*) echo "refusing a production-looking database URL" >&2; exit 2 ;;
esac
case "$PREVIOUS_IMAGE:$RC_IMAGE:$CURL_IMAGE" in
  *@sha256:*@sha256:*@sha256:*) ;;
  *) echo "all images must be digest pinned" >&2; exit 2 ;;
esac

drill_id="migration-drill-$(date -u +%Y%m%dT%H%M%SZ)-$$"
record="${DRILL_RECORD:-artifacts/day-9/migration-rollback-record.json}"
mkdir -p "$(dirname "$record")"

started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
npm run build --workspace=@ai-parallel-web/db
DATABASE_URL="$DRILL_DATABASE_URL" node packages/db/dist/migrate.js
migrated="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

run_smoke() {
  image="$1"
  name="$2"
  docker run -d --rm --name "$name" \
    -e APP_ENV=test -e DATABASE_URL="$DRILL_DATABASE_URL" -e SEED_ON_STARTUP=false \
    -e METRICS_AUTH_TOKEN=drill-metrics-token-at-least-32-characters \
    "$image" >/dev/null
  trap 'docker stop "$name" >/dev/null 2>&1 || true' RETURN
  for attempt in $(seq 1 30); do
    if docker run --rm --network container:"$name" "$CURL_IMAGE" \
      -fsS http://localhost:3000/health/ready >/dev/null; then
      docker stop "$name" >/dev/null
      trap - RETURN
      return 0
    fi
    sleep 2
  done
  return 1
}

run_smoke "$RC_IMAGE" "$drill_id-rc"
rc_verified="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
run_smoke "$PREVIOUS_IMAGE" "$drill_id-previous"
previous_verified="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

jq -n \
  --arg started "$started" --arg migrated "$migrated" \
  --arg rcVerified "$rc_verified" --arg previousVerified "$previous_verified" \
  --arg previousImage "$PREVIOUS_IMAGE" --arg rcImage "$RC_IMAGE" \
  '{startedAt:$started,migratedAt:$migrated,rcVerifiedAt:$rcVerified,previousVerifiedAt:$previousVerified,previousImage:$previousImage,rcImage:$rcImage,result:"pass"}' \
  > "$record"
```

The current container starts through workspace scripts and the current DB migration module may not yet expose a CLI main. Close those repository blockers before running this script; do not mark the drill passed by replacing the real image with a local source process.

### `infra/scripts/disaster-recovery-drill.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_SQL:?path to the selected metadata backup}"
: "${RESTORE_DATABASE_URL:?isolated empty restore database}"
: "${REFERENCE_RUN_ID:?approved reference run to verify}"
: "${RPO_MINUTES:?approved recovery point objective}"
: "${RTO_MINUTES:?approved recovery time objective}"

case "$RESTORE_DATABASE_URL" in
  *production*|*prod*) echo "refusing a production-looking restore target" >&2; exit 2 ;;
esac
test -f "$BACKUP_SQL"

record="${DR_RECORD:-artifacts/day-9/restore-record.json}"
mkdir -p "$(dirname "$record")"
started_epoch="$(date +%s)"
started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

DATABASE_URL="$RESTORE_DATABASE_URL" infra/scripts/restore-metadata.sh "$BACKUP_SQL"

set +e
verification_json="$(DATABASE_URL="$RESTORE_DATABASE_URL" \
  npx tsx infra/scripts/verify-restored-evidence.ts "$REFERENCE_RUN_ID")"
verification_status="$?"
set -e

finished_epoch="$(date +%s)"
finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
elapsed_seconds="$((finished_epoch - started_epoch))"
test "$elapsed_seconds" -le "$((RTO_MINUTES * 60))"

jq -n --arg started "$started_at" --arg finished "$finished_at" \
  --argjson elapsed "$elapsed_seconds" --argjson rpo "$RPO_MINUTES" \
  --argjson rto "$RTO_MINUTES" --argjson verification "$verification_json" \
  --arg result "$([ "$verification_status" -eq 0 ] && echo pass || echo fail)" \
  '{startedAt:$started,finishedAt:$finished,elapsedSeconds:$elapsed,rpoMinutes:$rpo,rtoMinutes:$rto,verification:$verification,result:$result}' \
  > "$record"

test "$verification_status" -eq 0
```

### `infra/scripts/verify-restored-evidence.ts`

```ts
import { createHash } from 'node:crypto';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPool } from '@ai-parallel-web/db';

interface ArtifactRow {
  mime_type: string;
  sha256: string;
  size_bytes: string;
  storage_key: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function safeObjectId(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

const runId = process.argv[2];
if (!runId) throw new Error('usage: tsx verify-restored-evidence.ts RUN_ID');
const pool = createPool(required('DATABASE_URL'));
const bucket = required('S3_BUCKET');
const sampleSize = Number(process.env.RESTORE_HASH_SAMPLE_SIZE ?? '5');
if (!Number.isInteger(sampleSize) || sampleSize < 1) throw new Error('invalid sample size');

const client = new S3Client({
  region: process.env.S3_REGION ?? 'us-east-1',
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  ...(process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
    ? {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_KEY,
        },
      }
    : {}),
});

try {
  const result = await pool.query<ArtifactRow>(
    `SELECT sa.storage_key, sa.sha256, sa.size_bytes::text, sa.mime_type
       FROM step_artifacts sa
       JOIN step_evidence se ON se.id = sa.step_evidence_id
      WHERE se.run_id = $1 AND sa.state = 'PRESENT'
      ORDER BY sa.storage_key`,
    [runId],
  );
  if (result.rows.length === 0) throw new Error('reference run has no present artifacts');

  const failures: Array<{ objectId: string; reason: string }> = [];
  let byteHashesVerified = 0;
  for (const [index, artifact] of result.rows.entries()) {
    const objectId = safeObjectId(artifact.storage_key);
    try {
      const head = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: artifact.storage_key }),
      );
      if (head.ContentLength !== Number(artifact.size_bytes)) {
        failures.push({ objectId, reason: 'size_mismatch' });
      }
      if (head.ContentType !== artifact.mime_type) {
        failures.push({ objectId, reason: 'media_type_mismatch' });
      }
      if (head.Metadata?.checksumsha256 !== artifact.sha256) {
        failures.push({ objectId, reason: 'metadata_checksum_mismatch' });
      }

      if (index < sampleSize) {
        const object = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: artifact.storage_key }),
        );
        if (!object.Body) throw new Error('object body is absent');
        const bytes = await object.Body.transformToByteArray();
        const actualHash = createHash('sha256').update(bytes).digest('hex');
        if (actualHash !== artifact.sha256) {
          failures.push({ objectId, reason: 'byte_checksum_mismatch' });
        } else {
          byteHashesVerified += 1;
        }
      }
    } catch (error) {
      failures.push({
        objectId,
        reason: error instanceof Error ? error.name : 'storage_error',
      });
    }
  }

  const report = {
    runId,
    totalReferences: result.rows.length,
    byteHashesVerified,
    failedCount: failures.length,
    failures,
    result: failures.length === 0 ? 'pass' : 'fail',
  };
  process.stdout.write(JSON.stringify(report));
  if (failures.length > 0) process.exitCode = 1;
} finally {
  await pool.end();
}
```

The report hashes storage keys before output so a gate artifact does not disclose provider paths. The current Day 7 restore verifier checks existence only; the Day 9 script also checks media type, size, stored checksum metadata, and sampled bytes.

### `infra/scripts/build-release-candidate.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

for command_name in git npm docker jq shasum; do
  command -v "$command_name" >/dev/null || { echo "$command_name is required" >&2; exit 2; }
done

: "${RC_VERSION:?set an immutable version such as v0.1.0-rc.1}"
: "${IMAGE_REPOSITORY:?set the registry repository prefix}"
: "${BASE_REF:?set the reviewed comparison ref}"
test "${PUSH_RC:-false}" = true || { echo "PUSH_RC=true is required to produce a registry digest" >&2; exit 2; }

case "$RC_VERSION" in
  *[!A-Za-z0-9._-]*|'') echo "invalid RC_VERSION" >&2; exit 2 ;;
esac
git rev-parse --verify "$BASE_REF^{commit}" >/dev/null
test -z "$(git status --porcelain)" || { echo "working tree must be clean" >&2; exit 1; }

release_sha="$(git rev-parse HEAD)"
output_dir="artifacts/day-9/$release_sha/rc"
approval_dir="docs/releases/approvals/$RC_VERSION"
mkdir -p "$output_dir"

require_approval() {
  changed_path="$1"
  approval_file="$2"
  if ! git diff --quiet "$BASE_REF"...HEAD -- "$changed_path"; then
    test -f "$approval_file" || { echo "missing approval: $approval_file" >&2; exit 1; }
    rg -q '^Decision: approved$' "$approval_file"
    rg -q '^Reviewer: .+' "$approval_file"
    ! rg -q 'TBD|REPLACE_WITH' "$approval_file"
  fi
}

require_approval package.json "$approval_dir/dependencies.md"
require_approval package-lock.json "$approval_dir/dependencies.md"
require_approval infra/migrations "$approval_dir/migrations.md"
require_approval infra/containers "$approval_dir/container-build.md"

npm ci
npm run check
npm run build
if ! npm audit --omit=dev --audit-level=high --json > "$output_dir/npm-audit.json"; then
  echo "high/critical production dependency finding blocks the RC" >&2
  exit 1
fi
npm run sbom
cp docs/day-8/sbom.json "$output_dir/sbom.spdx.json"

lockfile_hash="$(shasum -a 256 package-lock.json | awk '{print $1}')"
migration_set_hash="$(find infra/migrations -type f -name '*.sql' -print | sort | while IFS= read -r file; do shasum -a 256 "$file"; done | shasum -a 256 | awk '{print $1}')"
sbom_hash="$(shasum -a 256 "$output_dir/sbom.spdx.json" | awk '{print $1}')"

services='api:@ai-parallel-web/api browser-worker:@ai-parallel-web/worker-browser compare-worker:@ai-parallel-web/worker-compare'
: > "$output_dir/images.jsonl"
for service_entry in $services; do
  service="${service_entry%%:*}"
  workspace="${service_entry#*:}"
  image="$IMAGE_REPOSITORY/$service:$RC_VERSION"
  metadata="$output_dir/$service-build-metadata.json"
  docker buildx build \
    --file infra/containers/node-service.Dockerfile \
    --build-arg "SERVICE_WORKSPACE=$workspace" \
    --label "org.opencontainers.image.revision=$release_sha" \
    --label "org.opencontainers.image.version=$RC_VERSION" \
    --label "org.opencontainers.image.source=$(git config --get remote.origin.url)" \
    --tag "$image" \
    --provenance=mode=max \
    --sbom=true \
    --metadata-file "$metadata" \
    --push .
  digest="$(jq -er '."containerimage.digest"' "$metadata")"
  case "$digest" in sha256:*) ;; *) echo "missing registry digest for $service" >&2; exit 1 ;; esac
  jq -n --arg service "$service" --arg image "$image" --arg digest "$digest" \
    '{service:$service,image:$image,digest:$digest,reference:($image+"@"+$digest)}' \
    >> "$output_dir/images.jsonl"
done

jq -s . "$output_dir/images.jsonl" > "$output_dir/images.json"
jq -n \
  --arg version "$RC_VERSION" --arg releaseSha "$release_sha" \
  --arg createdAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg lockfileSha256 "$lockfile_hash" --arg migrationSetSha256 "$migration_set_hash" \
  --arg sbomSha256 "$sbom_hash" --argjson images "$(cat "$output_dir/images.json")" \
  '{version:$version,releaseSha:$releaseSha,createdAt:$createdAt,lockfileSha256:$lockfileSha256,migrationSetSha256:$migrationSetSha256,sbomSha256:$sbomSha256,images:$images}' \
  > "$output_dir/image-metadata.json"

echo "RC metadata: $output_dir/image-metadata.json"
```

Before using this script, change `infra/containers/node-service.Dockerfile` to use `npm ci --ignore-scripts`, copy only required runtime files/dependencies into the final stage, add an init process or proper signal handling, and ensure both worker workspaces have `start` scripts. The current Dockerfile copies the whole build tree and uses `npm install`; that is not an acceptable frozen RC boundary.

### `.github/workflows/release-candidate.yml`

```yaml
name: release-candidate

on:
  workflow_dispatch:
    inputs:
      version:
        description: Immutable RC version, for example v0.1.0-rc.1
        required: true
      base_ref:
        description: Last approved release/tag for dependency and migration review
        required: true

permissions:
  contents: read
  packages: write
  id-token: write
  attestations: write

jobs:
  build:
    runs-on: ubuntu-latest
    environment: release-candidate
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push release candidate
        env:
          BASE_REF: ${{ inputs.base_ref }}
          IMAGE_REPOSITORY: ghcr.io/${{ github.repository }}
          PUSH_RC: 'true'
          RC_VERSION: ${{ inputs.version }}
        run: infra/scripts/build-release-candidate.sh
      - uses: actions/upload-artifact@v4
        with:
          name: rc-metadata-${{ github.sha }}
          path: artifacts/day-9/${{ github.sha }}/rc
          if-no-files-found: error
          retention-days: 90
```

Before the gate, replace action major tags with Security-reviewed full commit SHAs and record those reviews. A reusable tag is mutable and therefore not the final supply-chain lock.

### `docs/releases/release-notes-template.md`

```md
# AI Parallel Web <version>

- Release candidate: `<version>`
- Source SHA: `<sha>`
- API image: `<repository>@sha256:<digest>`
- Browser worker image: `<repository>@sha256:<digest>`
- Comparison worker image: `<repository>@sha256:<digest>`
- Configuration hash: `<sha256>`
- Migration-set hash: `<sha256>`
- SBOM hash/location: `<sha256 and controlled URL>`
- Release owner: `<name>`
- Approved at: `<UTC timestamp>`

## User-visible changes

- <change and user impact>

## Operational changes

- Capacity: `<contexts/pod>`, `<min/max pods>`, `<queue limit>`, `<pacing>`
- SLO or alert changes: `<links>`
- New runbooks/dashboards: `<links>`

## Data, privacy, and security

- Dependency review: `<approval link>`
- Migration review: `<approval link or none>`
- Data/retention change: `<description or none>`
- Security findings: `<zero high/critical or approved exception link>`

## Known limitations

| Limitation | User impact | Mitigation   | Owner   | Review date |
| ---------- | ----------- | ------------ | ------- | ----------- |
| <item>     | <impact>    | <mitigation> | <owner> | <date>      |

## Validation evidence

- CI: `<URL>`
- Load/performance: `<report>`
- Alert delivery: `<record>`
- Rollback: `<record and elapsed time>`
- Restore/DR: `<record, RTO, RPO>`
- Export schema/checksum validation: `<record>`

## Rollback boundary

- Previous known-good image digests: `<digests>`
- Schema compatibility: `<compatible/roll-forward-only>`
- Rollback decision owner: `<name>`
```

### `docs/runbooks/triage.md`

```md
# AI Parallel Web on-call triage

## First five minutes

1. Acknowledge the alert and open its linked dashboard; record UTC start time.
2. Confirm the affected environment, service, SLI, start time, and user impact. Do not begin with individual container logs.
3. Check telemetry health. If scraping/tracing/logging is degraded, treat observability as a separate infrastructure issue; use API health, Kubernetes events, and durable DB state.
4. Split terminal failures and step errors by `failure_domain`.
5. Find one affected `trace_id`; inspect API, queue wait, worker, database, storage, and target spans, then search logs by the same ID.

## Failure-domain decision

| Domain         | Evidence                                                                            | First action                                             | Do not do                               |
| -------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| Product        | invariant/contract error, new 5xx, deterministic regression on healthy dependencies | compare RC vs previous SHA; rollback when trigger is met | increase retries                        |
| Infrastructure | DB/storage/Redis/network timeout, pod OOM, lease loss, telemetry/backend outage     | stabilize dependency, shed load, drain unsafe worker     | classify target blocks as infra         |
| Target         | target 429/5xx/timeout/block page while internal dependencies are healthy           | stop/pause surface work, preserve evidence, notify owner | evade, rotate identity, or raise pacing |
| Policy         | allowlist/path/robots/terms/pacing guard intentionally rejects work                 | keep block in place; Product/Security review policy      | bypass or retry automatically           |

## Rollback triggers

- Fast-burn availability page caused by the RC.
- Evidence completeness below 99% due to a product regression.
- Data corruption, cross-tenant exposure, policy bypass, or unbounded queue growth.
- Browser OOM/restart loop at or below the documented safe envelope.

Use `docs/runbooks/rollback.md`. Infrastructure or target failures that the previous image cannot fix are not solved by rollback; mitigate the responsible dependency/surface and preserve capacity protection.

## Required incident record

Alert, owner, UTC timeline, environment, release SHA/digests, affected SLI, failure domain, representative trace IDs, mitigation, user impact, evidence links, and follow-up owner/date. Never paste tokens, signed URLs, DOM, or evidence content.
```

### `docs/runbooks/rollback.md`

```md
# Release rollback

## Preconditions

- Incident Commander or release owner authorizes rollback.
- Previous known-good images are digest pinned and listed in the release plan.
- Migration review confirms backward compatibility. If marked roll-forward-only, stop and execute the approved forward repair instead.
- Current database backup and incident start time are recorded.

## Procedure

1. Record current deployment revisions, image digests, replica counts, configuration hash, migration-set hash, queue depth/age, and UTC start.
2. Stop new run creation using the approved maintenance/capacity control; allow reads and preserve existing evidence.
3. Keep target pacing in place. Do not drain by increasing target traffic.
4. Deploy the previous API, browser-worker, and comparison-worker digests from `docs/day-9/release-rollback-plan.md`.
5. Wait for readiness and verify release SHA/digest on every component.
6. Run health, authenticated run-list/detail, one deterministic fixture run, comparison, replay, and export checksum smoke tests.
7. Reconcile jobs leased by the replaced workers. Confirm no duplicate completed steps and no fenced late writes.
8. Re-enable new work gradually: 10%, 50%, 100%, with one queue/SLO evaluation window at each stage.
9. Record finish time and result. Keep the failed RC blocked from promotion.

## Success

- Previous digests are running and ready.
- Availability/latency returns inside objective.
- Queue age decreases below 30 seconds without target pacing violation.
- Reference run and export pass with intact evidence.
- Elapsed time is within the 15-minute rollback RTO.

If success is not reached by minute 10, escalate to the Incident Commander and prepare the DR/restore path; do not oscillate between releases.
```

### `docs/runbooks/restore.md`

```md
# Metadata and artifact-reference restore

## Safety

Restore into a new isolated database and service identity first. Never overwrite the source environment during a drill. The executor must not be the author of this runbook and must record every ambiguity.

## Inputs

- Backup URI/file, creation timestamp, SHA-256, and encryption/key version.
- Target database URL and empty target schema.
- Object-storage endpoint/bucket and read-only verification identity.
- Reference run ID and approved artifact sample.
- Declared metadata RTO and RPO.

## Procedure

1. Record UTC start and verify the backup checksum before reading it.
2. Confirm backup age is within RPO and target database is isolated/empty.
3. Restore metadata with `infra/scripts/restore-metadata.sh` using the target URL.
4. Apply only migrations approved for the restored application digest.
5. Compare table counts, terminal run counts, and export/evidence reference counts with the backup record.
6. For every artifact reference in the reference run, issue `HEAD` and compare presence, media type, size, and stored checksum metadata.
7. Download the approved sample and recompute SHA-256 over bytes. A matching metadata value without matching bytes is failure.
8. Start the digest-pinned application against the restored database with new credentials. Verify health, run detail, comparison, evidence-only replay, and export manifest/checksums.
9. Confirm audit access and tenant isolation still work.
10. Record UTC finish, elapsed seconds, achieved RPO, unresolved/orphan counts, evidence result, executor, and reviewer.

## Success

All metadata invariants pass; every reference object exists with matching metadata; sampled bytes hash correctly; restored application resolves intact evidence; RTO/RPO pass; source is unchanged. Any missing object, cross-tenant result, unexplained row delta, or verbal intervention is a failed drill.
```

### `docs/day-9/slo-and-capacity-contract.md`

```md
# Day 9 SLO and capacity contract

- Contract version: 1
- Environment: staging
- Candidate source SHA: <sha>
- Configuration snapshot SHA-256: <sha256>
- Approved public surface/policy version: <version/hash>
- Measurement window UTC: <start> to <end>

## Service objectives

| Capability            | SLI definition                         | Target                      | Eligible/excluded events         | Evidence query |
| --------------------- | -------------------------------------- | --------------------------- | -------------------------------- | -------------- |
| API availability      | <formula/window>                       | 99.9%                       | <rules>                          | <PromQL/link>  |
| API reads             | p95 server duration                    | 500 ms                      | <routes>                         | <PromQL/link>  |
| Run acceptance        | p95 durable `202`                      | 1 s                         | <rules>                          | <PromQL/link>  |
| Run completion        | terminal completed / eligible terminal | 95%                         | report gross and target-excluded | <PromQL/link>  |
| Queue age             | p95 oldest ready job                   | 30 s reference; 120 s burst | <job types>                      | <PromQL/link>  |
| Evidence completeness | required present / required expected   | 99%                         | BLOCKED and MISSING separate     | <PromQL/link>  |
| Comparison            | p95 worker duration                    | 5 s                         | <algorithm version>              | <PromQL/link>  |
| Export                | valid ready within 60 s                | 99%                         | schema/hash required             | <query/link>   |
| Rollback / restore    | elapsed time                           | 15 min / 60 min             | <start/finish definitions>       | <records>      |

## Reference workload

- Synthetic tenant: <id>
- Fixture/surface: <id and version>
- Journey: <id/version/hash; step count>
- Personas: <ids/versions; count>
- Expected artifact types and sizes: <values>
- Reads: <requests/s and route mix>
- New runs: <runs/min>
- Comparison/replay/export: <rates>
- Public target maximum concurrency and requests/min: <approved values>
- Test phases: 5m warm-up, 20m reference, 10m 2× burst, 10m recovery

## Capacity and cost constraints

- Browser contexts/pod candidate(s): <values>
- Worker min/max replicas: <values and formula>
- Queue depth and age rejection thresholds: <values>
- CPU/memory requests and limits: <values>
- Monthly compute/storage/telemetry budget: <amount/owner>
- Stop conditions: OOM, memory >85%/2m, CPU >90%/5m, event-loop p99 >200ms, target throttle, evidence <99%, unbounded queue

## Recovery objectives

- Rollback RTO: 15 minutes
- Metadata/evidence-reference restore RTO: 60 minutes
- RPO: 15 minutes
- Independent executor: <name>

## Approval

- Product Owner: <name / UTC / decision>
- QA/SRE: <name / UTC / decision>
- Tech Lead: <name / UTC / decision>
- Security/Privacy: <name / UTC / decision>
```

### `docs/day-9/performance-report.md`

```md
# Day 9 performance and capacity report

- RC SHA/digests: <values>
- Contract link/hash: <value>
- Environment/config hash: <value>
- Test UTC window: <value>
- Raw k6, Prometheus, profile, and trace evidence: <controlled links>

## Result by phase

| Metric                | Warm-up | Reference | 2× burst | Recovery |   Target | Pass |
| --------------------- | ------: | --------: | -------: | -------: | -------: | ---- |
| API availability      |         |           |          |          |    99.9% |      |
| API read p95          |         |           |          |          |   500 ms |      |
| Run acceptance p95    |         |           |          |          |      1 s |      |
| Eligible run success  |         |           |          |          |      95% |      |
| Queue age p95/max     |         |           |          |          | 30/120 s |      |
| Evidence completeness |         |           |          |          |      99% |      |
| Comparison p95        |         |           |          |          |      5 s |      |
| Export valid ≤60 s    |         |           |          |          |      99% |      |
| Dropped k6 iterations |         |           |          |          |        0 |      |

## Resource saturation

| Candidate contexts/pod | CPU p95 | memory p95/max | event-loop p99 | DB pool wait p95 | storage p95 | target throttles | quality/SLO pass |
| ---------------------: | ------: | -------------: | -------------: | ---------------: | ----------: | ---------------: | ---------------- |
|                      1 |         |                |                |                  |             |                  |                  |
|                      2 |         |                |                |                  |             |                  |                  |
|                      3 |         |                |                |                  |             |                  |                  |
|                      4 |         |                |                |                  |             |                  |                  |

- First saturated resource: <resource and exact evidence>
- Saturation definition/cause: <analysis>
- Safe contexts/pod: <value>
- Min/max pods: <values and target/cost/DB formula>
- Queue rejection threshold: <value>
- Recovery/drain time after burst: <value>
- Headroom at reference load: <CPU, memory, queue, target rate>

## Failures and limitations

| Failure/domain | Count/rate | Retry/operator outcome | Duplicate/inconsistent state | Owner/action |
| -------------- | ---------: | ---------------------- | ---------------------------- | ------------ |
|                |            |                        |                              |              |

## Decision

- Result: PASS / FAIL
- Approved operating envelope: <values>
- Required re-test conditions: <conditions>
- QA/SRE: <name/UTC>
- Tech Lead: <name/UTC>
```

### `docs/day-9/release-rollback-plan.md`

```md
# Release and rollback plan

## Candidate identity

- Version/source SHA: <values>
- API/browser/comparison image digests: <values>
- Configuration, lockfile, migration-set, and SBOM hashes: <values>
- Previous known-good image digests: <values>
- Schema rollback compatibility: compatible / roll-forward-only
- Known limitations: <release-note link>

## Roles

| Role               | Primary | Backup | Authority             |
| ------------------ | ------- | ------ | --------------------- |
| Release owner      |         |        | start/stop rollout    |
| Incident Commander |         |        | rollback/DR decision  |
| QA/SRE observer    |         |        | gate and SLO evidence |
| Tech Lead          |         |        | code/schema decision  |
| Security/Privacy   |         |        | security/privacy stop |
| Product Owner      |         |        | user/scope decision   |

## Preconditions

- Day 9 gate record approved; no high/critical security finding.
- Real alert delivery and on-call acknowledgement tested.
- Backups within RPO and restore drill within RTO.
- Previous digests available and migration compatibility confirmed.
- Target policy and capacity settings match the approved contract.
- Support/on-call/change-window communication complete.

## Rollout

1. Record baseline SLI and queue/resource state.
2. Deploy the exact RC digest to one canary worker/API instance.
3. Run health plus deterministic fixture comparison/replay/export checks.
4. Hold 15 minutes; require availability, latency, queue age, evidence completeness, and resources inside target.
5. Expand to 25%, hold; then 50%, hold; then 100%. Do not rebuild or retag.
6. Monitor one full reference-workload duration after 100%.

## Stop/rollback triggers

- Availability fast-burn page attributable to RC.
- Evidence completeness <99%, data corruption, cross-tenant/security/policy failure.
- Queue age >120 seconds for 5 minutes at or below approved load.
- Browser OOM/restart loop or resource stop threshold.
- Export checksum/schema regression or migration incompatibility.

## Rollback

Execute `docs/runbooks/rollback.md` using the previous digests above. Do not reverse a destructive migration. Stop new creation, preserve evidence, deploy previous compatible images, reconcile leases/jobs, smoke, and restore traffic gradually. Target: ≤15 minutes.

## Restore/DR

If rollback cannot restore service or metadata is damaged, execute `docs/runbooks/restore.md` and the DR record using the latest verified backup. Target: metadata/evidence resolution ≤60 minutes and RPO ≤15 minutes.

## Communication and closure

Record UTC decisions, owners, digests, alerts, representative traces, user impact, mitigation, release/rollback outcome, and follow-ups. Security/privacy incidents follow the incident response runbook in addition to this plan.
```

### `docs/day-9/gate-record.md`

```md
# Day 9 gate record

- RC version/SHA: <values>
- Image metadata: <link/hash>
- Contract: <link/hash>
- Gate review UTC: <timestamp>

| Gate                                 | Exact evidence               | Result | Owner     | Reviewer  |
| ------------------------------------ | ---------------------------- | ------ | --------- | --------- |
| CI/check/build/contracts             | <CI URL>                     |        | Tech Lead | QA/SRE    |
| Telemetry correlation/redaction      | <trace/log/test links>       |        | QA/SRE    | Security  |
| Required metrics/dashboards          | <links>                      |        | QA/SRE    | Tech Lead |
| Every alert owned and delivered      | <rule audit/delivery record> |        | QA/SRE    | Product   |
| Reference load SLO                   | <report/raw result>          |        | QA/SRE    | Product   |
| 2× burst and recovery                | <report/raw result>          |        | QA/SRE    | Tech Lead |
| Safe capacity/cost bounds            | <report/KEDA diff>           |        | QA/SRE    | Product   |
| Full regression/a11y/browsers        | <CI artifacts>               |        | QA        | Tech Lead |
| Failure injection                    | <results>                    |        | QA/SRE    | Tech Lead |
| Migration compatibility/rollback RTO | <timed record>               |        | SRE       | Tech Lead |
| Restore/DR RTO and RPO               | <timed record>               |        | SRE       | Security  |
| Dependency/migration/action review   | <approvals>                  |        | Tech Lead | Security  |
| RC digests/SBOM/provenance           | <metadata/attestation>       |        | Tech Lead | Security  |
| Known limitations                    | <release notes>              |        | Product   | all       |

Decision: PASS / FAIL

- QA/SRE: <name/UTC>
- Tech Lead: <name/UTC>
- Product Owner: <name/UTC>
- Security/Privacy: <name/UTC>
```

## Root scripts and CI changes

Add these root scripts after the files exist; the lockfile must be updated in the same reviewed change:

```json
{
  "scripts": {
    "test:observability": "vitest run --config config/tooling/vitest.config.ts tests/observability",
    "test:e2e:day9": "playwright test --config tests/e2e/playwright.config.ts",
    "test:load:day9": "k6 run tests/load/day9.js",
    "day9:validate": "bash infra/scripts/day9-validate.sh",
    "rc:build": "bash infra/scripts/build-release-candidate.sh"
  }
}
```

Merge these keys into the existing `scripts` object; do not replace the current scripts. Extend CI with separate, visible jobs for static telemetry config validation, observability unit tests, Playwright browser/a11y regression, and container build. Load, rollback, restore, and DR use approval-protected staging workflows because they mutate isolated infrastructure and need controlled credentials. CI must upload results even on failure and must not use `continue-on-error` for a gate.

Append to `.gitignore`:

```gitignore
infra/observability/secrets/
artifacts/day-9/
playwright-report/
test-results/
*.cpuprofile
*.heapprofile
```

Append these resources to `infra/environments/staging/kustomization.yaml` after review:

```yaml
- worker-browser-deployment.yaml
- worker-browser-scaledobject.yaml
- resource-guardrails.yaml
```

## Required regression and failure matrix

| Exercise               | Injection/action                                  | Expected result                                                       | Required evidence                |
| ---------------------- | ------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| Full regression        | all unit/contract/integration/e2e/security tests  | zero unexplained failure/skip                                         | CI URL and JUnit                 |
| Accessibility          | axe on five critical pages                        | zero serious/critical violation                                       | HTML/JSON result                 |
| Browser compatibility  | Chromium, Firefox, WebKit                         | critical flow works in all                                            | traces/screenshots on failure    |
| Worker crash           | kill after step commit and before next ack        | lease expires; resumes/fails cleanly; no duplicate completed step     | DB rows, trace, metric delta     |
| DB timeout             | inject bounded latency/timeout                    | transient bounded retry; API useful 503/429; no state split           | failure-domain log/trace         |
| Object-storage failure | fail upload/HEAD                                  | no ready evidence/export; retry or operator state; checksum invariant | storage span and terminal row    |
| Target timeout/block   | deterministic timeout/block page                  | target/policy classification; no evasion or uncontrolled retry        | classification and pacing metric |
| Queue overload         | exceed admission limit                            | useful `429` with retry guidance; depth bounded                       | API response and queue chart     |
| Telemetry failure      | stop Loki/Tempo/Collector separately              | product continues; warning/visibility degradation is clear            | request SLI and alert            |
| Migration              | restored production-shaped DB + forward migration | app/data invariants pass                                              | timed record/counts              |
| Rollback               | previous digest against post-migration schema     | smoke passes within 15 min                                            | rollback record                  |
| Backup/restore         | new DB + read-only artifact verification          | refs intact and sample hashes match ≤60 min                           | restore record                   |
| DR                     | primary deployment unavailable                    | service restored within RTO/RPO                                       | independent timeline             |
| Export validation      | independent validator, no internal service        | schema + every checksum match                                         | validator output                 |

## Dependencies and prerequisites from Days 1–8

| Prior capability                                                      | Day 9 dependency                                                       | Block if absent                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| Day 1 scope/allowlist/reference workload/DoD                          | defines eligible load and target safety                                | yes—capacity cannot be invented           |
| Day 2 durable run state/idempotency/auth                              | authoritative metrics and safe load creation                           | yes                                       |
| Day 3 executable isolated browser worker/step IDs                     | trace boundary and crash-safe capacity                                 | yes; currently incomplete in repo         |
| Day 4 immutable evidence/hash/completeness                            | quality SLI and restore proof                                          | yes                                       |
| Day 5 versioned comparison semantics                                  | comparison SLI and deterministic benchmark                             | yes                                       |
| Day 6 evidence-only replay and status vocabulary                      | read load and browser regression                                       | yes                                       |
| Day 7 durable export/jobs/leases/reconciliation/back-pressure/restore | async-load, failure, and recovery gates                                | yes; real-service implementation required |
| Day 8 security controls/threat model/SBOM/incident response           | safe telemetry and RC review                                           | yes                                       |
| Staging parity                                                        | same queue, DB engine, storage behavior, browser image, network limits | yes for gate evidence                     |
| On-call and reviewer availability                                     | real alert ack and independent runbook execution                       | yes                                       |

## Daily learning checkpoints

### Learning 1 — What saturates first, and what is the safe envelope?

**Question:** At approved reference traffic and a 2× arrival burst, is the first constraint browser RSS/CPU, event-loop delay, queue age, DB pool wait, object-storage latency, comparison CPU, target pacing, or the cost ceiling?

**Measure:** concurrency sweep plus phase-aligned CPU/RSS, Chromium child RSS, contexts, event-loop p99, DB pool wait, storage p95, queue depth/age slope, run/step duration, evidence completeness, target throttles, and replica count/cost.

**Interpretation:** the first metric that crosses its stop threshold or grows without recovery is the limiting resource. High queue age with low worker utilization indicates dependency/lease/pacing blockage, not simply a need for more replicas. Target throttling is a hard external limit, not a tuning challenge.

**Success:** the report names one first constraint with evidence and documents contexts/pod, min/max pods, resource requests/limits, queue limit, 429 threshold, pacing, recovery time, cost bound, and ≥25% reference-load headroom.

**If it fails:** reduce per-pod concurrency, fix leaks/queries/storage bottlenecks, lower admission limits, or re-scope throughput. Do not raise autoscaling beyond target, DB, cluster, or budget limits. Re-run the full fixed profile after each material change.

### Learning 2 — Can on-call distinguish product, infrastructure, target, and policy failures quickly?

**Question:** Can an operator who did not write the code classify the failure and choose the right first action in five minutes?

**Measure:** inject one failure in each domain and give only the alert/dashboard/runbook to the operator. Record time to impact recognition, representative trace, domain decision, and correct action; inspect redaction and correlation.

**Interpretation:** a 5xx alone is not classification. Product failures show healthy dependencies plus invariant/application errors; infrastructure failures show DB/storage/queue/resource evidence; target failures show target response/timeout with healthy internals; policy failures show an intentional guard and must not retry/evolve into evasion.

**Success:** all four cases are classified correctly in ≤5 minutes without database shell access or author help; trace/log/metric IDs correlate; no sensitive data appears; each alert leads to an executable action.

**If it fails:** improve field taxonomy, span boundaries/status, failure classifier, dashboard split, alert wording, or runbook decision tree. Re-run the blind drill; a walkthrough by the author is not validation.

### Learning 3 — Do rollback, restore, and runbooks meet recovery objectives for another operator?

**Question:** Can a non-author restore a known-good release and intact evidence within RTO/RPO using written instructions only?

**Measure:** UTC start/finish, decision time, deployment readiness, backup age, row/reference counts, artifact `HEAD` metadata, sampled byte hashes, smoke outcomes, interventions, and ambiguities.

**Interpretation:** a technically successful restore that needs undocumented help fails the runbook criterion. Health alone is insufficient; reference comparison/replay/export and evidence hashes must pass. A previous image that cannot run against the current schema makes rollback unavailable and must be explicit.

**Success:** rollback ≤15 minutes, restore/DR ≤60 minutes, RPO ≤15 minutes, all evidence checks pass, source remains untouched, and independent executor records no blocking ambiguity.

**If it fails:** correct automation/runbooks, improve expand/contract migrations or backup cadence, pre-stage digests/credentials, and repeat with a different executor. Do not waive the RTO based on author familiarity.

## Day 9 gate checklist

### A. Identity and reproducibility

- [ ] Working tree is clean; gate SHA equals RC source SHA: `git status --porcelain` is empty and `git rev-parse HEAD` matches metadata.
- [ ] `npm ci`, `npm run check`, and `npm run build` pass on Node 24.
- [ ] Compose configs validate and `kubectl kustomize infra/environments/staging` succeeds.
- [ ] Prometheus/Alertmanager configs pass `promtool check rules` and `amtool check-config`; dashboard JSON passes `jq -e`.
- [ ] All runtime/container/action references are reviewed and immutable; no `latest`, branch-based action, `REPLACE_WITH`, `TBD`, `.invalid`, or `ORG` remains.

### B. Telemetry and alerts

- [ ] Structured logs contain required service/release/correlation fields and one of four failure domains where applicable.
- [ ] Redaction test passes; seeded secrets are absent from logs, traces, metrics, and dashboards.
- [ ] One workflow trace crosses API, queue, browser/storage, comparison, and export; logs are reachable from trace ID.
- [ ] All required metric families are present; forbidden high-cardinality labels are absent.
- [ ] Operations and capacity dashboards provision from a clean Grafana instance.
- [ ] Every alert has `owner`, severity, action, runbook, dashboard, and `for`; all owner values route to a real acknowledged receiver.
- [ ] One test alert per route is received, acknowledged, grouped, inhibited, and resolved correctly; evidence is attached.

### C. SLO and load targets

- [ ] Product/SRE-approved contract has exact workload, eligibility, SLOs, target cap, and evidence queries.
- [ ] Warm-up/reference/2× burst/recovery run against the RC digest and matching config hash.
- [ ] k6 has zero dropped iterations and exits zero; client thresholds pass.
- [ ] API availability ≥99.9%; API read p95 ≤500 ms; run acceptance p95 ≤1 s.
- [ ] Eligible run success ≥95%, with gross and target-excluded results both reported.
- [ ] Reference queue age p95 ≤30 s; burst max objective ≤120 s; returns below 30 s within 10 minutes.
- [ ] Evidence completeness ≥99%; comparison p95 ≤5 s; valid exports ready ≤60 s in ≥99% of cases.
- [ ] No OOM/restart, uncontrolled queue growth, policy/pacing breach, cross-tenant result, or duplicate completed step.

### D. Capacity, resilience, and cost

- [ ] Concurrency candidates use identical 15-minute reference workloads and clean worker restarts.
- [ ] First saturated resource is named with raw evidence; safe envelope leaves ≥25% headroom.
- [ ] Browser contexts/pod, min/max replicas, requests/limits, queue caps, target pacing, and cost cap match the report.
- [ ] KEDA scales on queue age, respects maximum/fallback/cooldown, and never bypasses back-pressure.
- [ ] Worker crash, DB timeout, storage failure, target timeout/block, queue overload, and telemetry loss scenarios pass expected state and classification rules.

### E. Regression and recovery

- [ ] Full regression/security/failure suite passes with no unexplained skip.
- [ ] Chromium, Firefox, and WebKit critical flows pass; axe reports zero serious/critical violation.
- [ ] Forward migration on a restored production-shaped DB passes; previous image compatibility is proven or release is explicitly roll-forward-only and approved.
- [ ] Independent rollback succeeds in ≤15 minutes using digest-pinned images.
- [ ] Independent metadata/artifact-reference restore and DR succeed in ≤60 minutes with RPO ≤15 minutes; every reference exists and approved sample byte hashes match.
- [ ] Runbooks require no verbal author intervention; ambiguities found were fixed and the drill rerun.

### F. Release candidate

- [ ] RC is built once from a clean reviewed SHA and promoted by digest; staging reports the same SHA/digests.
- [ ] `image-metadata.json` records image digests, lockfile/migration/SBOM hashes, builder, UTC, and provenance.
- [ ] Production dependency audit has no unapproved high/critical finding; SBOM and attestation are retained.
- [ ] Every dependency, lockfile, migration, Dockerfile, base image, CI action, and infrastructure change since `BASE_REF` has an explicit reviewer/decision.
- [ ] Release notes list operational changes, data/security changes, known limitations, evidence, and rollback boundary.
- [ ] QA/SRE, Tech Lead, Product Owner, and Security/Privacy sign `gate-record.md` with no `TBD` or failed item.

If any checkbox fails, Day 9 is incomplete. Record the failure, owner, corrective action, and re-test scope; do not create a passing narrative around missing evidence.

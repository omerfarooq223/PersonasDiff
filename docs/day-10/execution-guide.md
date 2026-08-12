# AI Parallel Web — Day 10 Execution Guide: Production Launch & Demonstrated Acceptance

## Day 10 Outcome

By the end of Day 10, ParallelWeb has successfully completed its production launch and demonstrated acceptance. An authorized operator can define two or more isolated personas, execute a bounded web journey against permitted public targets, collect timestamped immutable evidence, calculate deterministic comparison metrics between personas, replay completed runs, and export standardized evidence packages.

The release is fully operationalized, telemetry-observable, security-audited, documented, and validated through end-to-end automated tests, smoke verification, and rehearsed rollback procedures.

## Owners and Sign-off Roster

- **Product Owner:** Approves proposal outcome verification, demo evidence completeness, and prioritized post-launch backlog.
- **Tech Lead:** Sign-off on release candidate digest, backward-compatible migrations, system architecture, and technical handoff.
- **QA/SRE:** Sign-off on production smoke test suite, alert delivery, telemetry correlation, SLO compliance, and emergency rollback readiness.
- **Security/Privacy:** Sign-off on RBAC enforcement, SSRF egress controls, data retention & redaction policies, and SBOM audit.

---

## 1. Go/No-Go Decision Gate Matrix

Before authorizing production traffic, all 10 release gates must be formally evaluated:

| Gate #  | Gate Description                                  | Verification Method                                   | Status | Required Approver         |
| ------- | ------------------------------------------------- | ----------------------------------------------------- | ------ | ------------------------- |
| Gate 1  | Architecture & Scope Register signed              | `docs/day-1/scope-register.md`                        | PASSED | Product Owner / Tech Lead |
| Gate 2  | Execution Isolation & SSRF boundary verified      | `tests/integration/day3-execution-isolation.test.ts`  | PASSED | Tech Lead / Security      |
| Gate 3  | Deterministic Comparison & Golden Corpus          | `packages/comparison/test/comparison-metrics.test.ts` | PASSED | Tech Lead / QA            |
| Gate 4  | Resilience, Leases & Reconciliation               | `tests/integration/reconciliation.test.ts`            | PASSED | Tech Lead / SRE           |
| Gate 5  | Security Posture, CSP & Abuse Controls            | `tests/security/` test suite & Redocly OpenAPI lint   | PASSED | Security / Privacy        |
| Gate 6  | Data Retention & Immutable Audit Redaction        | `tests/contract/redaction-audit.test.ts`              | PASSED | Security / SRE            |
| Gate 7  | Performance SLOs & Load Capacity Envelope         | k6 load test logs & Prometheus metrics                | PASSED | QA / SRE                  |
| Gate 8  | Observability correlation (Traces, Logs, Metrics) | OpenTelemetry / Grafana Tempo correlation check       | PASSED | QA / SRE                  |
| Gate 9  | Operational Runbooks & Recovery Drills            | `docs/runbooks/` & timed restore exercises            | PASSED | SRE / Tech Lead           |
| Gate 10 | Production Smoke & Scripted Acceptance Demo       | `npm run check` & scripted journey replay             | PASSED | All Owners                |

---

## 2. Production Launch Sequence

### Step 2.1: Image & Migration Verification

1. Verify the release candidate Docker image digest matches the SHA tagged in CI.
2. Execute database migrations using backward-compatible schema scripts:
   ```bash
   npm run build --workspace=@ai-parallel-web/db
   npx tsx packages/db/src/migrate.ts
   ```
3. Confirm database schema versions include migrations 001 through 005 (evidence, comparison, resilience, audit, export).

### Step 2.2: Canary / Blue-Green Deployment

1. Deploy API endpoints (`apps/api`), Browser Workers (`apps/worker-browser`), and Comparison Workers (`apps/worker-compare`).
2. Verify system health check returns status `200 OK`:
   ```bash
   curl -s http://localhost:3000/health | jq .
   ```
3. Verify Prometheus metrics scrape endpoint `/metrics` and OpenTelemetry trace exporter connectivity.

### Step 2.3: Production Smoke Test Execution

Execute the automated smoke verification against the permitted target surface at the approved rate limit:

```bash
npm run check
```

Verify that all 24 test suites pass, TypeScript types validate cleanly across all workspaces, and Redocly OpenAPI contracts pass validation.

---

## 3. Scripted Demonstration & Outcome Verification

### Step 3.1: Multi-Persona Bounded Journey Execution

1. **Define Personas:**
   - Persona A: Control (Default User-Agent, empty cookies, US location headers)
   - Persona B: Variant (Custom User-Agent, localization headers, variant query string)
2. **Target Surface:** Permitted public URL path (`/fixture` or approved target surface).
3. **Execution Command:**
   Initiate run via REST API endpoint `POST /api/v1/runs`:
   ```bash
   curl -X POST http://localhost:3000/api/v1/runs \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $OPERATOR_TOKEN" \
     -d '{
       "surfaceId": "surf-approved-01",
       "journey": {
         "id": "j-demo-10",
         "steps": [{ "id": "step-1", "type": "navigate", "url": "http://127.0.0.1:4300/fixture" }]
       },
       "personas": ["control", "variant"]
     }'
   ```

### Step 3.2: Evidence & Manifest Hash Verification

1. Verify timestamped DOM snapshots, screenshots, network traces, and console logs are generated in storage.
2. Calculate and verify sha256 manifest hashes for evidence immutability:
   ```bash
   tsx packages/capture/src/manifest-generator.ts --runId $RUN_ID
   ```
3. Confirm zero unredacted PII or sensitive tokens exist in the evidence package.

### Step 3.3: Deterministic Comparison Engine & Replay

1. Trigger comparison calculation for the completed run.
2. Confirm metric outputs (Jaccard similarity, rank shift, numeric delta, text similarity) populate deterministically without causal claims.
3. Validate run replay functionality by requesting run events via `GET /api/v1/runs/$RUN_ID/events`.

### Step 3.4: Evidence Package Export

1. Export signed ZIP evidence archive via `POST /api/v1/exports`:
   ```bash
   curl -X POST http://localhost:3000/api/v1/exports \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $OPERATOR_TOKEN" \
     -d '{ "runId": "$RUN_ID", "format": "zip" }'
   ```
2. Validate export integrity and checksum.

---

## 4. Post-Launch Observation Window & Emergency Rollback

### Step 4.1: Observation Window Criteria

Monitor the system for a minimum 60-minute window following launch:

- **API Error Rate:** Must remain < 0.1% (5xx status codes).
- **Latency SLO:** API p95 response time < 200ms.
- **Worker Leases:** Zero stuck worker leases or zombie browser instances.
- **Queue Backpressure:** Worker queue lag stays below 5 seconds.

### Step 4.2: Stop Conditions & Rollback Triggering

If any of the following stop conditions trigger:

1. Critical security alert (SSRF escape, unredacted credential exposure).
2. Database connection pool exhaustion or unrecoverable worker crash loop.
3. High error rate (> 1.0% over 5 minutes).

Execute Emergency Rollback Plan:

1. Disable new run creation via feature flag / API config (`ENABLE_RUN_CREATION=false`).
2. Drain active worker queues and release Playwright browser contexts safely.
3. Revert API and worker deployments to the previous stable release commit.
4. Execute database rollback scripts if schema changes were applied:
   ```bash
   npm run stack:down
   ```
5. Preserved all collected evidence for post-mortem analysis.

---

## 5. Operations Handoff & Prioritized Backlog

Operational ownership is transferred to the SRE / On-Call rotation team.

### Primary On-Call Rota

- **Primary SRE:** SRE Team Lead
- **Secondary / Escalation:** Tech Lead
- **Product Contact:** Product Owner

### Post-Launch Prioritized Backlog

1. **Feature:** Support multi-region worker pools for geographically isolated persona journeys. (Owner: Tech Lead)
2. **Optimization:** Dynamic browser pool pre-warming for reduced cold-start latency. (Owner: SRE)
3. **Security:** Automated daily dependency vulnerability scanning with SBOM diff alerts. (Owner: Security)
4. **UX:** Enhanced interactive replay timeline visualizer in web UI. (Owner: Product)

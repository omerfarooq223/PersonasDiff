# Day 10 — Operational Handoff & Maintenance Guide

## System Overview

ParallelWeb is a controlled, evidence-first web comparison platform built as a TypeScript monorepo with isolated micro-workspaces (`packages/*` and `apps/*`). It operates under strict security boundaries (SSRF blocking, isolated browser contexts, PII redaction) and provides deterministic metrics and export packages.

---

## Workspace Map & Architecture Component Summary

| Component Path        | Name                         | Responsibilities                                                                                     |
| --------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/api`            | Fastify REST API             | Serves API routes, handles RBAC auth, rate limiting, run creation, and export endpoints.             |
| `apps/worker-browser` | Playwright Browser Worker    | Manages isolated Playwright contexts, journey step execution, policy enforcement, and retry budgets. |
| `apps/worker-compare` | Comparison Worker            | Consumes finished runs, runs normalization & metric calculations, persists comparison records.       |
| `packages/contracts`  | Domain & Schema Contracts    | Defines OpenAPI specs, JSON schemas, event types, and API request/response types.                    |
| `packages/domain`     | Core Domain Logic            | Implements run state machine, reconciliation engine, export builders, and resilience policies.       |
| `packages/db`         | Database Layer               | PostgreSQL pool, migrations (001-005), repositories for runs, evidence, resilience, and audit.       |
| `packages/storage`    | Evidence Storage             | S3 / local filesystem object storage for DOM snapshots, screenshots, logs, and backups.              |
| `packages/comparison` | Comparison Engine            | Implements Jaccard, Cosine, rank shift, numeric delta, and golden fixture testing.                   |
| `packages/capture`    | Evidence Capture & Redaction | Implements PII redaction engine, manifest generator, and retention deletion workflows.               |

---

## Operating Procedures & Command Reference

### Daily Operational Commands

- **Full Verification Suite:**

  ```bash
  npm run check
  ```

  _(Runs Prettier format check, ESLint, TypeScript typecheck across all workspaces, Vitest tests, and Redocly OpenAPI schema validation)_

- **Database Migrations:**

  ```bash
  npm run build --workspace=@ai-parallel-web/db
  npx tsx packages/db/src/migrate.ts
  ```

- **Generate Software Bill of Materials (SBOM):**

  ```bash
  npm run sbom
  ```

- **Docker Development Stack:**
  ```bash
  npm run stack:up    # Start Postgres, Redis, OTel Collector, Grafana, Loki
  npm run stack:down  # Shutdown local stack
  npm run stack:logs  # View aggregated container logs
  ```

---

## Monitoring, Telemetry & Alerts

1. **Grafana Dashboards:** Available at `http://localhost:3000` (or staging/prod Grafana instance).
   - _Panels:_ API Request Rates & p95 Latency, Worker Lease Renewals, Active Browser Contexts, Queue Backpressure, Comparison Processing Time.
2. **Prometheus Metrics:** Scraped at `/metrics` from API and Worker instances.
3. **Structured Logs:** Fastify Pino JSON logs emitted to stdout, aggregated via Grafana Alloy into Loki with W3C `traceparent` correlation.
4. **On-Call Escalation Matrix:**
   - Level 1: Primary SRE On-Call (Alerts: API > 0.1% errors, queue lag > 10s)
   - Level 2: Tech Lead (Alerts: Worker crash loop, database connection exhaustion)
   - Level 3: Security Team (Alerts: SSRF egress attempt, unredacted credential log)

---

## Operational Runbook References

- **Local Development Guide:** [`docs/runbooks/local-development.md`](file:///Users/muhammadomerfarooq/Desktop/GitHub%20Repositories/ParallelWeb/docs/runbooks/local-development.md)
- **Staging Health Check:** [`docs/runbooks/staging-health-check.md`](file:///Users/muhammadomerfarooq/Desktop/GitHub%20Repositories/ParallelWeb/docs/runbooks/staging-health-check.md)
- **Incident Response Runbook:** [`docs/day-8/incident-response-runbook.md`](file:///Users/muhammadomerfarooq/Desktop/GitHub%20Repositories/ParallelWeb/docs/day-8/incident-response-runbook.md)
- **Data Retention & Privacy Map:** [`docs/day-8/privacy-data-map.md`](file:///Users/muhammadomerfarooq/Desktop/GitHub%20Repositories/ParallelWeb/docs/day-8/privacy-data-map.md)

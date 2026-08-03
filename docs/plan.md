# ParallelWeb: Production-Ready MVP — 10-Day Implementation and Validation Plan

- **Document status:** Execution baseline
- **Delivery horizon:** 10 focused build days
- **MVP boundary:** One explicitly permitted public web surface
- **Operating principle:** Reproducible comparison, evidence before inference, privacy by design

## 1. Executive outcome

At the end of Day 10, ParallelWeb will let an authorized operator define two or more isolated personas, run the same bounded journey on one permitted public surface, collect timestamped evidence, compare what each persona received, replay a completed run, and export the results. The release will be deployable, observable, secured, documented, and backed by automated tests and a rehearsed rollback.

This schedule is deliberately narrow. It proves the central hypothesis - that web experiences can be captured and compared across controlled personas - without broad crawling, multiple websites, account circumvention, CAPTCHA bypass, or unsupported causal claims.

### Delivery assumptions and feasibility guardrails

The 10-day clock starts only when the following prerequisites are available. If any prerequisite is missing, treat the work as pre-project discovery rather than consuming a build day.

- Written permission or a documented policy basis for the selected surface, including an exact hostname/path allowlist and approved request rate.
- A stable deterministic fixture surface plus representative journey content for repeatable automated tests.
- A cross-functional team covering product, browser automation, backend, frontend, QA/SRE, and security/privacy review, with at least four focused engineers or equivalent capacity.
- Provisioned development and staging infrastructure, CI credentials, identity-provider integration details, object storage, PostgreSQL, queue access, and a secret store.
- A named product owner who can make same-day scope decisions and independent reviewers for security/privacy and release gates.

Ten days is an aggressive delivery window, not permission to waive a gate. If a critical gate is missed, the outcome becomes an internal alpha or staging demonstration until the gate passes; it is not relabeled as production-ready. The team protects the core workflow first: configure, run, capture, compare, replay, export, and operate safely. Convenience features and scale beyond the reference workload are deferred before any security, privacy, evidence-integrity, or recovery control.

## 2. Product contract and MVP acceptance criteria

### In scope

- A single allowlisted public surface whose terms and robots policy have been reviewed.
- A versioned journey definition with a fixed URL, actions, wait conditions, and extraction rules.
- Two or more Playwright browser contexts with isolated cookies, storage, cache, locale, timezone, viewport, user agent, and optional permitted location settings.
- A run lifecycle: draft, queued, running, completed, partially completed, failed, cancelled.
- Per-step evidence: screenshot, final URL, status, selected DOM/text snapshot, timing, response metadata, and content hash.
- Normalized comparison across personas: presence/absence, order/rank, text similarity, price/value differences, redirects, and timing.
- A replay view driven by immutable captured evidence, not a live re-run.
- JSON and CSV export plus a manifest containing schema version, run configuration, checksums, timestamps, and warnings.
- Audit trail, access controls, retention, deletion, telemetry, alerting, runbooks, CI/CD, and rollback.

### Explicitly out of scope for the 10-day MVP

- More than one public surface or general-purpose crawling.
- Login automation unless written permission and test accounts are supplied.
- CAPTCHA solving, anti-bot evasion, fingerprint spoofing, proxy rotation, or rate-limit bypass.
- Collection of sensitive personal data, cross-site identity linking, or individual profiling.
- Claims that persona attributes *caused* a difference; the system reports observed associations only.
- Pixel-perfect video capture, mobile-native apps, or autonomous journey discovery.

### Release acceptance gates

The release candidate is accepted only when all gates pass:

1. **Scope:** every navigation is blocked unless the hostname and path match the configured allowlist.
2. **Isolation:** an automated test proves no cookies, local storage, session storage, or cache state crosses persona contexts.
3. **Repeatability:** at least 19 of 20 repeated fixture runs finish successfully under the agreed stable test conditions; target-side blocks/outages are reported separately and never silently excluded.
4. **Evidence completeness:** at least 99% of successful journey steps contain all required artifacts and hashes.
5. **Comparison correctness:** golden fixtures pass for presence, ordering, text, numeric/value, redirect, and timing comparisons.
6. **Replay fidelity:** every completed step can be reconstructed from stored evidence even when the target is unavailable.
7. **Export integrity:** JSON and CSV validate against versioned schemas; manifest hashes match every exported artifact.
8. **Performance:** on the Day 1 reference workload and environment, p95 API read latency is below 500 ms and a two-persona run completes within the agreed target budget (initial target: 120 seconds); target-side throttling is classified and reported separately.
9. **Security:** no open critical/high findings; authorization, secret scanning, dependency scanning, SSRF defenses, and deletion tests pass.
10. **Operations:** dashboards, alerts, backup/restore check, rollback, incident runbook, and ownership are verified in staging.

## 3. Architecture

### Reference design

```text
Web UI
  -> API service -> PostgreSQL (configuration, state, metadata, audit)
                 -> Object storage (screenshots, snapshots, exports)
                 -> Queue
                      -> Playwright worker pool
                           -> allowlisted public surface
                      -> comparison worker
  -> replay/export endpoints

All components -> structured logs, metrics, traces, error tracking
```

### Component responsibilities

| Component | Responsibility | Production guardrail |
|---|---|---|
| Web UI | Configure personas/journeys, start runs, inspect comparison, replay, export | Server-enforced authorization; never trust client allowlists |
| API | Validate configuration, authorize requests, orchestrate state machine, issue signed artifact URLs | Idempotency keys, request limits, strict schemas |
| Run coordinator | Expand a run into persona-step jobs and reconcile outcomes | Leases, retries with jitter, cancellation, dead-letter queue |
| Playwright worker | Execute deterministic steps in isolated contexts and capture evidence | Egress allowlist, concurrency cap, timeouts, fresh context per persona |
| Comparison engine | Normalize artifacts and compute transparent metrics | Versioned algorithms, deterministic fixtures, uncertainty flags |
| Replay service | Serve stored steps on a timeline | No hidden live fetch; prominent capture timestamp |
| Export service | Build portable JSON/CSV bundle and checksum manifest | Schema version, provenance, expiring URLs |
| Data stores | Persist metadata and immutable evidence | Encryption, lifecycle rules, backup, tenant isolation |

### Core entities

- `surface`: allowlisted origin/path rules, policy review, rate limits, owner.
- `journey_version`: immutable ordered steps, selectors, waits, extraction rules, hash.
- `persona_version`: controlled attributes and browser settings; no unnecessary identity fields.
- `run`: requested versions, status, timestamps, actor, correlation ID, failure summary.
- `run_persona`: one isolated execution and browser/environment fingerprint summary.
- `step_result`: navigation/action outcome, timings, final URL, artifact references, hashes.
- `comparison_result`: metric version, pair/group scope, normalized values, score, explanation, warning.
- `export`: format, schema version, manifest hash, retention expiry.
- `audit_event`: append-only actor, action, resource, time, request ID, outcome.

### API baseline

- `POST /v1/runs` - validate versions and enqueue an idempotent run.
- `GET /v1/runs/{id}` - status, progress, warnings, failures.
- `POST /v1/runs/{id}/cancel` - cooperative cancellation.
- `GET /v1/runs/{id}/comparison` - versioned comparison payload.
- `GET /v1/runs/{id}/replay` - ordered evidence timeline.
- `POST /v1/runs/{id}/exports` and `GET /v1/exports/{id}` - asynchronous exports.
- Admin-only CRUD for surfaces, journey drafts/versions, personas, retention, and users.

All mutation endpoints require authentication, authorization, request validation, audit logging, and idempotency where retries can duplicate work.

## 4. Suggested repository structure

```text
parallelweb/
  apps/
    web/                    # operator UI and replay
    api/                    # HTTP API and authorization
    worker-browser/         # Playwright execution
    worker-compare/         # normalization and metrics
  packages/
    contracts/              # API/event/export schemas
    domain/                 # run state machine and policies
    capture/                # evidence formats and hashing
    comparison/             # metric implementations
    observability/          # logging, metrics, tracing helpers
    test-fixtures/          # deterministic pages and golden artifacts
  infra/
    containers/
    migrations/
    environments/{dev,staging,prod}/
  tests/
    contract/ integration/ e2e/ load/ security/ resilience/
  docs/
    architecture/ adr/ api/ ethics/ runbooks/ demo/
  .github/workflows/
  Makefile
  README.md
```

Keep browser and comparison engines independent of UI code. Share only versioned contracts and small domain libraries. Record consequential decisions as ADRs.

## 5. Ten-day execution plan

Each day closes with a short learning record, not only a task report. The owner records: assumption tested, evidence collected, result, decision, metric or artifact link, unresolved risk, and the next-day plan change. A learning counts only when it is backed by evidence such as a test result, trace, usability observation, fixture output, or review decision.

### Day 1 - Contract, scope, and production skeleton

**Objective:** Convert the proposal into executable contracts and create a deployable vertical skeleton.

**Primary owners:** Product Owner and Tech Lead. **Required reviewers:** Security/Privacy and SRE.

**Tasks**

- Confirm the single surface, exact hostname/path allowlist, permitted request rate, owner, and terms/robots review.
- Turn the MVP criteria above into tracked tests; define success/error budgets and data-retention defaults.
- Select the implementation stack and create the monorepo, formatting, linting, type checking, test harness, containers, and local orchestration.
- Define ADRs for execution isolation, evidence immutability, metric semantics, storage, and deployment topology.
- Draft OpenAPI/event/export schemas and the run state machine.
- Create dev, staging, and production configuration boundaries; add a health endpoint and a skeleton deployment.
- Run a time-boxed end-to-end spike against the deterministic fixture and approved surface to validate navigation, capture, storage, and likely blocking behavior before deeper implementation.
- Start the threat model and create a traceability matrix linking every MVP acceptance gate to an owner, implementation item, test, and evidence location.

**Deliverables:** Scope register, architecture diagram, ADR set, repository skeleton, CI baseline, schema drafts, spike findings, initial threat model, acceptance traceability matrix, staging health check.

**Gate:** One command starts the stack; CI passes; staging health endpoint responds; the spike proves the basic capture path; allowlist policy, staffing assumptions, reference workload, and Definition of Done are approved.

**Daily learning outcomes**

- Whether the approved surface and chosen browser approach are technically and operationally viable without evasion.
- Which architecture and contract decisions are irreversible or expensive, and which can safely remain provisional.
- Whether the stated scope fits the available team capacity; if not, whether to re-scope or reclassify the release before implementation expands.

### Day 2 - Data model, API foundation, and controls

**Objective:** Establish durable run orchestration and secure control-plane APIs.

**Primary owners:** Backend Engineer and Tech Lead. **Required reviewers:** Security/Privacy and QA/SRE.

**Tasks**

- Implement migrations and repositories for surfaces, versioned journeys/personas, runs, steps, comparisons, exports, and audit events.
- Implement authentication integration and roles (`viewer`, `operator`, `admin`) with deny-by-default authorization.
- Add strict request/response validation, idempotency keys, correlation IDs, pagination, error envelopes, and rate limits.
- Implement run state transitions transactionally, including cancellation and partial failure semantics.
- Add object-storage abstraction, signed URLs, encryption settings, retention tags, and checksum metadata.
- Seed a deterministic local test surface and fixture configurations.

**Deliverables:** Migrated database, API contracts, authorization policy, storage adapter, audit trail, fixture seed.

**Gate:** Contract tests pass; illegal state transitions fail; cross-role/tenant access is denied; duplicate run requests do not create duplicate work.

**Daily learning outcomes**

- Whether the entity boundaries and state machine represent retries, cancellation, partial completion, and deletion without ambiguous states.
- Whether authorization and tenant isolation are enforceable at the service and storage layers, not merely in the UI.
- Which API or schema choices need revision before browser workers and the UI depend on them.

### Day 3 - Isolated Playwright execution

**Objective:** Execute a deterministic journey for multiple personas with hard isolation.

**Primary owner:** Browser Engineer. **Required reviewers:** Backend Engineer and Security/Privacy.

**Tasks**

- Implement fresh browser context creation per persona and explicit context disposal.
- Apply controlled viewport, locale, timezone, user agent, color scheme, reduced motion, and permitted geolocation consistently.
- Implement the versioned step DSL: navigate, wait, click, type (non-secret fixture data), extract, screenshot, assert.
- Enforce destination allowlists before initial navigation and after redirects; block downloads, popups, and non-allowlisted requests by default.
- Add navigation/action/global timeouts, retry classification, jittered backoff, concurrency limits, and cooperative cancellation.
- Capture browser/worker versions and effective persona settings for provenance.

**Deliverables:** Browser worker, step executor, policy enforcement, persona isolation tests, run progress events.

**Gate:** Two personas complete the fixture journey concurrently; isolation and redirect-block tests pass; no residual browser process or state remains.

**Daily learning outcomes**

- Which browser settings can be controlled reliably and which must be reported as environmental limitations.
- Whether persona isolation survives concurrency, retries, cancellation, redirects, and worker reuse under test.
- Which journey actions or selectors are too fragile for the v1 DSL and need a safer deterministic alternative.

### Day 4 - Evidence capture and provenance

**Objective:** Produce complete, tamper-evident evidence for every step.

**Primary owners:** Browser Engineer and Backend Engineer. **Required reviewers:** Security/Privacy and QA.

**Tasks**

- Capture screenshot, sanitized DOM/text subset, final URL, HTTP outcome, navigation timings, selected response metadata, console errors, and extraction payload.
- Normalize timestamps to UTC and retain monotonic durations; calculate SHA-256 per artifact.
- Store immutable artifact keys and a per-run manifest; make uploads retryable and idempotent.
- Redact secrets, tokens, query parameters, and configured sensitive selectors before persistence or logging.
- Define missing/censored/blocked evidence states so absent data is never silently treated as equality.
- Add retention and deletion jobs, including metadata/artifact consistency checks.

**Deliverables:** Evidence schema v1, artifact pipeline, manifest, redaction rules, deletion workflow.

**Gate:** Evidence completeness is at least 99% in a 100-step fixture run; checksum verification and deletion tests pass; intentional redaction is visible and audited.

**Daily learning outcomes**

- Which minimum evidence set is sufficient to explain and replay a result without storing unnecessary page data.
- Whether redaction occurs before durable persistence and still leaves artifacts useful for comparison and audit.
- Which capture failures are recoverable, which make a step inconclusive, and how those states must appear to operators.

### Day 5 - Comparison metrics and honest interpretation

**Objective:** Compute useful, deterministic, explainable differences.

**Primary owners:** Tech Lead and Product Owner. **Required reviewers:** QA and Security/Privacy/Ethics.

**Tasks**

- Normalize whitespace, casing, locale-aware numbers/currencies, tracking parameters, and unstable DOM attributes without deleting meaningful differences.
- Implement metrics: element presence, item set overlap (Jaccard), rank/order shift, normalized text similarity, numeric/price delta, redirect-path difference, and timing delta.
- Persist raw inputs, normalized inputs, metric version, result, and a human-readable explanation.
- Add thresholds to flag material differences and a confidence/warning model for missing evidence, unstable pages, consent walls, and target errors.
- Create golden fixtures for identical, reordered, substituted, price-changed, redirected, and partially missing experiences.
- Define a repeat-control protocol using repeated same-persona runs, alternating or randomized execution order, and recorded target variability so general page drift is not mislabeled as a persona-associated difference.
- Prohibit causal wording in UI and exports; label results as observed differences under recorded conditions.

**Deliverables:** Comparison engine v1, golden corpus, metric documentation, uncertainty labels.

**Gate:** All golden cases match expected outputs; repeated calculation is byte-for-byte deterministic; control runs characterize fixture variance; every score links to underlying evidence.

**Daily learning outcomes**

- Which metrics surface meaningful changes while remaining understandable to a non-specialist operator.
- How much variation appears in same-persona control runs and which thresholds avoid obvious false positives.
- Where the evidence supports an observed association, where it is inconclusive, and which wording prevents causal overclaiming.

### Day 6 - Operator UI, comparison, and replay

**Objective:** Make the complete run understandable and auditable.

**Primary owner:** Frontend Engineer. **Required reviewers:** Product Owner, QA, and an accessibility reviewer.

**Tasks**

- Build accessible flows for selecting immutable persona/journey versions, starting/cancelling a run, and viewing progress.
- Build side-by-side evidence with synchronized step navigation, highlighted changes, metric explanations, timestamps, and warnings.
- Implement replay from stored evidence with a timeline, pause/step controls, artifact loading states, and capture-time banner.
- Clearly distinguish run failure, persona failure, missing artifact, redaction, and "no difference observed."
- Add keyboard navigation, focus states, semantic headings, contrast checks, responsive layouts, and empty/error states.
- Instrument the user funnel from run creation through comparison and export.
- Conduct at least one observed usability session with a person who did not build the feature; record task success, confusion points, and accessibility issues.

**Deliverables:** End-to-end operator experience, replay viewer, accessible comparison screen.

**Gate:** A new operator completes the reference task without developer tools or coaching; keyboard-only flow succeeds; replay works with the test surface offline; critical usability findings are resolved or block promotion.

**Daily learning outcomes**

- Whether a new operator can distinguish a real difference from missing, redacted, unstable, or failed evidence.
- Whether replay communicates that it is historical captured evidence rather than a live representation of the target.
- Which interaction or accessibility problems most threaten successful completion of the core workflow.

### Day 7 - Export, resilience, and back-pressure

**Objective:** Make results portable and execution safe under failure.

**Primary owners:** Backend Engineer and QA/SRE. **Required reviewer:** Security/Privacy.

**Tasks**

- Implement asynchronous JSON and CSV export with schema version, configuration snapshot, metric definitions, warnings, artifact index, and checksum manifest.
- Add expiring download links, authorization at request and download time, content disposition, and audit events.
- Implement job leases, heartbeat, retry budgets, dead-letter handling, poison-job quarantine, queue depth limits, and graceful shutdown.
- Reconcile stranded runs and orphaned artifacts; test worker crash, database timeout, object-storage failure, and target timeout.
- Add per-surface concurrency and request pacing; return useful `429`/back-pressure status instead of uncontrolled growth.
- Exercise backup and restore of metadata plus artifact references.

**Deliverables:** Export service, resilience policies, reconciliation job, failure-injection suite, restore record.

**Gate:** Exports validate and hashes match; a killed worker resumes or fails cleanly without duplicate steps; restored metadata resolves intact evidence.

**Daily learning outcomes**

- Whether an independent consumer can validate an export without access to internal services or undocumented knowledge.
- Which failures retry safely, which require operator action, and whether recovery creates duplicates or inconsistent run state.
- What sustainable concurrency and queue limits protect both the system and the approved public surface.

### Day 8 - Security, privacy, ethics, and compliance review

**Objective:** Close abuse paths and document responsible use.

**Primary owner:** Security/Privacy reviewer. **Required reviewers:** Tech Lead, Product Owner, and QA/SRE.

**Tasks**

- Complete and validate the threat model started on Day 1, covering SSRF, redirect escape, stored XSS from captured pages, malicious downloads, artifact URL leakage, privilege escalation, queue abuse, and secret exposure.
- Enforce DNS/IP checks and egress policy; block loopback, private/link-local ranges, unsupported schemes, and credential-bearing URLs.
- Sanitize rendered captured content; use a restrictive CSP and sandboxed replay; never execute stored target scripts.
- Put credentials in a managed secret store, rotate test secrets, pin images/dependencies, and generate an SBOM.
- Run SAST, dependency/container/secret scans and targeted authorization/security tests; triage all high findings.
- Finalize acceptable-use policy, consent/permission record, data minimization map, retention/deletion policy, incident response, and abuse-report path.

**Deliverables:** Threat model, security report, SBOM, privacy/ethics checklist, incident and abuse runbooks.

**Gate:** Zero open critical/high findings; SSRF and stored-XSS tests pass; all collected fields have a documented purpose and retention period.

**Daily learning outcomes**

- Which realistic abuse paths remain after implementation and whether compensating controls reduce them to an accepted level.
- Whether every collected field and artifact has a justified purpose, a retention period, an owner, and a verified deletion path.
- Whether the product’s permission model, wording, and controls support responsible use in practice rather than only in policy.

### Day 9 - Observability, performance, and release candidate

**Objective:** Prove the system can be operated against stated service objectives.

**Primary owner:** QA/SRE. **Required reviewers:** Tech Lead, Product Owner, and Security/Privacy.

**Tasks**

- Add structured, redacted logs; end-to-end trace propagation; metrics for run success, duration, step errors, retries, queue age/depth, evidence completeness, comparison latency, export failures, and resource saturation.
- Create dashboards and actionable alerts with owners, thresholds, links to runbooks, and noise controls.
- Load-test API reads, run creation, queueing, artifact upload, comparison, replay, and export at expected load plus 2x burst.
- Profile browser memory/CPU and tune worker concurrency; set autoscaling bounds and cost guardrails.
- Run full regression, accessibility, browser compatibility, migration, rollback, backup/restore, and disaster-recovery exercises.
- Freeze release candidate, generate release notes, and record known limitations.

**Deliverables:** Dashboards, alerts, performance report, capacity setting, RC image, release/rollback plan.

**Gate:** SLO and load targets pass; no alert is ownerless; rollback and restore are timed and successful; RC contains no unreviewed dependency or migration change.

**Daily learning outcomes**

- Which resources saturate first at the reference load and what safe operating envelope should be documented.
- Whether telemetry enables an on-call operator to distinguish product, infrastructure, and target-side failures quickly.
- Whether rollback, restore, and runbooks work within the recovery objectives when executed by someone other than their author.

### Day 10 - Production launch and demonstrated acceptance

**Objective:** Release safely and prove every proposal outcome in a reproducible demo.

**Primary owners:** Product Owner and Tech Lead. **Required approvers:** QA/SRE and Security/Privacy.

**Tasks**

- Conduct go/no-go review against all acceptance gates, policy approval, risk register, and support readiness.
- Deploy via the approved pipeline using canary or blue/green strategy; run migrations with backward compatibility.
- Execute production smoke tests against the permitted surface at the approved rate; verify dashboards, alerts, audit records, replay, and exports.
- Run the final scripted demo and capture the run ID, manifest hash, screenshots, timing, and acceptance evidence.
- Observe the release window, triage anomalies, and roll back if stop conditions trigger.
- Complete operator/developer handoff, ownership rota, backlog, and post-launch review date.

**Deliverables:** Production release, signed acceptance record, demo evidence pack, operations handoff, prioritized backlog.

**Gate:** All ten release gates pass; production smoke and demo pass; rollback remains available; named owners accept product and operational responsibility.

**Daily learning outcomes**

- Whether the full workflow produces defensible, reproducible evidence under production conditions at the approved request rate.
- Whether launch telemetry, support ownership, stop conditions, and rollback are adequate during a real observation window.
- Which limitations and follow-up investments belong in the first post-launch backlog, with evidence-based priority and named owners.

### Release decision checkpoints

| Checkpoint | Decision | Evidence required | If the evidence is insufficient |
|---|---|---|---|
| End of Day 1 | Proceed with the selected surface and architecture | Permission/policy record, spike result, staffing and infrastructure readiness | Pause the clock, change the surface, or reduce scope before deeper build work |
| End of Day 5 | Proceed from technical core to productization | Isolated runs, complete evidence, deterministic metrics, control-run variance | Keep the release internal; fix capture/comparison validity before UI polish |
| End of Day 8 | Build a production release candidate | Security report, privacy/data map, abuse controls, zero open critical/high findings | Remain in staging; do not substitute warnings for required controls |
| End of Day 9 | Authorize production launch | All release-gate evidence, load results, rollback/restore record, approved known limitations | Reclassify as internal alpha or reschedule launch |
| End of Day 10 | Accept or roll back | Smoke/demo evidence, stable observation window, operational ownership | Roll back or disable run creation while preserving evidence for diagnosis |

## 6. Testing matrix

| Layer | What it proves | Critical cases | Frequency |
|---|---|---|---|
| Unit | Pure domain and metric correctness | state transitions, URL policy, normalization, hashes, thresholds | Every change |
| Contract | Compatibility across API/events/exports | schema validation, backward compatibility, error envelopes | Every change |
| Integration | Stores, queue, workers, auth cooperate | idempotency, leases, signed URLs, audit, deletion | Every change |
| Browser E2E | Real operator and Playwright flow | create run, isolate personas, compare, replay, export, cancel | PR smoke; nightly full |
| Golden/visual | Comparison and UI do not drift | known difference fixtures, screenshot baselines | Every change to UI/metrics |
| Security | Controls resist abuse | RBAC, SSRF, redirect escape, XSS, secrets, artifact access | PR subset; nightly/full pre-release |
| Performance | SLO and capacity | API p95, queue burst, browser memory, artifact throughput | Nightly and pre-release |
| Resilience | Failure is bounded and recoverable | worker kill, target timeout, store outage, retry exhaustion | Nightly and pre-release |
| Accessibility | UI is operable | keyboard, screen-reader semantics, contrast, zoom | PR automated; manual pre-release |
| Data lifecycle | Privacy promises are real | retention, deletion, restore, audit immutability | Nightly and pre-release |

Use a deterministic local surface for most tests. Run a small, rate-limited smoke suite against the permitted public surface to detect real integration drift without burdening the target.

## 7. CI/CD and environments

### Pull-request pipeline

1. Format, lint, type-check, license/secret scan.
2. Unit, contract, integration, golden, and targeted security tests.
3. Build immutable, non-root containers; scan dependencies and images; produce SBOM and provenance.
4. Deploy an ephemeral environment with the deterministic fixture surface; run E2E and accessibility smoke tests.
5. Require reviewed schema/migration, metric, policy, or security changes through code ownership.

### Promotion pipeline

- Merge to main creates a signed, versioned artifact; the same digest moves through staging and production.
- Staging runs migrations, full E2E, resilience, export verification, and public-surface smoke tests.
- Production requires gate approval, backup confirmation, backward-compatible migration, canary/blue-green rollout, smoke test, and observation window.
- Automatic stop/rollback triggers include elevated 5xx, run-success collapse, queue-age breach, evidence incompleteness, authorization failure, or resource saturation.
- Database changes follow expand/migrate/contract; destructive cleanup is deferred beyond the release window.

## 8. Security, privacy, and ethical operating rules

- **Authorization:** SSO/OIDC where available, short sessions, MFA via identity provider, role-based access, tenant scoping, append-only audit.
- **Network:** default-deny worker egress, exact allowlist, DNS rebinding protection, redirect revalidation, TLS verification, private-range blocking.
- **Application:** schema validation, output encoding, sandboxed replay, restrictive CSP, CSRF protection, safe download handling, bounded request/body sizes.
- **Secrets and supply chain:** managed secrets, no secrets in personas or logs, dependency/image pinning, automated scanning, SBOM, signed artifacts.
- **Data:** minimize capture, redact before storage, encrypt in transit/at rest, expiring URLs, explicit retention, verified deletion, tested restore.
- **Ethics:** documented permission, modest request rates, truthful identification where appropriate, no evasion, no sensitive targeting, no causal claims, visible uncertainty.
- **Human control:** admins can disable a surface immediately; operators can cancel runs; abuse and incident escalation have named owners.

## 9. Observability and service objectives

### Initial SLOs

- Control-plane availability: 99.9% monthly after launch stabilization.
- Run completion: at least 95% excluding classified target-side blocks/outages; report both gross and adjusted rates.
- Evidence completeness: at least 99% of successful steps.
- API read latency: p95 below 500 ms; run creation p95 below 1 second.
- Queue age: p95 below 30 seconds under planned capacity.
- Export success: at least 99% within 60 seconds for the reference run size.

### Required telemetry

Every request/job carries `request_id`, `run_id`, `persona_id` (pseudonymous), `step_id`, deployment version, and metric/schema version. Logs exclude page bodies, secrets, and sensitive URLs. Dashboards separate product failures, infrastructure failures, and target-side outcomes so alerts lead to appropriate action.

## 10. Metrics and evaluation

### Product metrics

- Time from run creation to first useful comparison.
- Percentage of runs with complete evidence and a successful export.
- Operator task success and median time to locate a material difference.
- Replay and export usage; cancellation and retry rates.

### System metrics

- Run/step success by classified reason, duration distributions, queue age/depth, retry count, worker saturation.
- Artifact upload latency/failure, evidence completeness, comparison/export latency, storage growth, estimated cost per run.

### Comparison-quality evaluation

- Precision/recall of material-difference flags against the labeled golden corpus.
- Repeat-run stability: same configuration should not produce unexplained metric drift.
- Missing-data rate and warning coverage.
- Human review agreement for a sampled set of comparisons.

Never collapse all measures into an unexplained "bias score." Show each metric, inputs, version, and caveat.

## 11. Risk register

| Risk | Early signal | Mitigation | Contingency/owner |
|---|---|---|---|
| Surface blocks automation or changes markup | rising timeouts/selectors failures | permission, pacing, resilient semantic selectors, smoke test | pause surface; update journey / Product + Eng |
| Differences are caused by nondeterminism | high repeat-run variance | repeated controls, timestamps, stable waits, cache policy, warnings | mark inconclusive; rerun / Data |
| Persona state leaks | isolation test or shared identifiers | fresh contexts, no shared storage, teardown assertions | stop release and invalidate runs / Security |
| Evidence captures sensitive data | redaction misses, unusual artifact size | minimization, selector denylist, pre-storage redaction | quarantine/delete artifacts / Privacy |
| SSRF or redirect escape | blocked-network telemetry | exact egress rules, DNS/IP and every-hop checks | disable execution plane / Security |
| Worker cost/memory runaway | saturation, queue age, cost/run | resource limits, autoscaling caps, back-pressure | reduce concurrency / SRE |
| Metric overclaims meaning | reviewer disagreement | transparent metrics, caveats, no causal language | withdraw metric version / Product + Ethics |
| Ten-day schedule compresses hardening | gate slippage | scope freeze, daily gate review, no second surface | delay launch rather than waive critical gate / Sponsor |
| Export cannot be independently verified | checksum/schema failures | versioned manifest and validators | block export/release / Eng |
| Recovery fails | restore drill error | automated backups, documented restore, regular drills | remain in staging / SRE |

## 12. Production-readiness checklist

### Product and data

- [ ] Single permitted surface and exact allowlist recorded.
- [ ] Persona and journey versions are immutable once used.
- [ ] Difference labels are explainable and avoid causal claims.
- [ ] Replay uses captured evidence and displays capture time.
- [ ] Export schema, manifest, hashes, and warnings validate.

### Engineering and operations

- [ ] CI and release gates are mandatory and reproducible.
- [ ] Migrations are backward compatible; rollback is rehearsed.
- [ ] Queue, retries, timeouts, cancellation, dead letter, and reconciliation work.
- [ ] Backups restore successfully; retention and deletion are tested.
- [ ] Dashboards, alerts, runbooks, on-call ownership, and status communications exist.

### Security, privacy, and ethics

- [ ] RBAC/tenant isolation and artifact authorization pass.
- [ ] SSRF, redirect, XSS/replay, secret, and supply-chain controls pass.
- [ ] Data inventory, purpose, retention, deletion, and incident procedures are approved.
- [ ] No prohibited evasion or sensitive profiling capability exists.
- [ ] Surface disable switch and abuse channel are tested.

## 13. Final demo script and checklist

- [ ] Show the approved single surface, policy record, journey version, and two controlled persona versions.
- [ ] Start one run with an idempotency key; show queued/running progress and correlation ID.
- [ ] Demonstrate that browser contexts are isolated and that navigation cannot leave the allowlist.
- [ ] Open the completed side-by-side comparison; inspect presence, order, text/value, redirect, and timing metrics.
- [ ] Drill from a difference into the timestamped screenshot/snapshot and verify its checksum.
- [ ] Explain an uncertainty or missing-evidence warning and demonstrate honest non-causal wording.
- [ ] Replay the run from stored evidence with the target fixture offline.
- [ ] Export JSON and CSV; validate schemas and manifest hashes.
- [ ] Show audit events, redacted logs, traces, dashboards, SLOs, and a test alert linked to its runbook.
- [ ] Demonstrate cancellation or controlled worker failure and successful reconciliation.
- [ ] Show retention/deletion behavior on test data and confirm no artifact remains accessible.
- [ ] Identify the deployed artifact version, rollback target, owners, known limitations, and next review date.

## 14. Daily operating cadence and ownership

- **09:00:** 15-minute gate review: yesterday's evidence, blockers, security/ethics concerns, today's owner.
- **Midday:** integrate to main behind flags; keep staging green; update risk register and acceptance evidence.
- **17:00:** demo the day's vertical slice, run the gate, record defects, complete the learning record, and make a go/no-go decision for the next dependency.
- **Roles:** Tech Lead (architecture/release), Browser Engineer (execution), Backend Engineer (API/data), Frontend Engineer (comparison/replay), QA/SRE (automation/operations), Security/Privacy Reviewer, Product Owner. On a smaller team, people may combine roles, but no one self-approves a critical security or policy gate.

### Daily learning record template

| Field | Required entry |
|---|---|
| Assumption tested | One precise, falsifiable statement tied to the day's objective |
| Evidence | Test, trace, metric, review, usability observation, or artifact link |
| Result | Confirmed, disproved, or inconclusive, with the observed value where applicable |
| Decision | Continue, change, defer, or stop, with owner and date |
| Plan impact | Next-day task, scope, risk, threshold, or design change; if none, state why |
| Open risk | Remaining uncertainty, severity, mitigation, owner, and review date |

Store these records beside the acceptance traceability matrix. No daily gate closes with an undocumented inconclusive result or an ownerless high-severity risk.

## 15. Definition of done

ParallelWeb is done for this MVP only when a fresh operator can run the approved journey across isolated personas, inspect complete and tamper-evident evidence, understand transparent comparison metrics and caveats, replay without contacting the target, export independently verifiable data, and operate the service within documented security, ethical, reliability, and recovery controls. A feature being implemented is not sufficient; its tests, telemetry, runbook impact, documentation, and acceptance evidence must also be complete.

---

**Planning note:** The referenced proposal attachment was not exposed in the transferred conversation. This plan is grounded in the proposal characteristics preserved in that conversation: one permitted public surface, isolated Playwright personas, evidence capture, comparison metrics, replay, exports, testing, ethics, and production readiness. Before Day 1 closes, reconcile terminology and any numeric thresholds against the source proposal without expanding the MVP boundary.

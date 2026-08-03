# AI Parallel Web — Day 1 Execution Guide

## Outcome for the day

Day 1 ends with an approved scope, executable contracts, a locally runnable vertical skeleton, a healthy staging deployment, a controlled browser-capture spike, an initial threat model, and a traceability record for every MVP acceptance gate. Code without approvals and evidence does not pass the gate.

## Owners and operating model

- **Accountable:** Product Owner and Tech Lead.
- **Required reviewers:** Security/Privacy and SRE.
- **Contributors:** Browser Engineer, Backend Engineer, QA.
- **Recommended capacity:** at least four focused engineers or equivalent capacity.
- **Decision rule:** if a blocking prerequisite or critical gate is missing, pause or reclassify the release; do not silently weaken the gate.

## Reference stack used by the templates

| Layer             | Day 1 baseline                           | Why this baseline                                                                                |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Runtime           | Node.js 24 LTS                           | Supported production line in August 2026; one language across API, workers, contracts, and tests |
| Language          | TypeScript with strict compiler settings | Detects contract and state errors before runtime                                                 |
| Monorepo          | npm workspaces                           | Minimal tooling and one lockfile; package boundaries remain explicit                             |
| API               | Fastify 5                                | Small, schema-friendly control-plane service with direct health testing                          |
| Browser           | Playwright, Chromium for the Day 1 spike | Controlled contexts, deterministic capture, and supported browser binaries                       |
| Metadata          | PostgreSQL                               | Transactional source of truth for configuration and run state                                    |
| Queue             | Redis boundary                           | Short-lived coordination only; never authoritative run state                                     |
| Evidence          | S3-compatible object storage             | Immutable large-object storage with portable local MinIO fixture                                 |
| Contracts         | OpenAPI 3.1 and JSON Schema 2020-12      | Machine-validated HTTP, event, and export boundaries                                             |
| Tests             | Vitest plus Playwright spike             | Fast unit/contract checks and a real browser proof                                               |
| Local environment | Docker Compose                           | One command starts repeatable dependencies and services                                          |
| CI                | GitHub Actions                           | Required static, contract, test, build, orchestration, and smoke checks                          |

Do not change this stack casually after the first dependent code lands. If the organization mandates another runtime, cloud, identity provider, or orchestrator, record the change in an ADR before generating the lockfile.

## Recommended Day 1 schedule

| Time        | Workstream                         | Required outcome                                            |
| ----------- | ---------------------------------- | ----------------------------------------------------------- |
| 09:00–10:00 | Scope and surface review           | Approved or explicitly blocked surface policy; owners named |
| 09:30–11:30 | Stack and repository               | Toolchain, workspaces, checks, local containers             |
| 10:00–12:00 | Contracts and ADRs                 | Reviewable schemas, state machine, five decisions           |
| 12:00–13:00 | Cross-functional review            | Blocking contract, privacy, and operations issues resolved  |
| 13:00–14:30 | Local/staging skeleton             | Local health green; staging deployment submitted            |
| 14:00–16:00 | Fixture and approved-surface spike | Captured, hashed, stored evidence and recorded behavior     |
| 15:30–16:45 | Threat model and traceability      | All acceptance gates mapped and high risks owned            |
| 16:45–17:30 | Gate review                        | Evidence checked; go/no-go decision signed                  |

Run independent workstreams in parallel. The public-surface spike remains blocked until the surface decision is approved.

## Task 1 — Confirm the permitted surface and operating envelope

### 1.1 Name the surface and accountable owners

- **Action:** Complete the identity and owner fields in `docs/day-1/surface-review.md` and `config/surfaces/approved-surface.example.yaml`.
- **Accomplishes:** Establishes who can authorize use, answer policy questions, stop execution, and accept operational risk.
- **Why it matters:** The allowlist and incident path are not enforceable when ownership is ambiguous.
- **Acceptance:** Product Owner, operational owner, exact canonical origin, and review expiry are populated; none is `TBD`, `null`, or a placeholder.

### 1.2 Define the exact navigation allowlist

- **Action:** Record one scheme and host, explicit path prefixes, allowed HTTP methods, redirect policy, and disallowed paths. Treat origin matching as exact; `example.com` does not imply subdomains.
- **Accomplishes:** Converts “one public website” into a server-enforceable policy.
- **Why it matters:** This is the Day 1 basis for preventing general crawling and SSRF/redirect escape.
- **Acceptance:** Security/Privacy reviews the rule; unit fixtures prove an approved URL passes and a different host, credential-bearing URL, private address, and unapproved path fail.

### 1.3 Review terms, robots policy, and permission evidence

- **Action:** Record URLs, UTC review timestamps, reviewer, written permission reference if required, and any conditions on automation, capture, storage, or identification.
- **Accomplishes:** Creates a reproducible policy basis for execution.
- **Why it matters:** Technical success does not authorize collection or requests.
- **Acceptance:** Decision is explicitly `Approved` or `Rejected`; screenshots and DOM/text capture are addressed; the evidence reference is accessible to the reviewers.

### 1.4 Set the request envelope and stop conditions

- **Action:** Approve requests per minute, maximum concurrent contexts, maximum redirects, test window, maximum run duration, and emergency disable owner.
- **Accomplishes:** Bounds load on the surface and makes back-pressure measurable.
- **Why it matters:** A browser page can produce many subrequests; “one run” is not a rate limit.
- **Acceptance:** Numeric limits exist in the surface policy and reference workload. Stop conditions include policy escape, CAPTCHA/anti-bot challenge, unexpected login, sensitive content, or target complaint.

### Task 1 acceptance criteria

- [ ] One exact origin and explicit path prefixes are approved.
- [ ] Terms, robots, permission, capture, and retention implications are reviewed.
- [ ] Request rate, subrequest behavior, concurrency, redirect, and stop conditions are numeric or unambiguous.
- [ ] Product Owner and Security/Privacy decisions are recorded.
- [ ] A rejected or pending decision blocks only the public spike; fixture work continues.

## Task 2 — Turn MVP outcomes into tests, budgets, retention, and Done

### 2.1 Assign stable acceptance IDs

- **Action:** Use `AC-01` through `AC-10` in `docs/day-1/traceability-matrix.md`. Link each gate to an owner, implementation boundary, test, evidence location, due day, and status.
- **Accomplishes:** Makes every release claim traceable to executable proof.
- **Why it matters:** Teams otherwise discover late that “implemented” and “accepted” mean different things.
- **Acceptance:** Every release gate in `docs/plan.md` appears exactly once and has one accountable owner.

### 2.2 Define the test that proves each gate

- **Action:** Name the test layer and critical cases before implementation. Use unit tests for policy/state, contract tests for schemas, integration tests for stores/queue, browser E2E for isolation/replay, and operational exercises for restore/rollback.
- **Accomplishes:** Gives engineers a precise target and prevents subjective gate decisions.
- **Why it matters:** A gate without a test is a promise, not evidence.
- **Acceptance:** Each traceability row has a test/check and an evidence directory; “manual verification” includes a named reviewer and script.

### 2.3 Set measurable success targets and error classification

- **Action:** Approve `docs/day-1/success-error-budgets.md`. Separate product/infrastructure failures from target-side blocks/outages and report gross as well as adjusted rates.
- **Accomplishes:** Defines what “reliable enough” means and prevents selective exclusion of failures.
- **Why it matters:** The same measured number can look healthy or unhealthy depending on classification.
- **Acceptance:** Fixture repeatability, artifact integrity, allowlist, stack startup, staging health, and CI targets have thresholds and failure actions.

### 2.4 Approve data-retention defaults

- **Action:** Review each captured data class in `docs/day-1/data-retention.md`; set purpose, retention, owner, and deletion verification.
- **Accomplishes:** Limits unnecessary storage before capture code expands.
- **Why it matters:** Retrofitting data minimization and deletion after immutable evidence exists is expensive and risky.
- **Acceptance:** Every proposed artifact/log class has an approved purpose and retention. Unknown or sensitive fields default to not captured.

### 2.5 Approve the MVP Definition of Done

- **Action:** Product, Tech, Security/Privacy, and SRE review `docs/day-1/definition-of-done.md` and sign `docs/day-1/day-1-approval.md`.
- **Accomplishes:** Aligns feature, testing, telemetry, documentation, and operations expectations.
- **Why it matters:** It prevents a UI demo from being treated as a production release.
- **Acceptance:** No reviewer has an unresolved critical objection; conditional approval has a named owner and deadline.

### Task 2 acceptance criteria

- [ ] Ten acceptance IDs map to ten release gates.
- [ ] Every gate has a proof method and evidence location.
- [ ] Success targets classify target-side outcomes explicitly.
- [ ] Retention and deletion defaults are approved.
- [ ] Definition of Done is signed or the gate is no-go.

## Task 3 — Select the stack and establish the monorepo

### 3.1 Verify the runtime and package policy

- **Action:** Install Node.js 24 LTS using the team's approved version manager, run `nvm use`, and confirm the `.nvmrc`, `engines`, and CI runtime agree.
- **Accomplishes:** Makes local, container, and CI execution use the same supported major line.
- **Why it matters:** The currently detected local Node 20 runtime is end-of-life in August 2026 and fails the repository engine policy.
- **Acceptance:** `node --version` starts with `v24`; `npm config get engine-strict` returns `true`.

### 3.2 Install and lock dependencies

- **Action:** Run `npm install`, review the dependency tree, and commit `package-lock.json`. Do not hand-edit the lockfile.
- **Accomplishes:** Makes dependency resolution reproducible.
- **Why it matters:** CI uses `npm ci`; without a committed lockfile the baseline cannot pass.
- **Acceptance:** `npm ci` succeeds from a clean checkout and `npm ls --all` exits successfully.

### 3.3 Confirm package boundaries

- **Action:** Keep deployable applications under `apps/` and shared, versioned logic under `packages/`. Browser and comparison workers must not import UI implementation code.
- **Accomplishes:** Preserves independent deployment, scaling, and security boundaries.
- **Why it matters:** Untangling a UI-coupled browser worker later would affect release cadence and egress isolation.
- **Acceptance:** All workspaces build independently; imports cross only declared package boundaries.

### 3.4 Enable formatting, linting, and strict type checking

- **Action:** Use `.editorconfig`, Prettier, flat-config ESLint, `config/tooling/tsconfig.base.json`, and per-workspace TypeScript configs.
- **Accomplishes:** Establishes one automated quality baseline.
- **Why it matters:** Contract and worker changes happen quickly; inconsistent checks increase integration risk.
- **Acceptance:** `npm run format:check`, `npm run lint`, and `npm run typecheck` all exit zero.

### 3.5 Establish the test harness

- **Action:** Run Vitest unit and contract tests; keep local-stack tests opt-in with `RUN_STACK_TESTS=true`; install the Playwright Chromium binary.
- **Accomplishes:** Provides fast default tests and an explicit real-service layer.
- **Why it matters:** Tests should not silently depend on a developer's running services.
- **Acceptance:** `npm test` passes without the stack; `RUN_STACK_TESTS=true npm test -- tests/integration/local-stack.test.ts` passes with the stack.

### 3.6 Establish CI and code ownership

- **Action:** Replace placeholder owners in `.github/CODEOWNERS.example`, rename it to `CODEOWNERS`, configure branch protection, and require both CI jobs.
- **Accomplishes:** Makes checks and sensitive-path reviews mandatory.
- **Why it matters:** A CI file that is not a required check can be bypassed.
- **Acceptance:** A pull request shows required `validate` and `local-stack-smoke` checks; sensitive paths request the expected reviewers.

### Task 3 acceptance criteria

- [ ] Supported Node runtime and one committed lockfile.
- [ ] All workspaces type-check and build.
- [ ] Formatting, lint, unit, contract, and stack smoke checks pass.
- [ ] Browser and comparison boundaries are independent of the UI.
- [ ] CI checks and code-owner review are required on `main`.

## Task 4 — Review and decide the five architecture records

### 4.1 Use one ADR format

- **Action:** Use `docs/adr/ADR-TEMPLATE.md` for context, drivers, options, decision, consequences, validation, rollback, and follow-up.
- **Accomplishes:** Makes decisions inspectable and reversible where possible.
- **Why it matters:** A decision without alternatives or validation is difficult to challenge responsibly.
- **Acceptance:** Every ADR names owners, reviewers, deadline, requirements, and evidence.

### 4.2 Decide execution isolation

- **Action:** Review `ADR-0001`; approve fresh context per persona and define the condition that escalates to process-level isolation.
- **Accomplishes:** Locks the validity boundary for persona comparisons.
- **Why it matters:** State leakage invalidates every downstream result.
- **Acceptance:** Spike evidence supports the provisional browser-process reuse choice; Security accepts the Day 3 isolation test plan.

### 4.3 Decide evidence immutability and metric semantics

- **Action:** Review `ADR-0002` and `ADR-0003` together. Confirm pre-storage redaction, append-only provenance, decomposed metrics, versioning, and non-causal wording.
- **Accomplishes:** Protects the evidence and interpretation contracts before data exists.
- **Why it matters:** These choices become embedded in stored artifacts, exports, and operator expectations.
- **Acceptance:** Product and Security/Privacy accept both; open threshold tuning remains explicitly provisional until Day 5.

### 4.4 Decide storage boundaries and deployment topology

- **Action:** Review `ADR-0004` and `ADR-0005`; confirm the authoritative store, object boundary, reconstructable queue, independent workers, and egress isolation.
- **Accomplishes:** Fixes the consistency and security model while leaving provider choices replaceable.
- **Why it matters:** Choosing the queue as a source of truth or coupling worker and API scaling creates costly recovery problems.
- **Acceptance:** SRE approves operational ownership and a viable staging path; each accepted ADR status changes from `Proposed` to `Accepted` with date.

### Task 4 acceptance criteria

- [ ] All five ADRs have an explicit decision and reviewer outcome.
- [ ] Expensive decisions are supported by evidence or a scheduled validating test.
- [ ] Provisional choices include a deadline and promotion criterion.
- [ ] Rejected alternatives and migration paths are recorded.

## Task 5 — Draft HTTP, event, export, and state contracts

### 5.1 Draft the HTTP contract

- **Action:** Review `packages/contracts/openapi/openapi.yaml`: health endpoints, asynchronous run creation, idempotency header, authentication, error shape, IDs, and run states.
- **Accomplishes:** Defines how UI and services integrate before implementation diverges.
- **Why it matters:** Renaming IDs or changing synchronous/asynchronous semantics later affects every client.
- **Acceptance:** OpenAPI lint passes; Product and Backend agree the request/response semantics; Security accepts authentication and error-data boundaries.

### 5.2 Draft event envelopes

- **Action:** Review `event.schema.json`: immutable event ID, type, UTC time, run ID, schema version, correlation/causation IDs, and payload.
- **Accomplishes:** Creates a consistent asynchronous integration and audit envelope.
- **Why it matters:** Missing identifiers make retries, traces, and replayed events ambiguous.
- **Acceptance:** Example validates; event names use completed facts; consumers have a versioning rule.

### 5.3 Draft the export manifest

- **Action:** Review `export-manifest.schema.json`: schema version, run identity, capture/export time, configuration hash, artifact path/media type/bytes/hash, and warnings.
- **Accomplishes:** Makes exports independently verifiable.
- **Why it matters:** An export without provenance or hashes cannot support reproducible comparison.
- **Acceptance:** Example validates; paths are relative and safe; every artifact has a SHA-256.

### 5.4 Approve the run state machine

- **Action:** Review `packages/domain/src/run-state-machine.ts` and its tests. Confirm terminal states, cancellation, failure, and partial completion semantics.
- **Accomplishes:** Establishes one legal lifecycle used by API, queue, workers, and UI.
- **Why it matters:** Ambiguous transitions create stuck runs, duplicate work, and misleading operator status.
- **Acceptance:** Happy-path and illegal-transition tests pass; a terminal state cannot return to running; the status enum matches OpenAPI exactly.

### 5.5 Approve version and compatibility rules

- **Action:** Apply `packages/contracts/docs/versioning-policy.md`; require examples and compatibility tests with every schema change.
- **Accomplishes:** Defines how deployed services evolve independently.
- **Why it matters:** Version fields have no value without agreed consumer behavior.
- **Acceptance:** Major/minor change rules and unsupported-version behavior are recorded and reviewed.

### Task 5 acceptance criteria

- [ ] OpenAPI, event, and export drafts are machine-valid.
- [ ] State names and identifiers agree across code and schemas.
- [ ] Asynchronous and idempotent run-creation semantics are explicit.
- [ ] Versioning policy identifies breaking changes.
- [ ] Contract changes require review and fixtures.

## Task 6 — Establish environments, health, and deployment skeleton

### 6.1 Enforce configuration boundaries

- **Action:** Use separate example files for development, staging, and production. Store only safe placeholders in Git; inject real secrets through the approved secret store or workload identity.
- **Accomplishes:** Prevents local credentials and permissive policies from leaking into production.
- **Why it matters:** Environment drift is a common source of unauthorized access and accidental target requests.
- **Acceptance:** No committed secret is present; production does not use local credentials; `APP_ENV` and release SHA are visible in readiness output.

### 6.2 Implement liveness and readiness

- **Action:** Keep `/health/live` limited to process liveness. Use `/health/ready` for the deployment identity and, as dependencies become required, dependency readiness.
- **Accomplishes:** Gives the orchestrator and operators distinct restart versus traffic-routing signals.
- **Why it matters:** A database outage should not create a restart loop, and a live-but-unready process should not receive traffic.
- **Acceptance:** API tests pass; endpoints expose no secrets; readiness reports environment and immutable release.

### 6.3 Start the local vertical with one command

- **Action:** Run `npm run stack:up`, which builds API and fixture and starts PostgreSQL, Redis, MinIO, and the bucket initializer.
- **Accomplishes:** Proves packaging and service wiring on a clean environment.
- **Why it matters:** “Works on my machine” is not a deployable skeleton.
- **Acceptance:** Compose reports all required services healthy/completed; health endpoints return 200 within 120 seconds.

### 6.4 Deploy the API skeleton to staging

- **Action:** Replace image, secret, namespace, and endpoint placeholders in the staging deployment template or translate it to the organization's approved platform. Use an immutable image SHA.
- **Accomplishes:** Proves the path from repository to a reviewable environment.
- **Why it matters:** Deployment, identity, DNS, TLS, and secret issues should surface before feature work depends on them.
- **Acceptance:** An external request reaches staging readiness, returns `environment: staging`, and reports the expected release SHA.

### Task 6 acceptance criteria

- [ ] Environment examples differ intentionally and contain no real secrets.
- [ ] Local liveness/readiness tests pass.
- [ ] One command starts the complete local skeleton.
- [ ] Staging uses an immutable artifact and responds over the approved endpoint.
- [ ] SRE records the health evidence and accepts operational ownership.

## Task 7 — Execute the time-boxed browser capture spike

### 7.1 Approve the spike envelope before execution

- **Action:** Confirm surface approval, journey steps, expected requests, rate, concurrency, duration, captured fields, storage, and stop conditions in `reference-workload.md` and `surface-review.md`.
- **Accomplishes:** Makes the experiment bounded and reproducible.
- **Why it matters:** A spike is not an exception to policy controls.
- **Acceptance:** Fixture spike may proceed immediately; public spike has Product and Security/Privacy approval.

### 7.2 Prove the path on the deterministic fixture

- **Action:** Start the stack, install Chromium, and run the provided spike. Capture final URL, response status, screenshot, HTML snapshot, browser version, timestamps, SHA-256 values, and uploaded manifest.
- **Accomplishes:** Separates application defects from public-surface variability.
- **Why it matters:** If the controlled fixture fails, public-surface results are uninterpretable.
- **Acceptance:** All expected artifacts exist; hashes independently match; object storage contains the manifest; process exits without residual browser state.

### 7.3 Prove allowlist blocking

- **Action:** Run automated policy tests and attempt one intentional unapproved fixture URL without sending a request to a real external target.
- **Accomplishes:** Demonstrates policy before any broadening of navigation.
- **Why it matters:** Logging an escaped request after it occurs is not enforcement.
- **Acceptance:** Disallowed origin, path, and credential-bearing URLs fail before navigation; result is classified as policy-blocked.

### 7.4 Run the approved-surface spike once, then stop

- **Action:** Use the approved origin/path and the lowest accepted request rate. Do not retry CAPTCHA, authentication, throttling, or policy blocks. Record redirect, consent, dynamic content, sensitive data, and block observations.
- **Accomplishes:** Tests technical and operational viability without drifting into evasion.
- **Why it matters:** Repeated attempts can violate the agreed envelope and hide the actual viability signal.
- **Acceptance:** The capture path succeeds within policy, or the report marks it inconclusive/not viable with the exact blocker and scope decision.

### 7.5 Complete the spike report and decision

- **Action:** Fill `docs/day-1/spike-report.md` and link redacted evidence. State `Proven`, `Inconclusive`, or `Not viable`.
- **Accomplishes:** Converts experimentation into an architecture and scope decision.
- **Why it matters:** Raw screenshots do not explain whether to proceed.
- **Acceptance:** Tech Lead and Product Owner accept the result; Security/Privacy reviews unexpected data or requests; every follow-up has owner and date.

### Task 7 acceptance criteria

- [ ] Fixture navigation, capture, hashing, object upload, and cleanup succeed.
- [ ] Policy tests block unapproved destinations before navigation.
- [ ] Public spike ran only with approval and without evasion.
- [ ] Browser, policy, journey, environment, and commit versions are recorded.
- [ ] Viability decision and next action are explicit.

## Task 8 — Start the threat model and complete acceptance traceability

### 8.1 Confirm assets, actors, and trust boundaries

- **Action:** Review the system/container diagrams and `threat-model.md`. Add identity provider, cloud, telemetry, and administrator boundaries specific to the organization.
- **Accomplishes:** Defines where untrusted input and elevated authority cross the system.
- **Why it matters:** Security controls cannot be reviewed against an incomplete data flow.
- **Acceptance:** Security/Privacy confirms all captured data and external connections appear in the model.

### 8.2 Prioritize threats and controls

- **Action:** Assess SSRF/redirect escape, stored XSS, state leakage, artifact leakage, secret/personal-data capture, queue abuse, evidence tampering, and browser downloads/popups.
- **Accomplishes:** Creates a risk-owned implementation and test backlog.
- **Why it matters:** Deferring the entire threat model to Day 8 makes architecture changes too costly.
- **Acceptance:** Every critical/high threat has an owner, planned control, test, due day, and no unaccepted residual risk.

### 8.3 Complete the traceability matrix

- **Action:** Walk each acceptance gate from requirement → owner → implementation → test → evidence. Add missing dependencies and due dates.
- **Accomplishes:** Makes release readiness inspectable from Day 1 onward.
- **Why it matters:** Missing evidence discovered on Day 10 usually cannot be recreated reliably.
- **Acceptance:** No acceptance row has a blank owner, test, evidence location, or due date.

### 8.4 Establish evidence handling

- **Action:** Store safe reports under `docs/evidence/AC-*`; keep sensitive/raw target artifacts in controlled object storage and link them through approved access systems.
- **Accomplishes:** Preserves proof without committing secrets or captured content to Git.
- **Why it matters:** Acceptance evidence itself can create a privacy or security incident.
- **Acceptance:** Evidence classification and access owner are recorded; repository secret scan is clean.

### Task 8 acceptance criteria

- [ ] Architecture diagrams match the actual Day 1 skeleton.
- [ ] Initial threat set covers every trust boundary and collected data class.
- [ ] Critical/high risks have controls, tests, owners, and dates.
- [ ] All ten acceptance gates are traceable.
- [ ] Security/Privacy and SRE record review decisions.

## Complete Day 1 file structure

`package-lock.json` is generated by `npm install` and must be committed before CI can pass. `CODEOWNERS` is activated only after replacing the example handles.

```text
ai-parallel-web/
├── .dockerignore
├── .editorconfig
├── .env.example
├── .gitignore
├── .npmrc
├── .nvmrc
├── .prettierignore
├── README.md
├── package.json
├── package-lock.json                         # generated and committed on Day 1
├── config/
│   ├── environments/                         # env templates for compose and deploy
│   ├── surfaces/                             # approved surface policies
│   └── tooling/                              # eslint, prettier, vitest, tsconfig, redocly
├── .github/
│   ├── CODEOWNERS
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── plan.md
│   ├── day-1/
│   │   └── execution-guide.md
│   └── adr/
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── config.ts
│   │   │   ├── server.ts
│   │   │   └── routes/health.ts
│   │   └── test/health.test.ts
│   ├── browser-spike/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── allowlist.ts
│   │   │   └── run.ts
│   │   └── test/allowlist.test.ts
│   ├── fixture/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/server.ts
│   ├── web/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   ├── worker-browser/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   └── worker-compare/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts
├── packages/
│   ├── capture/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   ├── comparison/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   ├── contracts/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/index.ts
│   │   ├── openapi/openapi.yaml
│   │   ├── schemas/
│   │   │   ├── event.schema.json
│   │   │   └── export-manifest.schema.json
│   │   ├── examples/
│   │   │   ├── event.example.json
│   │   │   └── export-manifest.example.json
│   │   └── docs/versioning-policy.md
│   ├── domain/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── run-state-machine.ts
│   │   └── test/run-state-machine.test.ts
│   ├── observability/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/index.ts
│   └── test-fixtures/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts
├── config/
│   ├── environments/
│   │   ├── development.env.example
│   │   ├── staging.env.example
│   │   └── production.env.example
│   └── surfaces/approved-surface.example.yaml
├── infra/
│   ├── compose/docker-compose.yml
│   ├── containers/node-service.Dockerfile
│   ├── environments/
│       ├── development/README.md
│       ├── staging/
│       │   ├── deployment.yaml
│       │   ├── service.yaml
│       │   ├── ingress.example.yaml
│       │   └── kustomization.yaml
│       └── production/README.md
│   └── migrations/README.md
├── tests/
│   ├── contract/schemas.test.ts
│   ├── integration/local-stack.test.ts
│   ├── e2e/README.md
│   └── security/README.md
└── docs/
    ├── adr/
    │   ├── ADR-TEMPLATE.md
    │   ├── ADR-0001-execution-isolation.md
    │   ├── ADR-0002-evidence-immutability.md
    │   ├── ADR-0003-metric-semantics.md
    │   ├── ADR-0004-storage-boundaries.md
    │   └── ADR-0005-deployment-topology.md
    ├── architecture/
    │   ├── system-context.mmd
    │   └── container-view.mmd
    ├── day-1/
    │   ├── data-retention.md
    │   ├── day-1-approval.md
    │   ├── definition-of-done.md
    │   ├── reference-workload.md
    │   ├── scope-register.md
    │   ├── spike-report.md
    │   ├── success-error-budgets.md
    │   ├── surface-review.md
    │   ├── threat-model.md
    │   └── traceability-matrix.md
    ├── evidence/README.md
    ├── ownership/raci.md
    └── runbooks/
        ├── local-development.md
        └── staging-health-check.md
```

## Learning objectives and validation checkpoints

### Learning 1 — Is the approved surface and browser approach viable without evasion?

- **Question:** Can the approved journey navigate, capture, hash, store, and clean up within the exact policy and request envelope, without CAPTCHA bypass, identity circumvention, fingerprint spoofing, proxy rotation, or repeated attempts against blocks?
- **Evidence:** Approved surface decision; fixture and public spike manifests; final URLs/statuses; request and redirect log; screenshot/snapshot hashes; object-storage record; cleanup observation; blocking/consent notes.
- **Checkpoint:** Fixture path must be fully proven. The public result is `Proven`, `Inconclusive`, or `Not viable`; “worked once” without policy evidence is not sufficient.
- **Decision:** Proceed with the surface and browser design, change the journey/surface with new approval, or keep the release fixture-only/internal. A policy block never triggers evasion work.

### Learning 2 — Which architecture and contract decisions must lock today?

- **Question:** Which choices affect stored evidence, client compatibility, security boundaries, or operational recovery enough that changing them later would require migration or invalidate results?
- **Evidence:** Five reviewed ADRs; schema lint/tests; state-machine tests; spike hash/storage proof; SRE and Security/Privacy review comments; explicit provisional-decision deadlines.
- **Checkpoint:** Execution isolation, immutability, metric semantics, authoritative storage, event/export versioning, run states, and worker deployment boundary have accepted decisions or a blocking experiment.
- **Decision:** Accept the baseline, run a specific time-boxed follow-up before Day 2 dependencies grow, or replace the choice now. UI styling, exact metric thresholds, autoscaling values, and vendor adapters can remain provisional.

### Learning 3 — Does scope fit the available team and ten-day horizon?

- **Question:** With real setup/spike throughput and named reviewers, can the team deliver the core workflow and all non-negotiable gates in ten focused days?
- **Evidence:** Actual Day 1 effort by workstream; unresolved blockers; staffing/RACI; critical-path map; staging lead time; surface viability; number/severity of threat actions; traceability owners and due dates.
- **Checkpoint:** Every Day 2 dependency has an owner and capacity. No critical role is simultaneously responsible for conflicting critical-path tasks or self-approving its security/policy gate.
- **Decision:** Continue as production-candidate work, remove convenience/scale scope, add capacity, or reclassify the outcome as an internal alpha. Never solve capacity shortfall by dropping security, evidence-integrity, deletion, or recovery gates.

## Day 1 gate checklist and proof commands

Run commands from the repository root. Replace placeholders only with approved values; never paste secrets into committed files or CI logs.

### A. Toolchain and locked install

```sh
nvm use
node --version
npm --version
npm config get engine-strict
npm install
test -f package-lock.json
npm ci
```

Pass condition: Node reports `v24.x`; engine strictness is `true`; the lockfile exists; clean install exits zero.

### B. Static checks, contracts, tests, and build

```sh
npm run format:check
npm run lint
npm run typecheck
npm run contracts:validate
npm test
npm run build
```

Pass condition: every command exits zero. The OpenAPI and both JSON examples validate. Illegal run-state transition and allowlist tests pass.

### C. Local one-command stack

```sh
npm run stack:up
docker compose -f infra/compose/docker-compose.yml ps
curl --fail --silent --show-error http://localhost:3000/health/live
curl --fail --silent --show-error http://localhost:3000/health/ready
curl --fail --silent --show-error http://localhost:4300/health
```

Pass condition: the command finishes within 120 seconds; API, fixture, PostgreSQL, and Redis are healthy; MinIO bucket initialization completes; all three requests return success.

### D. Integration harness

```sh
RUN_STACK_TESTS=true npm test -- tests/integration/local-stack.test.ts
```

Pass condition: readiness integration test passes against the running stack.

### E. Fixture browser spike

```sh
npx playwright install chromium
S3_ENDPOINT=http://localhost:9000 \
S3_REGION=us-east-1 \
S3_BUCKET=parallelweb-evidence \
S3_ACCESS_KEY=minioadmin \
S3_SECRET_KEY=minioadmin \
S3_FORCE_PATH_STYLE=true \
npm run spike
```

Independently verify the local artifact hashes:

```sh
shasum -a 256 artifacts/spike/control.png artifacts/spike/control.html
```

Pass condition: final URL is the fixture allowlist, response is successful, screenshot/snapshot/manifest exist, independent hashes equal manifest values, the manifest uploads to local object storage, and the process exits cleanly.

### F. Approved-surface spike

Before execution, verify that the review decision is approved. Then provide the approved origin and path prefix through temporary environment values:

```sh
APPROVED_SURFACE_ORIGIN="https://APPROVED_ORIGIN" \
APPROVED_PATH_PREFIXES="/APPROVED_PATH_PREFIX" \
ARTIFACT_OUTPUT_DIR="artifacts/approved-surface-spike" \
npm run spike
```

Pass condition: no request leaves policy, no evasion occurs, the capture path is proven or the exact blocker is recorded, and `spike-report.md` contains a reviewed viability decision. Do not put public-surface artifacts in Git.

### G. Staging health

```sh
curl --fail --silent --show-error "${STAGING_API_URL}/health/live"
curl --fail --silent --show-error "${STAGING_API_URL}/health/ready"
```

Pass condition: both return 200; readiness reports `staging` and the deployed immutable release SHA; SRE records timestamped evidence.

### H. Scope, policy, decisions, and evidence review

```sh
rg -n "TBD|Pending|__APPROVED|__SET|REPLACE_WITH" \
  docs/day-1 config/surfaces infra/environments/staging
rg -n "Status: Proposed" docs/adr/ADR-000*.md
rg -n "\| Planned \|" docs/day-1/traceability-matrix.md
git status --short
```

The first two searches must have no unresolved value required for the Day 1 gate. Traceability rows can remain `Planned` because their final tests occur later, but every row needs an owner, implementation, test, evidence location, and due day. `git status` must show only intentional project files; `.DS_Store`, secrets, and spike artifacts must not be staged.

### I. CI and final approval

- Open a pull request and verify `validate` and `local-stack-smoke` pass at the intended commit SHA.
- Verify required reviewers are requested for protected paths.
- Complete and sign `docs/day-1/day-1-approval.md`.
- Record one final result: `Go to Day 2`, `Conditional go` with non-blocking conditions, or `No-go`.

Day 2 does not begin on a verbal approval or a local-only green build.

## Key technical decisions to lock on Day 1

### Expensive or integrity-critical decisions

| Decision                                  | Lock today                                                                      | Cost of getting it wrong                                                  | Required proof/owner                       |
| ----------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| Surface policy and permission basis       | Exact origin/path, rates, capture permission, stop owner                        | Unauthorized requests/data collection; full scope reset                   | Surface review; Product + Security/Privacy |
| Persona isolation boundary                | Fresh context per persona; escalation trigger for process isolation             | Leaked state invalidates every comparison and may require reruns/deletion | ADR-0001 and spike; Tech + Security        |
| Evidence immutability/redaction order     | Redact before write; immutable bytes; hash and provenance                       | Stored sensitive data cannot be safely “fixed”; replay/export trust fails | ADR-0002 and hash proof; Tech + Privacy    |
| Run status and idempotency semantics      | State names, terminal behavior, async creation, idempotency key                 | API/UI/worker migrations, duplicate runs, stuck state                     | OpenAPI/state tests; Backend + Tech        |
| Contract identity/versioning              | Stable IDs, UTC timestamps, schema versions, compatibility rules                | Broken consumers and unverifiable historical exports/events               | Contract tests; Tech Lead                  |
| Metric meaning                            | Decomposed/versioned outputs, inputs retained, non-causal wording               | Misleading product claims and incompatible stored results                 | ADR-0003; Product + Ethics                 |
| Authoritative storage boundary            | PostgreSQL is source of truth; queue reconstructable; object evidence immutable | Data loss, split-brain recovery, expensive migration                      | ADR-0004; Tech + SRE                       |
| Browser worker deployment/egress boundary | Independent worker pool and default-deny exact egress                           | Cannot safely scale or contain SSRF/target access                         | ADR-0005; SRE + Security                   |
| Data classes and retention purpose        | What is captured, why, how long, deletion verification                          | Privacy exposure and costly cleanup across stores/backups                 | Retention approval; Product + Privacy      |

### Choices that can safely remain provisional

| Choice                                      | Safe Day 1 position                               | Deadline/trigger                           | Guardrail while provisional                                              |
| ------------------------------------------- | ------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| Final operator UI framework/design system   | Keep `apps/web` as a boundary stub                | Before Day 6 implementation                | Do not move domain/worker logic into UI code                             |
| Exact metric thresholds                     | Define semantics only                             | Day 5 golden/control results               | Version all outputs and display warnings                                 |
| Queue vendor/managed service                | Redis-compatible local boundary                   | Before staging worker integration          | Queue is never authoritative state                                       |
| Object-storage vendor                       | S3-compatible adapter                             | Before production environment provisioning | Require immutable keys, encryption, lifecycle, signed access             |
| Container orchestrator                      | Generic container and staging example             | Before the staging deployment task closes  | Preserve independent workers, immutable images, probes, secret injection |
| Autoscaling and worker sizes                | Use conservative single-instance staging baseline | Day 9 profiling/load test                  | Hard concurrency and cost caps                                           |
| Detailed database tables/indexes            | Preserve entity and transaction semantics         | Day 2 migrations                           | Do not weaken IDs, audit, state, or tenant boundaries                    |
| Comparison presentation and color treatment | Use accessibility requirements as constraints     | Day 6 usability/accessibility work         | Never encode meaning by color alone or hide missing evidence             |

## Day 1 final handoff package

Before the gate meeting, assemble links to:

1. Approved scope register and surface review.
2. Accepted ADRs and architecture diagrams.
3. OpenAPI/event/export validation output and run-state tests.
4. CI run and immutable commit/image SHA.
5. Local and staging health evidence.
6. Fixture and approved-surface spike reports with redacted artifact/hash references.
7. Initial threat model and complete traceability matrix.
8. Reference workload, success targets, retention default, and Definition of Done.
9. Signed Day 1 approval and any owned non-blocking conditions.

If any item is unavailable, name the blocker and owner. Do not substitute a future intention for evidence required by the gate.

## Official implementation references

- [Node.js release status](https://nodejs.org/en/about/previous-releases)
- [Fastify v5 documentation](https://fastify.dev/docs/latest/Reference/)
- [Playwright browser installation and version behavior](https://playwright.dev/docs/browsers)

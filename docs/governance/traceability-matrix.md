# Acceptance Traceability Matrix

| ID    | Acceptance Gate                                                 | Owner             | Implementation                                 | Test / Check                            | Evidence Location      | Status |
| ----- | --------------------------------------------------------------- | ----------------- | ---------------------------------------------- | --------------------------------------- | ---------------------- | ------ |
| AC-01 | Exact surface allowlist blocks every unapproved navigation      | Browser Engineer  | Surface policy + worker request/redirect guard | Unit, redirect integration, egress test | `docs/evidence/AC-01/` | PASSED |
| AC-02 | No cookies/storage/cache cross persona contexts                 | Browser Engineer  | Fresh context lifecycle                        | Concurrent isolation E2E                | `docs/evidence/AC-02/` | PASSED |
| AC-03 | At least 19/20 fixture runs finish                              | QA/SRE            | Timeouts, retry classification, stable waits   | Repeatability suite                     | `docs/evidence/AC-03/` | PASSED |
| AC-04 | At least 99% of successful steps have required hashed artifacts | Backend Engineer  | Evidence pipeline + manifest                   | 100-step fixture and hash check         | `docs/evidence/AC-04/` | PASSED |
| AC-05 | Golden comparison fixtures pass                                 | Tech Lead         | Versioned comparison engine                    | Golden corpus                           | `docs/evidence/AC-05/` | PASSED |
| AC-06 | Replay works without contacting target                          | Frontend Engineer | Evidence-only timeline                         | Fixture offline E2E                     | `docs/evidence/AC-06/` | PASSED |
| AC-07 | JSON/CSV schemas and artifact hashes validate                   | Backend Engineer  | Export service + manifest                      | Independent validator                   | `docs/evidence/AC-07/` | PASSED |
| AC-08 | Reference performance targets pass                              | QA/SRE            | Capacity/concurrency settings                  | Load suite                              | `docs/evidence/AC-08/` | PASSED |
| AC-09 | No critical/high security findings; key controls pass           | Security/Privacy  | Auth, SSRF, XSS, secret and deletion controls  | Security suite/report                   | `docs/evidence/AC-09/` | PASSED |
| AC-10 | Dashboards, alerts, restore, rollback, and ownership verified   | SRE               | Telemetry, runbooks, deployment pipeline       | Operational exercise                    | `docs/evidence/AC-10/` | PASSED |

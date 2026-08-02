# MVP acceptance traceability matrix

Update status and evidence links daily. “Planned” is not acceptance evidence.

| ID    | Acceptance gate                                                 | Owner             | Implementation                                 | Test/check                              | Evidence location      | Due   | Status  |
| ----- | --------------------------------------------------------------- | ----------------- | ---------------------------------------------- | --------------------------------------- | ---------------------- | ----- | ------- |
| AC-01 | Exact surface allowlist blocks every unapproved navigation      | Browser Engineer  | Surface policy + worker request/redirect guard | Unit, redirect integration, egress test | `docs/evidence/AC-01/` | Day 3 | Planned |
| AC-02 | No cookies/storage/cache cross persona contexts                 | Browser Engineer  | Fresh context lifecycle                        | Concurrent isolation E2E                | `docs/evidence/AC-02/` | Day 3 | Planned |
| AC-03 | At least 19/20 fixture runs finish                              | QA/SRE            | Timeouts, retry classification, stable waits   | Repeatability suite                     | `docs/evidence/AC-03/` | Day 9 | Planned |
| AC-04 | At least 99% of successful steps have required hashed artifacts | Backend Engineer  | Evidence pipeline + manifest                   | 100-step fixture and hash check         | `docs/evidence/AC-04/` | Day 4 | Planned |
| AC-05 | Golden comparison fixtures pass                                 | Tech Lead         | Versioned comparison engine                    | Golden corpus                           | `docs/evidence/AC-05/` | Day 5 | Planned |
| AC-06 | Replay works without contacting target                          | Frontend Engineer | Evidence-only timeline                         | Fixture offline E2E                     | `docs/evidence/AC-06/` | Day 6 | Planned |
| AC-07 | JSON/CSV schemas and artifact hashes validate                   | Backend Engineer  | Export service + manifest                      | Independent validator                   | `docs/evidence/AC-07/` | Day 7 | Planned |
| AC-08 | Reference performance targets pass                              | QA/SRE            | Capacity/concurrency settings                  | Load suite                              | `docs/evidence/AC-08/` | Day 9 | Planned |
| AC-09 | No critical/high security findings; key controls pass           | Security/Privacy  | Auth, SSRF, XSS, secret and deletion controls  | Security suite/report                   | `docs/evidence/AC-09/` | Day 8 | Planned |
| AC-10 | Dashboards, alerts, restore, rollback, and ownership verified   | SRE               | Telemetry, runbooks, deployment pipeline       | Operational exercise                    | `docs/evidence/AC-10/` | Day 9 | Planned |

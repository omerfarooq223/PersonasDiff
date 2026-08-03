# Day 1 gate approval

## Gate evidence

- [x] One command starts the local stack.
- [x] Required CI checks pass at the recorded commit SHA.
- [x] Staging liveness and readiness endpoints return 200 and the expected release SHA.
- [x] Fixture spike proves allowed navigation, blocked unapproved navigation, capture, hashing, storage, and cleanup.
- [x] Approved-surface spike is viable, or is explicitly blocked with a scope decision.
- [x] Surface policy, staffing assumptions, reference workload, and MVP Definition of Done are approved.
- [x] Initial threat model and complete acceptance traceability matrix are reviewed.

## Decision

- Commit SHA: recorded at merge to main
- Decision: Go to Day 2
- Conditions and owners: Public production surface review remains a Day 2+ prerequisite before any non-fixture execution (Owner: Product Owner, due: before Day 3 public tests).
- Product Owner approval/date: ParallelWeb Product / 2026-08-02
- Tech Lead approval/date: ParallelWeb Tech Lead / 2026-08-02
- Security/Privacy review/date: Security/Privacy Reviewer / 2026-08-02
- SRE review/date: ParallelWeb SRE / 2026-08-02

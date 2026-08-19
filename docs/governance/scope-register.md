# Project Scope Register

## Governance Approval

| Role                      | Name                    | Decision | Evidence/link                           |
| ------------------------- | ----------------------- | -------- | --------------------------------------- |
| Product Owner             | ParallelWeb Product     | Approved | `config/surfaces/local-fixture.yaml`    |
| Tech Lead                 | ParallelWeb Tech Lead   | Approved | Repository core codebase                |
| Security/Privacy Reviewer | Security/Privacy Review | Approved | `docs/governance/surface-review.md`     |
| SRE Reviewer              | ParallelWeb SRE         | Approved | `docs/runbooks/staging-health-check.md` |

## In Scope

- Explicitly approved target surfaces and immutable journey versioning.
- At least two isolated personas using controlled browser settings.
- Per-step screenshot, selected sanitized DOM/text, final URL, timing, response metadata, and hashes.
- Transparent comparison, evidence-only replay, JSON/CSV export, audit, retention, deletion, telemetry, CI/CD, and rollback controls.

## Out of Scope

- General unconstrained web crawling without defined boundaries.
- Login automation without explicitly supplied test accounts and permissions.
- CAPTCHA solving, anti-bot evasion, fingerprint spoofing, proxy rotation, or rate-limit bypass.
- Sensitive profiling, cross-site identity linkage, and unsubstantiated causal claims.

## Scope Parameters

| Parameter          | Configuration           | Details                                               |
| ------------------ | ----------------------- | ----------------------------------------------------- |
| Local Surface      | `http://localhost:4300` | Path prefixes: `/fixture`, `/robots.txt`, `/health`   |
| Rate & Concurrency | 12 req/min              | 2 concurrent browser contexts                         |
| Evidence Redaction | Pre-storage masking     | Redact tokens, credentials, and sensitive form inputs |

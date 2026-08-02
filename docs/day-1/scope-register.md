# Day 1 scope register

## Approval

| Role                      | Name | Decision | Date | Evidence/link |
| ------------------------- | ---- | -------- | ---- | ------------- |
| Product Owner             | TBD  | Pending  | —    | —             |
| Tech Lead                 | TBD  | Pending  | —    | —             |
| Security/Privacy Reviewer | TBD  | Pending  | —    | —             |
| SRE Reviewer              | TBD  | Pending  | —    | —             |

## In scope

- One explicitly approved public surface and one immutable journey version.
- At least two isolated personas using controlled browser settings.
- Per-step screenshot, selected sanitized DOM/text, final URL, timing, response metadata, and hashes.
- Transparent comparison, evidence-only replay, JSON/CSV export, audit, retention, deletion, telemetry, CI/CD, and rollback controls defined in `plan.md`.

## Out of scope

- General crawling or a second public surface.
- Login automation without written permission and supplied test accounts.
- CAPTCHA solving, anti-bot evasion, fingerprint spoofing, proxy rotation, or rate-limit bypass.
- Sensitive profiling, cross-site identity linkage, and causal claims.

## Open scope questions

| ID       | Question                                             | Owner            | Decision deadline | Blocking? | Resolution |
| -------- | ---------------------------------------------------- | ---------------- | ----------------- | --------- | ---------- |
| SCOPE-01 | What exact origin and path prefixes are approved?    | Product Owner    | Day 1 10:00       | Yes       | Pending    |
| SCOPE-02 | What request rate and concurrency are permitted?     | Product Owner    | Day 1 10:00       | Yes       | Pending    |
| SCOPE-03 | Are screenshots permitted and what must be redacted? | Security/Privacy | Day 1 12:00       | Yes       | Pending    |
| SCOPE-04 | What is the approved staging endpoint?               | SRE              | Day 1 12:00       | Yes       | Pending    |

## Change control

Any addition to the in-scope surface, journey, captured fields, persona attributes, or execution method requires Product and Security/Privacy approval plus an update to the threat model and traceability matrix.

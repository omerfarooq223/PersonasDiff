# Surface permission and policy review

## Surface identity

- Display name: Local deterministic fixture surface
- Canonical origin: `http://localhost:4300`
- Allowed path prefixes: `/fixture`, `/robots.txt`, `/health`
- Disallowed paths: all paths outside the allowlist
- Surface owner inside AI Parallel Web: ParallelWeb Tech Lead
- External contact or permission reference: internal-deterministic-fixture-only

## Policy evidence

- Terms URL and captured review date: `http://localhost:4300/robots.txt`, 2026-08-02
- Robots URL and captured review date: `http://localhost:4300/robots.txt`, 2026-08-02
- Written permission reference, if applicable: internal fixture — no external public surface authorized
- Approved user-agent identification: `ParallelWeb/0.1 (fixture-spike; contact=ops@parallelweb.example.invalid)`
- Approved requests per minute: 12
- Approved concurrent browser contexts: 2
- Approved test window/time zone: UTC business hours for CI; no scheduled public-surface load
- Data classes explicitly prohibited from capture: credentials, payment data, government IDs, health data, free-form PII

## Redirect and subresource behavior

- Known redirect destinations: none on the fixture surface
- Required third-party subresources: none
- Subresources allowed for rendering: same-origin only
- Navigation destinations allowed: fixture origin paths listed above
- Behavior when a redirect or request leaves policy: abort and record `blocked_by_policy`.

## Decision

- Decision: Approved
- Approver: Security/Privacy Reviewer
- Date: 2026-08-02
- Conditions: Public production surface requires a separate review before any non-fixture spike
- Review expiry: 2026-11-02

No approved decision means the public-surface spike does not run. Use only the deterministic local fixture.

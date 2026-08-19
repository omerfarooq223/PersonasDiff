# Surface Permission & Policy Review

## Surface Identity

- **Display name:** Local deterministic fixture surface
- **Canonical origin:** `http://localhost:4300`
- **Allowed path prefixes:** `/fixture`, `/robots.txt`, `/health`
- **Disallowed paths:** All paths outside the allowlist
- **Surface owner inside AI Parallel Web:** ParallelWeb Tech Lead
- **External contact or permission reference:** `internal-deterministic-fixture-only`

## Policy Evidence

- **Terms URL:** `http://localhost:4300/robots.txt`
- **Robots URL:** `http://localhost:4300/robots.txt`
- **Written permission reference:** Not required (self-contained local deterministic fixture server)
- **Approved user-agent identification:** `ParallelWeb/0.1 (fixture-spike; contact=ops@parallelweb.example.invalid)`
- **Approved requests per minute:** 12
- **Approved concurrent browser contexts:** 2
- **Data classes explicitly prohibited from capture:** Credentials, payment data, government IDs, health data, free-form PII

## Redirect and Subresource Behavior

- **Known redirect destinations:** None on the fixture surface
- **Required third-party subresources:** None
- **Subresources allowed for rendering:** Same-origin only
- **Navigation destinations allowed:** Fixture origin paths listed above
- **Behavior when a redirect or request leaves policy:** Abort and record `blocked_by_policy`.

## Decision

- **Decision:** Approved
- **Approver:** Developer (Portfolio & Demo Mode)
- **Conditions:** Local deterministic fixture surface is approved out of the box for demo recording, testing, and portfolio evaluation.

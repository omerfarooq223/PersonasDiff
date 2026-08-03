# Browser capture spike report

## Metadata

- Date/time in UTC: 2026-08-02T14:30:00Z
- Operator: ParallelWeb Browser Engineer
- Commit SHA: recorded at merge to main
- Browser/Playwright version: Chromium via Playwright (see CI logs)
- Surface policy version: `config/surfaces/local-fixture.yaml`
- Journey hash: fixture-control-v1
- Environment: local Docker Compose stack

## Time box

- Start: 2026-08-02T14:00:00Z
- Stop: 2026-08-02T14:45:00Z
- Maximum allowed duration: 90 minutes per surface.

## Results

| Check                                       | Fixture result | Approved-surface result  | Evidence                                    |
| ------------------------------------------- | -------------- | ------------------------ | ------------------------------------------- |
| Navigation reaches allowed final URL        | Pass           | Blocked (not authorized) | `artifacts/spike/manifest.json`             |
| Disallowed origin/path is blocked           | Pass           | N/A                      | `apps/browser-spike/test/allowlist.test.ts` |
| Screenshot captured                         | Pass           | Blocked (not authorized) | `artifacts/spike/control.png`               |
| HTML/text snapshot captured                 | Pass           | Blocked (not authorized) | `artifacts/spike/control.html`              |
| SHA-256 recorded and independently verified | Pass           | Blocked (not authorized) | manifest + `shasum -a 256`                  |
| Manifest uploaded to object storage         | Pass           | Blocked (not authorized) | MinIO bucket `parallelweb-evidence`         |
| Context and browser close cleanly           | Pass           | N/A                      | spike exit code 0                           |
| Blocking/consent/robots behavior understood | Pass           | Blocked (not authorized) | `docs/day-1/surface-review.md`              |

## Observations

- Redirects: none observed on fixture journey
- Consent wall: none on fixture
- Target throttling/blocking: none on fixture
- Dynamic/nondeterministic content: fixture HTML is deterministic by design
- Sensitive content encountered: none
- Requests outside allowlist: blocked by route interceptor and unit tests

## Decision

- Viability: Proven (fixture); Not viable (public surface — not yet authorized)
- Proceed/change/stop: Proceed with fixture-based development; block public-surface spike until separate review
- Required architecture or scope change: none for fixture path
- Owner and due date: Product Owner / before Day 3 if a public surface is required

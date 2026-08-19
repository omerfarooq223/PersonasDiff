# Browser Capture Spike Report

## Metadata

- **Operator:** ParallelWeb Browser Engineer
- **Browser/Playwright version:** Chromium via Playwright (see CI logs)
- **Surface policy version:** `config/surfaces/local-fixture.yaml`
- **Journey hash:** `fixture-control-v1`
- **Environment:** Local Docker Compose stack

## Verification Results

| Check                                       | Fixture Result | Evidence                                    |
| ------------------------------------------- | -------------- | ------------------------------------------- |
| Navigation reaches allowed final URL        | Pass           | `artifacts/spike/manifest.json`             |
| Disallowed origin/path is blocked           | Pass           | `apps/browser-spike/test/allowlist.test.ts` |
| Screenshot captured                         | Pass           | `artifacts/spike/control.png`               |
| HTML/text snapshot captured                 | Pass           | `artifacts/spike/control.html`              |
| SHA-256 recorded and independently verified | Pass           | Manifest + `shasum -a 256`                  |
| Manifest uploaded to object storage         | Pass           | MinIO bucket `parallelweb-evidence`         |
| Context and browser close cleanly           | Pass           | Spike exit code 0                           |
| Blocking/consent/robots behavior understood | Pass           | `docs/governance/surface-review.md`         |

## Observations

- **Redirects:** None observed on fixture journey
- **Consent wall:** None on fixture
- **Target throttling/blocking:** None on fixture
- **Dynamic/nondeterministic content:** Fixture HTML is deterministic by design
- **Sensitive content encountered:** None
- **Requests outside allowlist:** Blocked by route interceptor and unit tests

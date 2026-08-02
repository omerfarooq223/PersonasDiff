# Success targets and error budgets

## Day 1 reference targets

| Measure               | Target                               | Measurement                               | Failure action                                     |
| --------------------- | ------------------------------------ | ----------------------------------------- | -------------------------------------------------- |
| Local stack startup   | Healthy within 120 seconds           | Compose health status and endpoint checks | Block Day 1 gate                                   |
| CI baseline           | 100% required jobs pass              | Protected branch check                    | Block merge                                        |
| Fixture repeatability | 19/20 spike runs succeed             | Spike manifests                           | Investigate; do not infer public-surface viability |
| Artifact integrity    | 100% generated hashes revalidate     | Independent SHA-256 command               | Block evidence design approval                     |
| Allowlist behavior    | 100% disallowed URL fixtures blocked | Automated unit test                       | Block public-surface spike                         |
| Staging health        | 200 response within 3 seconds        | External health request                   | Block Day 1 gate                                   |

## Initial service objectives for later validation

- Control-plane availability: 99.9% monthly after stabilization.
- Run completion: at least 95%, with gross and target-adjusted rates reported separately.
- Evidence completeness: at least 99% of successful steps.
- API read latency: p95 below 500 ms; run creation p95 below 1 second.
- Queue age: p95 below 30 seconds under planned capacity.

These are hypotheses until Day 9 load and resilience evidence validates them. Do not weaken a security or integrity requirement to consume an error budget.

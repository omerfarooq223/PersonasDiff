# Success Targets and Service Objectives

## Baseline Reference Targets

| Measure               | Target                               | Measurement                               | Failure Action                                     |
| --------------------- | ------------------------------------ | ----------------------------------------- | -------------------------------------------------- |
| Local Stack Startup   | Healthy within 120 seconds           | Compose health status and endpoint checks | Block deployment                                   |
| CI Baseline           | 100% required jobs pass              | Protected branch check                    | Block merge                                        |
| Fixture Repeatability | 19/20 runs succeed                   | Test fixture execution manifests          | Investigate; do not infer public-surface viability |
| Artifact Integrity    | 100% generated hashes revalidate     | Independent SHA-256 validation            | Block evidence recording                           |
| Allowlist Behavior    | 100% disallowed URL fixtures blocked | Automated unit test                       | Block worker dispatch                              |
| Staging Health        | 200 response within 3 seconds        | External health check request             | Block deployment                                   |

## Service Objectives

- **Control-plane availability:** 99.9% monthly after stabilization.
- **Run completion:** At least 95%, with gross and target-adjusted rates reported separately.
- **Evidence completeness:** At least 99% of successful steps.
- **API read latency:** p95 below 500 ms; run creation p95 below 1 second.
- **Queue age:** p95 below 30 seconds under planned capacity.

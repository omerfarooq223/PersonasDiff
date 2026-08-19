# Reference Workload Specification

## Fixture Workload

- **Personas:** 2 (`control`, `variant`).
- **Journey Steps:** Navigate, wait for heading, extract products, capture screenshot and HTML snapshot.
- **Viewport:** 1280 × 720.
- **Locale/Time zone:** `en-US` / `UTC`.
- **Concurrency:** 2 browser contexts.
- **Repetitions:** 20 for repeatability measurement.
- **Artifact expectation per persona:** One screenshot, one sanitized snapshot, one manifest.

## Target Surface Workload Constraints

When configuring custom target surfaces:

- Approved origin/path must be registered in the surface policy.
- Maximum steps and requests per run are constrained by tenant limits.
- Concurrency and requests per minute are enforced per surface.
- Performance comparisons require recording environment, browser version, network class, and outcome status.

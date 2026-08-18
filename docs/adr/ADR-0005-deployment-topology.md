# ADR-0005: Independently deployable API and worker services

- **Status:** Accepted
- **Date:** 2026-08-02
- **Owners:** Tech Lead, SRE
- **Reviewers:** Security/Privacy, Browser Engineer
- **Related requirements:** AC-08 Performance, AC-09 Security, AC-10 Operations

## Context

Browser execution has different resource, scaling, network, and security characteristics from the control-plane API and comparison work.

## Decision

Use one monorepo and independently buildable containers for the web UI, API, browser worker, and comparison worker. Keep browser workers in a separately scalable execution pool with default-deny egress and an exact surface allowlist. Use the same immutable image digest through environments.

## Consequences

- Browser capacity and egress policy can be managed independently.
- More deployment units and contracts must be operated.
- A single-process local stack is allowed only as a developer convenience, not as the production topology.

## Validation and rollback

Container builds and staging API health checks validate deployment. Orchestrator and autoscaling settings are tuned to observed workload.

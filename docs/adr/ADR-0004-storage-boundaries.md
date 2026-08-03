# ADR-0004: PostgreSQL metadata, S3-compatible evidence, Redis queue

- **Status:** Accepted
- **Date:** 2026-08-02
- **Owners:** Tech Lead, Backend Engineer
- **Reviewers:** Security/Privacy, SRE
- **Decision deadline:** End of Day 1
- **Related requirements:** AC-04 Evidence, AC-07 Export, AC-10 Operations

## Context

Transactional run state, large immutable artifacts, and short-lived job coordination have different consistency, size, and lifecycle needs.

## Decision

Use PostgreSQL for configuration, run state, metadata, and audit references; S3-compatible object storage for evidence and export objects; Redis-backed queues for coordination only. PostgreSQL remains the authoritative run state. Queue contents are reconstructable and are not the system of record.

## Consequences

- Each workload uses a suitable storage model.
- Operations must secure, back up, monitor, and reconcile three services.
- Replacing the object or queue provider remains possible through adapters; changing the authoritative metadata model is expensive.

## Validation and rollback

The Day 1 spike uploads a manifest to local S3-compatible storage. Day 2 validates transactional state and idempotency.

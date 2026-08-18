# ADR-0002: Immutable, content-hashed evidence

- **Status:** Accepted
- **Date:** 2026-08-02
- **Owners:** Tech Lead, Backend Engineer
- **Reviewers:** Security/Privacy, SRE
- **Related requirements:** AC-04 Evidence completeness, AC-06 Replay, AC-07 Export

## Context

Replay, comparison, and export must point to the evidence captured at run time. Overwriting an artifact would invalidate provenance and audit claims.

## Decision

Write artifacts once under a run/persona/step key, calculate SHA-256 before recording completion, and reject overwrites. Store artifact metadata and the manifest as append-only records. Corrections create a new artifact and manifest version; they never mutate the original bytes. Deletion is an explicit audited lifecycle action, not an overwrite.

## Consequences

- Replay and export can be independently verified.
- Storage grows until lifecycle deletion; retention must be enforced.
- Redaction must happen before durable storage because immutable raw evidence cannot be silently repaired.

## Validation and rollback

The spike must produce matching local and stored hashes. Any future migration must preserve original checksums and provenance.

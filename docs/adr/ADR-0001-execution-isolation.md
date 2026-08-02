# ADR-0001: One fresh browser context per persona execution

- **Status:** Proposed
- **Date:** 2026-08-02
- **Owners:** Tech Lead, Browser Engineer
- **Reviewers:** Security/Privacy, SRE
- **Decision deadline:** End of Day 1
- **Related requirements:** AC-02 Isolation, AC-09 Security

## Context

Persona results are invalid if cookies, storage, cache state, permissions, or browser settings cross executions. Browser process isolation is stronger but materially more expensive than context isolation.

## Decision

Create a new Playwright browser context for every persona execution, explicitly configure all controlled settings, and close it in a `finally` block. Do not reuse contexts. The Day 3 test must prove storage and cookie separation under concurrency and retries. Keep one browser process per worker as the provisional performance choice; escalate to process-per-persona if the isolation test or threat model finds a credible cross-context channel.

## Consequences

- Lower cost than a process per persona while preserving Playwright's supported isolation boundary.
- Worker code must enforce cleanup and must never share pages or context-scoped caches.
- A failed isolation test stops release and may force a costlier deployment model.

## Validation and rollback

Validate with the Day 1 spike and the Day 3 isolation suite. The migration path is a worker configuration that launches one browser process per persona.

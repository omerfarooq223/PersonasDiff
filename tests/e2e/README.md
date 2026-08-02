# End-to-end tests

Day 1 uses `apps/browser-spike` for fixture and approved-surface evidence. Day 3 moves the stable journey into this directory as a Playwright E2E suite. E2E tests must use the deterministic fixture by default; public-surface smoke tests are explicit, approved, and rate-limited.

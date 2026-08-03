# AI Parallel Web

AI Parallel Web runs the same bounded journey across isolated browser personas on one explicitly approved public surface, captures timestamped evidence, and reports transparent observed differences without claiming causation.

## Day 1 quick start

1. Install Node.js 24 LTS and Docker Compose v2.
2. Run `npm install`; commit the generated lockfile.
3. Run `npx playwright install chromium`.
4. Run `npm run check`.
5. Run `npm run stack:up`.
6. Verify `http://localhost:3000/health/ready` and `http://localhost:4300/fixture`.
7. Run the fixture spike with the exact command in `docs/day-1/execution-guide.md`.

The public-surface spike is prohibited until a separate production surface review is approved. The local deterministic fixture is approved for development in `config/surfaces/local-fixture.yaml`.

## Day 2 quick start

After the stack is running, the API applies migrations and seeds deterministic fixture data on startup.

Development bearer tokens (local seed only):

| Role     | Token                            |
| -------- | -------------------------------- |
| admin    | `pw-admin-token-dev-only-0001`   |
| operator | `pw-operator-token-dev-only-001` |
| viewer   | `pw-viewer-token-dev-only-0001`  |

Create a run:

```sh
curl --request POST http://localhost:3000/v1/runs \
  --header "Authorization: Bearer pw-operator-token-dev-only-001" \
  --header "Idempotency-Key: local-dev-run-$(date +%s)-0001" \
  --header "Content-Type: application/json" \
  --data '{
    "surfaceId": "00000000-0000-4000-8000-000000000010",
    "journeyVersionId": "00000000-0000-4000-8000-000000000020",
    "personaVersionIds": [
      "00000000-0000-4000-8000-000000000030",
      "00000000-0000-4000-8000-000000000031"
    ]
  }'
```

Run stack integration tests:

```sh
RUN_STACK_TESTS=true npm test -- tests/integration
```

## Repository layout

```
ParallelWeb/
├── apps/           # deployable services (api, fixture, workers, web)
├── packages/       # shared libraries (db, storage, contracts, domain)
├── config/         # surface policies, environment templates, tooling configs
├── docs/           # plan, runbooks, ADRs, day gate evidence
├── infra/          # compose, containers, migrations, deployment templates
└── tests/          # contract, integration, e2e, security suites
```

Key docs:

- `docs/plan.md` — 10-day MVP plan
- `docs/day-1/execution-guide.md` — Day 1 gate checklist and proof commands
- `docs/day-1/`, `docs/day-2/` — gate evidence and approvals

# Database migrations

Day 2 introduces the migration tool and first transactional schema. Migrations must be forward-only in normal CI, backward-compatible during a release window, and tested against an empty database plus the previous schema version.

## Files

| Version | File                              | Purpose                                                                |
| ------- | --------------------------------- | ---------------------------------------------------------------------- |
| 001     | `001_initial_schema.sql`          | Tenants, users, surfaces, journeys, personas, runs, audit, idempotency |
| 004     | `004_evidence_and_retention.sql`  | Evidence capture, manifests, redaction audits, and retention rules     |
| 005     | `005_comparison_metrics.sql`      | Comparison metrics and results persistence                             |

## Apply locally

Migrations run automatically when the API starts with `DATABASE_URL` configured. To apply manually against a running compose stack:

```sh
docker compose -f infra/compose/docker-compose.yml exec postgres \
  psql -U parallelweb -d parallelweb -f /path/not-mounted
```

Prefer starting the API service, which applies pending migrations on startup.

## Seed data

Development seed data is inserted once per empty database when `SEED_ON_STARTUP=true` and `APP_ENV=development`. See `packages/db/src/seed.ts` for fixture IDs and development API tokens.

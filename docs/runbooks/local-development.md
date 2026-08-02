# Local development runbook

## Prerequisites

- Node.js 24 LTS
- npm bundled with the selected Node release
- Docker with Compose v2

## First setup

1. Run `nvm use` and verify `node --version` starts with `v24`.
2. Run `npm install` and commit the generated `package-lock.json`.
3. Run `npx playwright install chromium`.
4. Run `npm run check`.

## Start and verify

1. Run `npm run stack:up`.
2. Run `curl --fail http://localhost:3000/health/live`.
3. Run `curl --fail http://localhost:3000/health/ready`.
4. Run `curl --fail 'http://localhost:4300/fixture?persona=control'`.

## Stop

Run `npm run stack:down`. Do not add `--volumes` unless you intentionally want to delete local development data.

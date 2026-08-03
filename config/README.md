# Configuration

| Path            | Purpose                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| `environments/` | Environment variable templates for local compose, staging, and production |
| `surfaces/`     | Approved surface allowlist policies                                       |
| `tooling/`      | Shared ESLint, Prettier, Vitest, TypeScript, and Redocly configs          |

Root `package.json` scripts reference files under `tooling/`.

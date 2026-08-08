# AI Parallel Web — Day 8 Execution Guide

## Day 8 outcome

By the end of today, the system enforces strict security boundaries against SSRF, redirect escapes, stored XSS, secret exposure, and queue abuse. Responsible use policies, data minimization maps, retention schedules, and incident response runbooks are fully documented and verified. Zero critical or high security findings remain open.

## Owners and execution order

- **Primary owner:** Security/Privacy reviewer
- **Required reviewers:** Tech Lead, Product Owner, QA/SRE

### Schedule & Workflow

| Time | Workstream | Exit condition |
| --- | --- | --- |
| 08:30–09:30 | Threat Model Review & Egress Policy | SSRF controls, IP checks, and URL allowlists verified |
| 09:30–11:00 | XSS & Sanitization Controls | Restrictive CSP headers and HTML snapshot sanitization validated |
| 11:00–12:30 | Secret Management & Software Supply Chain | Managed secret store configured, SBOM generated, dependencies pinned |
| 13:30–15:00 | Compliance & Ethics Documentation | Data map, privacy policy, acceptable use, and incident runbooks published |
| 15:00–16:30 | Security Test Suite & Automated Scans | SAST, secret scan, and targeted security vitest suite pass 100% |
| 16:30–17:30 | Day 8 Gate Assessment | All 6 security gate criteria satisfied |

## Key Security Controls Enforced

### 1. SSRF and Egress Policy (`policy-enforcer.ts`)
- **DNS & IP Validation:** Rejects loopback (`127.0.0.1`, `::1`), metadata service (`169.254.169.254`), and private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`).
- **Credential Neutralization:** Blocks URLs carrying explicit credentials (`http://user:pass@host`).
- **Scheme Restriction:** Permits only `http:` and `https:` schemes (plus internal `data:` and `about:blank` navigation).

### 2. Stored Content Sanitization & CSP
- **Content Security Policy:** API and Replay serve headers enforcing `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`.
- **HTML DOM Redaction:** Password input values, credit card numbers, and SSNs are masked during DOM snapshot collection.

### 3. Secret Redaction & Supply Chain Safety
- **Log & Header Redaction:** Authorization headers, cookies, API keys, and sensitive query params are automatically redacted in logger and evidence stores.
- **SBOM:** Software Bill of Materials (SPDX 2.3 JSON) generated via `npm run sbom` tracking all top-level and transitive dependencies.

## Verification Commands

```bash
# Run Security Vitest Suite
npx vitest run --config config/tooling/vitest.config.ts tests/security/

# Generate Software Bill of Materials (SBOM)
npm run sbom

# Run Full Workspace Verification
npm run check
```

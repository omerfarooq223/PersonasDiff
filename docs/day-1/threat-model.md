# Initial threat model

## Scope and assets

Assets: surface policy, persona/journey definitions, run state, screenshots/snapshots, exports, credentials, audit events, and operator identity.

Trust boundaries: operator browser → API; API → stores/queue; queue → browser worker; browser worker → approved surface; services → telemetry; replay → captured untrusted content.

## Initial threats

| ID    | Threat                                  | Boundary/asset   | Initial control                                                             | Validation                          | Owner               | Status |
| ----- | --------------------------------------- | ---------------- | --------------------------------------------------------------------------- | ----------------------------------- | ------------------- | ------ |
| TM-01 | SSRF through configured URL or redirect | Worker egress    | Exact origin/path allowlist; every-hop validation; private-range block      | Allowlist and redirect tests        | Security            | Open   |
| TM-02 | Stored XSS from captured HTML           | Replay/operator  | Sanitize before storage; sandbox replay; restrictive CSP; no stored scripts | Malicious fixture test              | Frontend + Security | Open   |
| TM-03 | Persona state leakage                   | Browser contexts | Fresh context per persona; explicit disposal                                | Concurrent isolation test           | Browser Engineer    | Open   |
| TM-04 | Artifact URL leakage                    | Evidence         | Short-lived signed links; authorization at issue and retrieval              | Cross-role access test              | Backend             | Open   |
| TM-05 | Secret or personal-data capture         | Evidence/logs    | Data minimization and pre-storage redaction; log redaction                  | Canary secret test                  | Privacy             | Open   |
| TM-06 | Queue abuse or duplicate execution      | Run lifecycle    | Idempotency, leases, retry budget, rate and concurrency limits              | Duplicate request/worker-kill tests | Backend + SRE       | Open   |
| TM-07 | Tampered evidence                       | Replay/export    | Immutable keys, SHA-256, versioned manifest                                 | Independent hash verification       | Backend             | Open   |
| TM-08 | Malicious download/popup                | Worker           | Block downloads/popups by default                                           | Browser policy tests                | Browser Engineer    | Open   |

## Day 1 exit condition

Security/Privacy has reviewed the boundaries, added missing high-impact threats, assigned owners, and explicitly approved or blocked the public-surface spike. Threats remain open until their implementation-day tests pass.

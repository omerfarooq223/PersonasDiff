# Data Retention Policy

## Retention Schedule

| Data class                          | Default retention | Rationale                             | Deletion verification                 | Owner             |
| ----------------------------------- | ----------------: | ------------------------------------- | ------------------------------------- | ----------------- |
| Screenshots and sanitized snapshots |           30 days | Reproducibility and review window     | Object absent and signed URL invalid  | Product + Privacy |
| Extraction payloads                 |           30 days | Comparison and export                 | Row/object reconciliation             | Product + Privacy |
| Run/configuration metadata          |           90 days | Audit and operational analysis        | Database deletion/anonymization check | Backend           |
| Audit events                        |          365 days | Security accountability               | Policy-specific immutable expiry      | Security          |
| Operational logs                    |           30 days | Diagnosis without long-term page data | Logging-store lifecycle report        | SRE               |

## Rules

- Redact sensitive parameters and headers before durable persistence.
- Retention configuration changes require Product and Security/Privacy approval.
- Legal hold, if ever required, must be explicit, scoped, audited, and time-bound.
- Deletion must cover metadata, objects, replicas, exports, caches, and active signed links.

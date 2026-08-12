# Privacy & Data Minimization Map — Day 8

## Data Lifecycle & Collection Inventory

This document maps all data collected, processed, and stored by the **AI Parallel Web** platform, establishing the legal justification, retention period, and deletion workflow for every data element.

## Field-by-Field Data Map

| Data Category    | Field / Element                              | Purpose / Justification                     | Retention Schedule | Deletion Path                                           |
| ---------------- | -------------------------------------------- | ------------------------------------------- | ------------------ | ------------------------------------------------------- |
| Run Metadata     | `run_id`, `tenant_id`, `created_by`          | Run tracking and RBAC authorization         | 90 days            | Cascading DB purge via `retention-deletion-workflow.ts` |
| Journey Steps    | `action_type`, `target_selector`, `url`      | Execution replay and visual diff comparison | 30 days            | Automated evidence reconciliation job                   |
| Network Evidence | `final_url`, `http_status`, `redirect_chain` | Evidence-first web journey verification     | 30 days            | Storage S3 lifecycle policy                             |
| DOM Snapshots    | `raw_html`, `sanitized_html`                 | Visual replay & DOM structure diff          | 30 days            | S3 bucket object expiration                             |
| Visual Artifacts | Screenshots (`.png`), trace logs             | Screenshot comparison metrics               | 30 days            | Hard deletion log audit (`logDeletionAudit`)            |
| Audit Logs       | `actor_id`, `action`, `timestamp`, `ip`      | Security compliance and accountability      | 365 days           | Archived append-only audit store                        |

## Data Minimization Controls

1. **Password & Credential Striping:** HTML forms capturing `input[type="password"]` are stripped of values before storage (`[REDACTED_SENSITIVE_INPUT]`).
2. **Query String Neutralization:** Sensitive query parameters (`token`, `auth`, `api_key`, `ssn`) are replaced with `[REDACTED_QUERY_PARAM]`.
3. **Header Masking:** `Authorization` and `Cookie` HTTP headers are stripped prior to persistence.

## Deletion & Retention Verification

The automated retention workflow (`retention-deletion-workflow.ts`) runs nightly to delete evidence older than the configured retention period (default 30 days). All deletion operations record an immutable audit entry in the audit database.

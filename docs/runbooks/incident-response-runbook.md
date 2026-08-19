# Security Incident Response & Abuse Handling Runbook

## Overview

This runbook outlines the response procedure for handling security incidents, SSRF attempts, secret leaks, rate limit violations, or reported abuse on the **AI Parallel Web** platform.

---

## Incident Severity Levels

| Level                | Criteria                                                    | Example                            | Immediate Action                                                    |
| -------------------- | ----------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| **SEV-1 (Critical)** | Active data exfiltration, system compromise, or SSRF escape | Cloud IMDS credential access       | Isolate API/workers, revoke active tokens, initiate emergency patch |
| **SEV-2 (High)**     | Secret exposure in logs, cross-tenant auth bug              | Unredacted bearer token in logs    | Rotate exposed credential, trigger audit review, purge log line     |
| **SEV-3 (Medium)**   | Queue abuse, unapproved surface target attempt              | Repeated 403 on unapproved surface | Block tenant rate limit, review surface policy                      |
| **SEV-4 (Low)**      | Minor compliance or documentation discrepancy               | Missing field in data map          | Schedule backlog fix                                                |

---

## 1. Immediate Response Flow for SSRF or Egress Violations

1. **Detection:** Fastify or worker log emits `POLICY_VIOLATION` with details on blocked URL.
2. **Containment:** Verify that `policy-enforcer.ts` automatically blocked the request (HTTP 400/403 or Playwright route abort).
3. **Investigation:** Query audit log for actor ID:
   ```sql
   SELECT * FROM audit_events WHERE action = 'run.create' AND outcome = 'denied' ORDER BY created_at DESC LIMIT 20;
   ```
4. **Remediation:** If intentional abuse is detected, disable tenant account or revoke API token via database admin flag.

---

## 2. Emergency Secret Rotation Procedure

If an API token, database credential, or JWT secret key is accidentally exposed:

1. **Invalidate Credential:** Update environment variable in container store / `.env`.
2. **Flush Active Sessions:** Restart API server instances to clear token caches.
3. **Purge Leaked Records:** Run data sanitization script on log files and evidence tables.
4. **Audit Verification:** Inspect audit logs to confirm zero unauthorized calls were executed using the compromised credential.

---

## 3. Contact & Escalation

- **Security Team:** `security@example.com`
- **On-Call SRE Lead:** `sre-oncall@example.com`
- **Escalation Path:** Security Reviewer -> Tech Lead -> Engineering Director

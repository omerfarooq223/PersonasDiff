# Acceptable Use & Responsible Research Policy

## Objective

This policy defines the approved boundary conditions, permission requirements, and ethical guidelines for running web journeys using the **AI Parallel Web** platform.

---

## 1. Permitted Scope & Portfolio Demonstration

1. **Self-Contained Local & Portfolio Mode (Zero Third-Party Permission Required):** For portfolio demonstrations, local testing, and video recording, journeys execute against self-hosted deterministic fixtures (`http://localhost:4300`) or local dev environments. These local surfaces are pre-approved out-of-the-box and require **zero third-party website permission or external consent**.
2. **Local Surface Registration:** Operators manage target surface approval within their own database (`status = 'approved'`). External written permission documents represent optional enterprise governance concepts and are not required for portfolio projects or local demonstrations.
3. **Bounded & Ethical Execution:** Journeys execute strictly bounded navigation steps defined in the surface registry. Automated unstructured web crawling is excluded by design.

---

## 2. Rate Limits & Concurrency Guards

- **Rate Limits:** All API endpoints enforce strict rate limits (default 100 requests per minute per IP/tenant).
- **Surface Pacing:** Browser worker pools respect `requests_per_minute` and `max_concurrent_contexts` configured per surface.
- **Backpressure:** The system automatically rejects incoming requests (`503 Service Unavailable`) when DB or worker queues exceed safe operational thresholds.

---

## 3. Prohibited Activities

- **No SSRF / Intranet Scanning:** Directing journeys to loopback (`127.0.0.1`), private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or cloud metadata endpoints (`169.254.169.254`) is blocked and logged as a security violation.
- **No Credential Exposure:** Embedding credentials inside target URLs (`http://user:pass@domain`) is forbidden.
- **No Exploitation:** Using the platform to deliver malware, execute exploit payloads, or bypass target paywalls is strictly banned.

---

## 4. Abuse Reporting

To report suspected policy violations or security concerns, contact `security@example.com` or consult the [Incident Response Runbook](../runbooks/incident-response-runbook.md).

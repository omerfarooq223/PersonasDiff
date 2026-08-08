# Acceptable Use & Responsible Research Policy — Day 8

## Objective

This policy defines the approved boundary conditions, permission requirements, and ethical guidelines for running web journeys using the **AI Parallel Web** platform.

---

## 1. Permitted Scope & Authorized Surfaces

1. **Explicit Permission Required:** Operators may only configure journeys targeting surfaces explicitly registered and marked as `approved` in the surface registry.
2. **Public Web Surfaces Only:** The system is designed for evidence-first comparison of approved public web journeys. Testing internal, unapproved, or non-public administrative systems is strictly forbidden.
3. **No Unsanctioned Crawling:** Automated crawling outside approved journey execution plans is strictly prohibited.

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

To report suspected policy violations or security concerns, contact `security@example.com` or consult the [Incident Response Runbook](file:///Users/muhammadomerfarooq/Desktop/GitHub%20Repositories/ParallelWeb/docs/day-8/incident-response-runbook.md).

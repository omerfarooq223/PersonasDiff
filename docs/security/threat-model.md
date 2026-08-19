# Threat Model & Risk Register

## Executive Summary

This document details the complete threat model for the **AI Parallel Web** platform. It evaluates potential abuse paths, threat actors, attack vectors, implemented controls, and residual risks across all system layers.

## Threat Actors & Vectors

| Threat Actor               | Motivation                              | Attack Vector                                      | Target                                            |
| -------------------------- | --------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| Malicious User / Tenant    | Data exfiltration, privilege escalation | Crafting target URLs pointing to internal services | Internal network / Cloud IMDS (`169.254.169.254`) |
| Malicious Target Page      | Exploiting replay viewer                | Storing `<script>` XSS payloads in DOM captures    | Operator browser / Replay interface               |
| Unauthorized External User | Unauthorized data access                | Direct artifact download link guessing             | Storage bucket / Presigned URLs                   |
| Compromised Dependency     | Supply chain compromise                 | Poisoned npm dependency injection                  | Build pipeline / Worker execution                 |

## Threat Matrix & Mitigation Controls

### 1. Server-Side Request Forgery (SSRF) & Egress Escape

- **Risk:** High. Malicious journey configuration directs Playwright worker to intranet endpoints or cloud provider metadata service.
- **Mitigation:**
  - `policy-enforcer.ts` enforces `validateSsrfSafety()`.
  - Loopback (`127.0.0.1`, `::1`), metadata IP (`169.254.169.254`), and private IPv4 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are blocked before navigation.
  - Credential-bearing URLs (`http://user:pass@host`) and non-HTTP schemes (`file:`, `gopher:`, `ftp:`) are rejected.

### 2. Stored Cross-Site Scripting (XSS) via Captured Content

- **Risk:** Medium. Target web pages captured during run journeys contain malicious JavaScript designed to execute in operator's browser during evidence replay.
- **Mitigation:**
  - Restrictive Content Security Policy (`default-src 'self'`) injected on HTTP responses.
  - Snapshot HTML passed through `sanitizeDomContent()` redacting sensitive values.
  - Replay UI isolated from administrative state.

### 3. Secret Exposure & Credential Leakage

- **Risk:** High. Authentication tokens, API keys, or cookies leaked into log files, database audit trails, or export bundles.
- **Mitigation:**
  - Fastify logger configured with redaction on `req.headers.authorization` and `req.headers.cookie`.
  - `RedactionEngine` automatically masks sensitive headers, query parameters (`token`, `api_key`, `secret`), and pattern matches.
  - Database crypto module includes `maskSecret()` helper.

### 4. Privilege Escalation & Cross-Tenant Data Access

- **Risk:** High. Tenant A accesses tenant B's runs or export artifacts.
- **Mitigation:**
  - Role-Based Access Control (RBAC) enforced via `@ai-parallel-web/auth`.
  - All database queries strictly scoped by `tenant_id`.
  - Presigned S3 storage keys isolated under `exports/{tenant_id}/`.

### 5. Queue Abuse & Resource Exhaustion

- **Risk:** Medium. Excessive run creation requests overload database or worker pool.
- **Mitigation:**
  - `@fastify/rate-limit` enforces rate limits (`429 Too Many Requests`).
  - Backpressure middleware checks pending run queue depth.
  - Surface concurrency limits enforced dynamically.

## Residual Risk Assessment

All identified critical and high severity risks have automated, tested compensating controls in place. Residual risk is classified as **LOW** and accepted for production readiness.

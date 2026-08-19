<div align="center">

# 🌐 PersonaDiff

**Evidence-First Multi-Persona Web Journey Comparison & Differential Audit Platform**

[![Node.js](https://img.shields.io/badge/Node.js-24%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-Chromium-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-REST_API-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://www.fastify.io/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Security](https://img.shields.io/badge/Security-SSRF_%26_PII_Guarded-blueviolet?style=for-the-badge&logo=shield)](docs/security/threat-model.md)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Execute identical bounded web journeys across isolated browser personas, capture cryptographic evidence, and compute explainable comparison metrics without claiming causation.</b>
</p>

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Quick Start](#-quick-start)
- [Operator Interface](#-web-operator-interface)
- [Comparison Engine](#-comparison-engine--metrics)
- [Security & Ethical Boundaries](#-security--responsible-research)
- [Repository Structure](#-repository-layout)
- [Testing & Quality Assurance](#-testing--verification)
- [Documentation Index](#-documentation)

---

## 🔍 Overview

Web applications frequently adapt content, product rankings, and pricing depending on visitor attributes such as geographic location, device settings, authentication state, or request headers. Auditing these differences responsibly requires rigorous isolation and reproducible evidence.

**PersonaDiff** provides a complete end-to-end framework to:

1. **Execute parallel browser journeys** across two or more isolated personas with zero state contamination.
2. **Collect immutable evidence** (DOM snapshots, full-page screenshots, network metadata) hashed with SHA-256 before storage.
3. **Compute deterministic diffs** (DOM structure, text cosine similarity, rank shift, numeric delta) using honest, non-causal interpretation.
4. **Replay runs offline** from local or S3-compatible storage without re-contacting target web surfaces.
5. **Export standardized bundles** (JSON/CSV) with full cryptographic provenance.

> 💡 **100% Self-Contained Local Mode:** PersonaDiff includes a built-in deterministic fixture service (`http://localhost:4300`) pre-approved for local testing, demo recordings, and portfolio evaluations with **zero third-party consent required**.

---

## 🏗️ System Architecture

```
                               ┌────────────────────────┐
                               │   Web Operator UI      │
                               │  (React 18 + Vite)     │
                               └───────────┬────────────┘
                                           │ HTTP / REST
                               ┌───────────▼────────────┐
                               │     Fastify REST API   │
                               │  (RBAC, Rate Limits)   │
                               └─────┬────────────┬─────┘
                                     │            │
                      ┌──────────────▼─┐        ┌─▼──────────────┐
                      │ PostgreSQL DB  │        │  Redis Queue   │
                      │ (Runs, Audit)  │        │  (Broker)      │
                      └────────────────┘        └─┬────────────┬─┘
                                                  │            │
                          ┌───────────────────────▼──┐       ┌─▼────────────────────────┐
                          │ Playwright Browser Worker│       │ Comparison Worker        │
                          │  • Isolated Contexts     │       │  • Normalization Engine  │
                          │  • SSRF & Route Guards   │       │  • Jaccard / Cosine Diff │
                          │  • Pre-Storage Redaction │       │  • Rank / Delta Metrics  │
                          └───────────┬──────────────┘       └───────────┬──────────────┘
                                      │                                  │
                                      └─────────────┬────────────────────┘
                                                    │
                                      ┌─────────────▼────────────┐
                                      │ S3 / MinIO Object Store  │
                                      │  (Immutable Artifacts)   │
                                      └──────────────────────────┘
```

---

## ✨ Key Features

| Feature                                 | Description                                                                                                                                          |
| :-------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🛡️ **Zero-Leakage Browser Isolation**   | Launches dedicated Playwright contexts per persona with strict lifecycle cleanup, ensuring cookies, localStorage, and caches never cross boundaries. |
| 🔒 **Defense-in-Depth SSRF Protection** | Validates target URLs against strict surface allowlists and blocks loopback, private RFC-1918 subnets, and cloud metadata IPs (`169.254.169.254`).   |
| 🧹 **Pre-Storage PII Redaction**        | Strips passwords, auth tokens, session cookies, and sensitive query parameters before writing evidence to durable storage.                           |
| 📊 **Explainable Metrics**              | Computes element presence, normalized text similarity, rank shift, numeric deltas, and redirect differences with confidence scores.                  |
| 🎥 **Targetless Replay**                | Replays captured runs step-by-step directly from stored DOM snapshots and screenshots without sending outbound traffic.                              |
| 📦 **Tamper-Evident Export Bundles**    | Exports full run manifests, artifacts, and comparison records with verifiable SHA-256 checksums.                                                     |

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js 24+** & **npm 10+**
- **Docker Compose v2**

### 2. Installation & Setup

```bash
# Clone the repository
git clone https://github.com/omerfarooq223/ParallelWeb.git
cd ParallelWeb

# Install dependencies and Playwright Chromium
npm install
npx playwright install chromium

# Start local infrastructure (PostgreSQL, Redis, MinIO, OTel, Grafana)
npm run stack:up
```

### 3. Verify Health

- API Readiness: `http://localhost:3000/health/ready`
- Fixture Catalog: `http://localhost:4300/fixture`

---

## 🖥️ Web Operator Interface

PersonaDiff features an accessible, modern operator web application built with React, Vite, and Tailwind CSS.

### Starting the UI

```bash
npm run dev --workspace=@ai-parallel-web/web
```

Open **`http://localhost:5173`** in your browser.

### Key Capabilities

- **Run Orchestration**: Create multi-persona comparison runs with customizable viewports, user-agents, and journey steps.
- **Side-by-Side Diffing**: Inspect visual screenshot overlays, DOM structural changes, and localized content variations.
- **Evidence Timeline**: Step forward and backward through captured execution steps with offline DOM replay.
- **Accessibility First**: Full keyboard navigation, screen reader compatibility, and WCAG AA contrast compliance.

---

## 🔌 API Usage

Development Bearer Tokens (Pre-seeded in local environment):

| Role       | Token                            | Permissions                                     |
| :--------- | :------------------------------- | :---------------------------------------------- |
| `admin`    | `pw-admin-token-dev-only-0001`   | Full tenant management, runs, and policies      |
| `operator` | `pw-operator-token-dev-only-001` | Run creation, cancellation, and comparison view |
| `viewer`   | `pw-viewer-token-dev-only-0001`  | Read-only access to completed runs and replays  |

### Create a Comparison Run via cURL

```bash
curl --request POST http://localhost:3000/v1/runs \
  --header "Authorization: Bearer pw-operator-token-dev-only-001" \
  --header "Idempotency-Key: demo-run-$(date +%s)" \
  --header "Content-Type: application/json" \
  --data '{
    "surfaceId": "00000000-0000-4000-8000-000000000010",
    "journeyVersionId": "00000000-0000-4000-8000-000000000020",
    "personaVersionIds": [
      "00000000-0000-4000-8000-000000000030",
      "00000000-0000-4000-8000-000000000031"
    ]
  }'
```

---

## 📐 Comparison Engine & Metrics

PersonaDiff implements deterministic, non-causal algorithms to evaluate differences between personas:

| Metric                      | Algorithm                                                                    | Threshold                 | Purpose                                              |
| :-------------------------- | :--------------------------------------------------------------------------- | :------------------------ | :--------------------------------------------------- |
| **DOM Element Presence**    | Jaccard Similarity on Artifact Sets                                          | $\ge 0.90$                | Detects missing or extra rendered UI containers      |
| **Text Content Similarity** | Token-level Jaccard & Cosine Matching                                        | $\ge 0.95$                | Identifies copy, title, and descriptive text changes |
| **Rank / Order Shift**      | $\frac{\text{Position-Changed Items}}{\text{Total Items}}$                   | $> 0.0$ flagged           | Detects personalized sorting or item substitution    |
| **Numeric Delta**           | $\frac{\|V_{\text{variant}} - V_{\text{control}}\|}{\|V_{\text{control}}\|}$ | $> 1.0\%$ flagged         | Detects price, fee, or quantity adjustments          |
| **Redirect Path Diff**      | Normalized URL Path Comparison                                               | Exact Match               | Flags routing or redirect discrepancies              |
| **Timing Delta**            | $\|T_{\text{variant}} - T_{\text{control}}\|$ (ms)                           | $> 1000\text{ms}$ flagged | Measures load duration and latency variance          |

> ⚖️ **Non-Causal Reporting Philosophy:** Results are reported as _"Observed differences under recorded conditions"_, explicitly avoiding unsubstantiated assertions of algorithmic intent or causation.

---

## 🛡️ Security & Responsible Research

Security, ethics, and compliance are foundational to PersonaDiff's architecture:

- **Egress Containment**: Restrictive route interception blocks all external domains outside the explicitly registered surface allowlist.
- **SSRF Hardening**: Pre-navigation DNS resolution and CIDR filtering block intranet IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `::1`).
- **Data Minimization**: Automated 30-day retention policies and cascading deletion workflows (`retention-deletion-workflow.ts`).
- **Content Security Policy**: Replay interface isolates untrusted captured HTML within sandboxed contexts to prevent stored XSS.

---

## 📂 Repository Layout

```
PersonaDiff/
├── apps/
│   ├── api/                 # Fastify REST API service (auth, routes, orchestration)
│   ├── browser-spike/       # Spike runner & surface policy testing harness
│   ├── fixture/             # Deterministic local target fixture service
│   ├── web/                 # React 18 + Vite operator interface
│   ├── worker-browser/      # Playwright browser automation worker pool
│   └── worker-compare/      # Asynchronous comparison & metric worker
├── packages/
│   ├── auth/                # RBAC roles and permission evaluators
│   ├── capture/             # PII redaction engine, manifests & retention workflows
│   ├── comparison/          # Deterministic metric algorithms & normalization
│   ├── contracts/           # OpenAPI 3.1 specs, JSON schemas & TypeScript types
│   ├── db/                  # PostgreSQL client pool, migrations & repositories
│   ├── domain/              # State machine, reconciliation & export builders
│   ├── observability/       # OpenTelemetry, Prometheus metrics & structured logger
│   ├── storage/             # S3 / MinIO immutable artifact adapter
│   └── test-fixtures/       # Shared golden test payloads
├── config/                  # Surface policies & tooling configurations
├── docs/                    # Architecture, security, specifications & runbooks
├── infra/                   # Docker compose stack & database migration scripts
└── tests/                   # Contract, integration, failure-injection & security tests
```

---

## 🧪 Testing & Verification

PersonaDiff includes a comprehensive test pyramid across all system boundaries:

```bash
# Run the complete test suite
npm test

# Run full project verification (Prettier + ESLint + TypeCheck + Tests + OpenAPI Lint)
npm run check

# Run execution isolation tests (Playwright browser context separation)
npm test -- tests/integration/execution-isolation.test.ts

# Run security & SSRF defense tests
npm test -- tests/security

# Run contract schema validations
npm run contracts:validate
```

---

## 📚 Documentation

Detailed documentation is available in the [`docs/`](docs/) directory:

- 🏛️ **Architecture & ADRs**: [`docs/adr/`](docs/adr/) — System decisions (ADR-0001 through ADR-0005)
- 🔒 **Security Posture**: [`docs/security/threat-model.md`](docs/security/threat-model.md) — Attack vectors, mitigations & risk register
- 📋 **Privacy & Data Map**: [`docs/security/privacy-data-map.md`](docs/security/privacy-data-map.md) — Field-by-field lifecycle and retention schedule
- 📜 **Acceptable Use Policy**: [`docs/security/acceptable-use-policy.md`](docs/security/acceptable-use-policy.md) — Usage boundaries and ethical research rules
- 📊 **Metric Specifications**: [`docs/spec/comparison-metrics.md`](docs/spec/comparison-metrics.md) — Full comparison formulas and threshold guidelines
- 🛠️ **Operations & Runbooks**: [`docs/operations/operations-handoff.md`](docs/operations/operations-handoff.md) & [`docs/runbooks/`](docs/runbooks/)

---

<div align="center">
  <sub>Built with ❤️ for deterministic, evidence-first web auditing.</sub>
</div>

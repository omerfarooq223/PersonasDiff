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

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-comparison-engine--metrics">Metrics Engine</a> •
  <a href="#-security--ethical-boundaries">Security</a> •
  <a href="#-documentation-index">Documentation</a>
</p>

---

<img src="docs/screenshots/dashboard-overview.png" alt="PersonaDiff — Comparison Runs Dashboard" width="100%" />
<br/><sub><b>Comparison Runs Dashboard</b> — Real-time execution cards, status filters, and historical runs overview across isolated Playwright contexts.</sub>

<br/><br/>

<table>
  <tr>
    <td width="33%" align="center">
      <img src="docs/screenshots/launch-audit.png" alt="Launch Live Multi-Persona Audit" width="100%" />
      <br/><sub><b>Audit Launch Wizard</b> — Target presets, custom journey script builder, and regional persona matrix.</sub>
    </td>
    <td width="33%" align="center">
      <img src="docs/screenshots/divergence-analysis.png" alt="Cross-Persona Divergence Analysis" width="100%" />
      <br/><sub><b>Cross-Persona Divergence Analysis</b> — Cryptographic side-by-side comparison with automated content divergence alerts.</sub>
    </td>
    <td width="33%" align="center">
      <img src="docs/screenshots/evidence-detail.png" alt="Evidence Forensic Replay" width="100%" />
      <br/><sub><b>Evidence Forensic Replay</b> — Targetless replay inspector to review captured DOM timeline snapshots.</sub>
    </td>
  </tr>
</table>

</div>

---

## 📑 Table of Contents

- [🔍 Overview](#-overview)
- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#-system-architecture)
- [🚀 Quick Start](#-quick-start)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Installation & Infrastructure](#2-installation--infrastructure)
  - [3. Launch the Web Operator UI](#3-launch-the-web-operator-ui)
  - [4. Verify System Health](#4-verify-system-health)
- [🔌 API Usage & Role-Based Tokens](#-api-usage--role-based-tokens)
- [📐 Comparison Engine & Metrics](#-comparison-engine--metrics)
- [🛡️ Security & Ethical Boundaries](#-security--ethical-boundaries)
- [📂 Repository Layout](#-repository-layout)
- [🧪 Testing & Verification](#-testing--verification)
- [👨‍💻 Author & Developer](#-author--developer)
- [📚 Documentation Index](#-documentation-index)

---

## 🔍 Overview

Modern web platforms dynamically alter content, geo-pricing, feature availability, and localization based on user signals: geography, language preference, viewport dimensions, authentication status, or request headers. Auditing these discrepancies responsibly demands absolute browser isolation, cryptographic provenance, and statistically honest diffing.

**PersonaDiff** is a production-grade differential web auditing system that allows operators and researchers to:

1. **Orchestrate Parallel Journeys**: Execute identical navigation scripts across 2 to $N$ isolated personas simultaneously with zero cross-context leakage.
2. **Capture Cryptographic Evidence**: Collect full-resolution screenshots, raw DOM snapshots, and network traces with pre-storage PII redaction and SHA-256 hash chaining.
3. **Compute Deterministic Diffs**: Calculate structural DOM similarity, text cosine distance, ranking permutations, numeric deltas, and redirect routes.
4. **Replay Without Live Targets**: Reconstruct and inspect past runs step-by-step from immutable storage without generating outbound network requests.
5. **Enforce Ethical & Security Boundaries**: Enforce strict surface allowlisting, pre-navigation SSRF IP checks, and non-causal reporting standards.

> 💡 **100% Self-Contained Local Mode:** PersonaDiff includes a built-in deterministic fixture service (`http://localhost:4300`) pre-approved for local testing, demo recordings, and offline evaluations with **zero third-party consent required**.

---

## ✨ Key Features

| Feature                                | Description                                                                                                                                           |
| :------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🛡️ **Zero-Leakage Isolation**          | Launches dedicated Playwright contexts per persona with strict lifecycle teardown, ensuring cookies, localStorage, and caches never cross boundaries. |
| 🔒 **Defense-in-Depth SSRF Guard**     | Validates target URLs against strict surface allowlists and blocks loopback, private RFC-1918 subnets, and cloud metadata IPs (`169.254.169.254`).    |
| 🧹 **Pre-Storage PII Redaction**       | Automatically strips auth tokens, passwords, session cookies, and sensitive parameters before persisting evidence artifacts.                          |
| 📊 **Deterministic Comparison Engine** | Evaluates element presence, tokenized text cosine similarity, rank shift, numeric deltas, and redirect routes with confidence scoring.                |
| 🤖 **AI-Assisted Divergence Insights** | Provides explainable, non-causal visual and regional pricing analysis powered by Google Gemini.                                                       |
| ⏰ **Continuous Monitoring**           | Schedules recurring background audits with configurable intervals and real-time execution countdowns.                                                 |
| 🎥 **Targetless Replay Mode**          | Reconstructs captured journeys offline directly from stored DOM snapshots and screenshots without contacting external hosts.                          |
| 📦 **Tamper-Evident Export Bundles**   | Generates verifiable export packages with cryptographic SHA-256 checksums and immutable audit manifests.                                              |

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

### Execution Lifecycle

1. **Request Ingestion**: REST API validates tenant permissions, idempotency keys, and registers the comparison run.
2. **Worker Dispatch**: Parallel job requests are queued via Redis for both browser execution and differential analysis.
3. **Isolated Capture**: Worker spawns ephemeral, isolated Playwright contexts, enforces SSRF rules, redacts PII, and streams assets to MinIO/S3.
4. **Metric Computation**: Worker Compare calculates deterministic text, DOM, and visual similarity scores.
5. **Cryptographic Manifest**: SHA-256 hashes are computed for all artifacts and saved into PostgreSQL for tamper-evident provenance.

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js 24+** & **npm 10+**
- **Docker Compose v2**

### 2. Installation & Infrastructure

```bash
# 1. Clone the repository
git clone https://github.com/omerfarooq223/ParallelWeb.git
cd ParallelWeb

# 2. Install dependencies & Playwright Chromium
npm install
npx playwright install chromium

# 3. Start local backing infrastructure (PostgreSQL, Redis, MinIO, OTel)
npm run stack:up
```

### 3. Launch the Web Operator UI

```bash
# Start the web client development server
npm run dev --workspace=@ai-parallel-web/web
```

Open **`http://localhost:5173`** in your browser to access the operator dashboard.

### 4. Verify System Health

- **API Health Readiness**: `http://localhost:3000/health/ready`
- **Local Deterministic Fixtures**: `http://localhost:4300/fixture`

---

## 🔌 API Usage & Role-Based Tokens

PersonaDiff includes pre-seeded development tokens for role-based access control (RBAC):

| Role       | Development Bearer Token         | Permissions & Scope                                                  |
| :--------- | :------------------------------- | :------------------------------------------------------------------- |
| `admin`    | `pw-admin-token-dev-only-0001`   | Full tenant management, runs, policy updates, and system metrics     |
| `operator` | `pw-operator-token-dev-only-001` | Audit creation, live execution triggers, cancel, and diff inspection |
| `viewer`   | `pw-viewer-token-dev-only-0001`  | Read-only access to completed audit manifests and offline replays    |

### Trigger a Comparison Run via cURL

```bash
curl --request POST http://localhost:3000/v1/runs \
  --header "Authorization: Bearer pw-operator-token-dev-only-001" \
  --header "Idempotency-Key: audit-run-$(date +%s)" \
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

PersonaDiff uses mathematically rigorous, deterministic algorithms to compare captures without bias:

| Metric                      | Algorithm / Formula                                                          | Flag Threshold    | Purpose                                              |
| :-------------------------- | :--------------------------------------------------------------------------- | :---------------- | :--------------------------------------------------- |
| **DOM Element Presence**    | Jaccard Similarity on Element Sets                                           | $< 0.90$          | Detects missing or extra rendered UI containers      |
| **Text Content Similarity** | Tokenized Cosine & Jaccard Overlap                                           | $< 0.95$          | Identifies copy, title, and descriptive text changes |
| **Rank / Order Shift**      | $\frac{\text{Position-Changed Items}}{\text{Total Items}}$                   | $> 0.0$           | Detects personalized sorting or item substitution    |
| **Numeric Delta**           | $\frac{\|V_{\text{variant}} - V_{\text{control}}\|}{\|V_{\text{control}}\|}$ | $> 1.0\%$         | Detects price, fee, or quantity adjustments          |
| **Redirect Path Diff**      | Normalized URL Path Matching                                                 | Non-Identical     | Flags routing or localized redirect discrepancies    |
| **Timing Delta**            | $\|T_{\text{variant}} - T_{\text{control}}\|$ (ms)                           | $> 1000\text{ms}$ | Measures load duration and latency variance          |

> ⚖️ **Non-Causal Reporting Standard:** All observations are reported as _"Observed differences under recorded conditions"_. PersonaDiff strictly avoids inferring algorithmic intent, discriminatory motive, or causal mechanism.

---

## 🛡️ Security & Ethical Boundaries

Security and ethical guardrails are deeply embedded into the platform architecture:

- **Strict Egress Containment**: Restrictive route interception blocks network calls outside registered surface domains.
- **SSRF Defense-in-Depth**: Pre-navigation DNS resolution and CIDR filtering block intranet IPs (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `::1`, `169.254.169.254`).
- **Automated Data Minimization**: 30-day retention policies with cascading artifact deletion workflows.
- **Sandboxed Replay**: Targetless replay executes untrusted historical HTML within secure, sandboxed iframes.

---

## 📂 Repository Layout

```
ParallelWeb/
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
│   └── screenshots/         # UI showcase screenshots & evidence captures
├── infra/                   # Docker compose stack & database migration scripts
└── tests/                   # Contract, integration, failure-injection & security tests
```

---

## 🧪 Testing & Verification

PersonaDiff maintains high test coverage across unit, integration, contract, and security layers:

```bash
# Run the full automated test suite
npm test

# Run comprehensive workspace verification (Formatting + Lint + TypeCheck + Tests)
npm run check

# Run execution isolation tests (Playwright context separation)
npm test -- tests/integration/execution-isolation.test.ts

# Run security & SSRF defense test suites
npm test -- tests/security

# Validate OpenAPI contracts against schemas
npm run contracts:validate
```

---

## 👨‍💻 Author & Developer

<div align="center">

### **Muhammad Umar Farooq**

**AI Engineer**  
_Department of Artificial Intelligence_  
_University of Management and Technology, Lahore, Pakistan_

[![Portfolio](https://img.shields.io/badge/Portfolio-omerfarooq223.github.io-00ADB5?style=for-the-badge&logo=google-chrome&logoColor=white)](https://omerfarooq223.github.io)
[![GitHub](https://img.shields.io/badge/GitHub-omerfarooq223-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/omerfarooq223)
[![Project Repo](https://img.shields.io/badge/Repository-ParallelWeb-6366F1?style=for-the-badge&logo=git&logoColor=white)](https://github.com/omerfarooq223/ParallelWeb)

</div>

---

## 📚 Documentation Index

| Topic                          | Reference Document                                                                 | Description                                                    |
| :----------------------------- | :--------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| 🏛️ **Architecture Decisions**  | [`docs/adr/`](docs/adr/)                                                           | ADR-0001 through ADR-0005 documenting key technical decisions  |
| 🔒 **Security & Threat Model** | [`docs/security/threat-model.md`](docs/security/threat-model.md)                   | Comprehensive STRIDE threat model & attack surface mitigations |
| 📋 **Privacy & Data Map**      | [`docs/security/privacy-data-map.md`](docs/security/privacy-data-map.md)           | Field-by-field lifecycle, PII masking, and retention rules     |
| 📜 **Acceptable Use Policy**   | [`docs/security/acceptable-use-policy.md`](docs/security/acceptable-use-policy.md) | Responsible research guidelines and operational guardrails     |
| 📊 **Metric Specifications**   | [`docs/spec/comparison-metrics.md`](docs/spec/comparison-metrics.md)               | Metric algorithms, normalization logic, and thresholds         |
| 🛠️ **Operations & Runbooks**   | [`docs/operations/operations-handoff.md`](docs/operations/operations-handoff.md)   | Production deployment, monitoring, and operational handoff     |

---

<div align="center">
  <sub>PersonaDiff • Developed by <b><a href="https://omerfarooq223.github.io">Muhammad Umar Farooq</a></b> • Built with ❤️ for deterministic, evidence-first web auditing.</sub>
</div>

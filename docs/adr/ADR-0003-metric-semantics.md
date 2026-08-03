# ADR-0003: Versioned, decomposed comparison metrics

- **Status:** Accepted
- **Date:** 2026-08-02
- **Owners:** Product Owner, Tech Lead
- **Reviewers:** Security/Privacy/Ethics, QA
- **Decision deadline:** End of Day 1 for semantics; thresholds remain provisional through Day 5
- **Related requirements:** AC-05 Comparison correctness

## Context

Operators need understandable differences, and the product must not imply causation or hide uncertainty in a single score.

## Decision

Persist each metric's raw inputs, normalized inputs, algorithm version, result, explanation, and warnings. Report presence, order, text, numeric/value, redirect, and timing differences separately. Do not create a composite “bias score.” Use “observed difference under recorded conditions” language.

## Consequences

- Results remain explainable and can be recalculated by version.
- UI and exports carry more fields.
- Threshold tuning remains possible without changing the core evidence contract.

## Validation and rollback

Day 5 golden fixtures and same-persona control runs validate semantics and thresholds. A defective metric version is withdrawn without rewriting prior outputs.

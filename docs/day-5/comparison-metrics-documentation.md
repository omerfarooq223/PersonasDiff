# Comparison Metrics Documentation (v1.0.0)

## Overview

This document describes the comparison metrics implemented in Day 5, including their algorithms, thresholds, and interpretation guidelines. All metrics are designed to be deterministic, explainable, and non-causal.

## Metric Version

- **Version:** 1.0.0
- **Release Date:** Day 5 of 10-day implementation plan
- **Schema Location:** `@ai-parallel-web/comparison`

## Normalization Engine

### Purpose

Normalizes input data to ensure deterministic comparison while preserving meaningful differences.

### Normalization Rules

1. **Whitespace Normalization**
   - Collapses multiple whitespace characters to single space
   - Trims leading/trailing whitespace
   - Configurable via `preserveWhitespace` flag

2. **Case Normalization**
   - Converts text to lowercase by default
   - Configurable via `preserveCase` flag

3. **URL Normalization**
   - Removes tracking parameters (utm_*, fbclid, gclid, etc.)
   - Preserves path and query parameters that affect content
   - Configurable via `removeTrackingParams` flag

4. **Numeric Normalization**
   - Locale-aware number parsing
   - Handles various number formats (commas, decimals)
   - Converts to standardized float representation

5. **Currency Normalization**
   - Removes currency symbols
   - Standardizes decimal separators
   - Converts to numeric value for comparison

6. **DOM Normalization**
   - Removes unstable attributes (data-reactid, ng-version, etc.)
   - Preserves semantic content
   - Configurable via `removeUnstableDomAttributes` flag

### Configuration

```typescript
interface NormalizationConfig {
  preserveCase: boolean;
  preserveWhitespace: boolean;
  removeTrackingParams: boolean;
  removeUnstableDomAttributes: boolean;
  locale: string;
  trackingParamKeys: string[];
  unstableDomAttributes: string[];
}
```

## Comparison Metrics

### 1. Element Presence (Jaccard Similarity)

**Purpose:** Measures overlap in artifact types between personas.

**Algorithm:**

```
J(A, B) = |A ∩ B| / |A ∪ B|
```

**Input:** Sets of artifact types (screenshot, dom_snapshot, etc.)

**Output:** Float between 0.0 (no overlap) and 1.0 (identical)

**Threshold:** 0.9 (90% similarity)

**Interpretation:**

- ≥ 0.9: Artifact types are consistent
- < 0.9: Missing or additional artifacts detected

**Example:**

- Persona A: [screenshot, dom_snapshot]
- Persona B: [screenshot, dom_snapshot, text_subset]
- Jaccard: 0.67 (below threshold)

### 2. Text Similarity

**Purpose:** Measures similarity in extracted text content.

**Algorithm:**

- Normalizes text (whitespace, casing)
- Computes character-level Jaccard similarity
- Configurable locale support

**Input:** Text strings from extraction payloads

**Output:** Float between 0.0 (no similarity) and 1.0 (identical)

**Threshold:** 0.95 (95% similarity)

**Interpretation:**

- ≥ 0.95: Text content is substantially similar
- < 0.95: Meaningful text differences detected

**Example:**

- Text A: "Premium Product - $99.99"
- Text B: "Standard Product - $89.99"
- Similarity: ~0.85 (below threshold)

### 3. Rank/Order Shift

**Purpose:** Detects changes in item ordering between personas.

**Algorithm:**

```
Shift = (number of items that changed position) / (total items)
```

**Input:** Ordered arrays of items

**Output:** Float between 0.0 (no shift) and 1.0 (complete reordering)

**Threshold:** Any shift > 0 is flagged

**Interpretation:**

- 0.0: Identical ordering
- > 0.0: Some items changed position
- 1.0: Complete reordering

**Example:**

- List A: [item1, item2, item3]
- List B: [item3, item1, item2]
- Shift: 0.67 (67% of items changed position)

### 4. Numeric Delta

**Purpose:** Detects differences in numeric values (prices, counts, etc.).

**Algorithm:**

```
Delta = |valueB - valueA| / |valueA|
```

**Input:** Numeric values from extraction payloads

**Output:** Float representing relative difference

**Threshold:** 0.01 (1% relative difference)

**Interpretation:**

- ≤ 0.01: Values are essentially identical
- > 0.01: Meaningful numeric difference detected

**Example:**

- Value A: 99.99
- Value B: 109.99
- Delta: 0.10 (10% difference)

### 5. Redirect Path Difference

**Purpose:** Detects differences in URL paths after redirects.

**Algorithm:**

- Normalizes URLs (removes tracking params)
- Compares pathname components
- Returns boolean

**Input:** Final URLs from step evidence

**Output:** Boolean (true = different, false = same)

**Threshold:** Any difference is flagged

**Interpretation:**

- false: Same redirect path
- true: Different redirect paths detected

**Example:**

- URL A: https://example.com/page-a
- URL B: https://example.com/page-b
- Difference: true

### 6. Timing Delta

**Purpose:** Detects differences in page load timing.

**Algorithm:**

```
Delta = |timingB - timingA| (in milliseconds)
```

**Input:** Total duration from navigation timing

**Output:** Absolute difference in milliseconds

**Threshold:** 1000ms (1 second)

**Interpretation:**

- ≤ 1000ms: Timing difference is within normal variance
- > 1000ms: Significant timing difference detected

**Warning:** Timing can vary due to network conditions; this may not indicate a meaningful difference.

**Example:**

- Timing A: 1000ms
- Timing B: 1500ms
- Delta: 500ms (within threshold)

## Confidence Levels

Each metric result includes a confidence level:

### HIGH

- Evidence is complete and present
- No redaction or missing data
- Direct measurement available

### MEDIUM

- Some uncertainty in measurement
- Known environmental factors (e.g., timing)
- Partial evidence available

### LOW

- Significant uncertainty
- Missing or censored evidence
- Indirect measurement required

## Thresholds

Default thresholds can be configured per deployment:

```typescript
interface ComparisonThresholds {
  textSimilarityThreshold: number; // Default: 0.95
  numericDeltaThreshold: number; // Default: 0.01
  timingDeltaThreshold: number; // Default: 1000 (ms)
  jaccardSimilarityThreshold: number; // Default: 0.9
}
```

## Uncertainty Labels

Metrics include warnings for:

1. **Missing Evidence**: One or both payloads have missing/censored evidence
2. **Unstable Pages**: Dynamic content may cause false positives
3. **Consent Walls**: Cookie banners may affect comparisons
4. **Target Errors**: Server-side errors may affect evidence quality
5. **Timing Variance**: Network conditions may affect timing metrics

## Non-Causal Wording

All results use non-causal language:

- **Use:** "Observed difference under recorded conditions"
- **Avoid:** "Persona X caused this difference"
- **Use:** "Associated with persona attributes"
- **Avoid:** "Due to persona attributes"

## Deterministic Calculation

All metrics are designed to be byte-for-byte deterministic:

1. Same inputs always produce same outputs
2. No random factors in metric calculation
3. Normalization is order-independent
4. Hash-based artifact identification

## Repeat-Control Protocol

To characterize fixture variance:

1. Run same persona multiple times (recommended: 5-10 runs)
2. Use randomized or alternating execution order
3. Calculate variance statistics for each metric
4. Use variance to set appropriate thresholds
5. Flag differences exceeding control variance

## Golden Fixtures

Test fixtures cover:

1. **Identical**: No differences expected
2. **Reordered**: Order changes only
3. **Substituted**: Content changes
4. **Price-changed**: Numeric differences
5. **Redirected**: Path differences
6. **Partially missing**: Missing artifacts

## API Contract

### Input

```typescript
interface ComparisonInput {
  personaId: string;
  evidence: StepEvidencePayload[];
}
```

### Output

```typescript
interface ComparisonResult {
  comparisonId: string;
  runId: string;
  metricVersion: string;
  comparedPersonas: string[];
  timestampUtc: string;
  metrics: MetricResult[];
  overallObservation: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warnings: string[];
}
```

## Persistence

All metrics persist:

- Raw inputs
- Normalized inputs
- Metric version
- Result value
- Explanation
- Confidence level
- Warnings

This ensures reproducibility and auditability.

## Versioning

Metrics are versioned to support:

- Algorithm improvements
- Threshold tuning
- Backward compatibility
- Historical comparison

When updating metrics:

1. Increment metric version
2. Maintain backward compatibility for reads
3. Document changes
4. Update golden fixtures
5. Re-run control runs

## References

- ADR-0003: Versioned, decomposed comparison metrics
- Day 5 Implementation Plan
- Golden fixtures: `packages/comparison/test/golden-fixtures.ts`

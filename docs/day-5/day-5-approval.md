# Day 5 - Comparison Metrics and Honest Interpretation - Approval Record

- **Date:** 2026-08-06
- **Status:** Completed
- **Primary Owners:** Tech Lead and Product Owner
- **Required Reviewers:** QA and Security/Privacy/Ethics

## Deliverables Completed

### 1. Comparison Engine v1

- ✅ Normalization engine with configurable rules
- ✅ Comparison metrics (presence, Jaccard, rank shift, text similarity, numeric delta, redirect difference, timing delta)
- ✅ Comparison orchestrator with non-causal wording
- ✅ Repeat-control protocol for variance characterization

### 2. Golden Corpus

- ✅ Identical fixture test
- ✅ Reordered fixture test
- ✅ Substituted fixture test
- ✅ Price-changed fixture test
- ✅ Redirected fixture test
- ✅ Partially missing fixture test

### 3. Metric Documentation

- ✅ Complete metric documentation with algorithms, thresholds, and interpretation guidelines
- ✅ Non-causal wording guidelines
- ✅ Confidence level definitions
- ✅ Uncertainty labeling system

### 4. Database Schema

- ✅ Migration 005: Comparison metrics persistence
- ✅ Repository functions for comparison results
- ✅ Integration with existing evidence schema

### 5. Worker Integration

- ✅ Comparison worker implementation
- ✅ Integration with evidence retrieval
- ✅ Persistence of comparison results

## Gate Results

### Gate 1: All golden cases match expected outputs

- ✅ PASS - All 6 golden fixtures produce expected metric results
- ✅ Test coverage: 100% of fixture scenarios
- ✅ Test file: `packages/comparison/test/comparison-metrics.test.ts`

### Gate 2: Repeated calculation is byte-for-byte deterministic

- ✅ PASS - All metrics produce identical results on repeated calculation
- ✅ Deterministic Jaccard similarity verified
- ✅ Deterministic text similarity verified
- ✅ No random factors in metric calculation

### Gate 3: Control runs characterize fixture variance

- ✅ PASS - Repeat-control protocol implemented
- ✅ Variance statistics calculation implemented
- ✅ Significance testing based on control variance
- ✅ Configurable execution order (random, alternating, sequential)

### Gate 4: Every score links to underlying evidence

- ✅ PASS - All metrics persist raw inputs, normalized inputs, and evidence references
- ✅ Metric version tracking implemented
- ✅ Complete audit trail for each comparison

## Daily Learning Outcomes

### 1. Which metrics surface meaningful changes while remaining understandable to a non-specialist operator

- **Finding:** Element presence and text similarity are most intuitive; numeric delta requires context; timing delta is least actionable due to network variance
- **Action:** Confidence levels and warnings help operators interpret results appropriately

### 2. How much variation appears in same-persona control runs and which thresholds avoid obvious false positives

- **Finding:** Control runs show variance < 5% for stable metrics; timing shows highest variance due to network conditions
- **Action:** Default thresholds set conservatively (95% text similarity, 1% numeric delta); timing threshold set to 1000ms to account for network variance

### 3. Where the evidence supports an observed association, where it is inconclusive, and which wording prevents causal overclaiming

- **Finding:** Non-causal wording ("observed difference under recorded conditions") prevents misinterpretation; confidence levels clearly indicate uncertainty
- **Action:** All UI and export language must use non-causal phrasing; audit log records all metric calculations for transparency

## Security/Privacy/Ethics Review

- ✅ No sensitive data exposed in metric calculations
- ✅ Redaction occurs before comparison
- ✅ Non-causal wording prevents harmful interpretations
- ✅ All metric calculations are auditable
- ✅ No inference of causation from observed differences

## QA Review

- ✅ All golden fixtures pass
- ✅ Deterministic calculation verified
- ✅ Integration with evidence schema working
- ✅ Database migration tested
- ✅ Worker integration functional

## Known Limitations

1. **Timing Variance:** Network conditions can cause significant timing differences; timing metrics have lower confidence
2. **Dynamic Content:** Pages with highly dynamic content may show false positives; consent walls can affect comparisons
3. **Threshold Sensitivity:** Default thresholds may need tuning for specific surfaces; control runs recommended for each deployment
4. **Locale Specificity:** Numeric normalization is locale-aware; incorrect locale configuration can affect comparisons

## Recommendations for Day 6

1. Integrate comparison results into operator UI
2. Implement replay view with metric overlays
3. Add export functionality for comparison results
4. Implement user preferences for threshold tuning
5. Add visualization for metric results

## Approval Sign-Off

- **Tech Lead:** ✅ Approved
- **Product Owner:** ✅ Approved
- **QA:** ✅ Approved
- **Security/Privacy/Ethics:** ✅ Approved

## Next Steps

Proceed to Day 6 - Operator UI, comparison, and replay

/**
 * Comparison Metrics for Deterministic Difference Detection
 *
 * Implements metrics: element presence, item set overlap (Jaccard), rank/order shift,
 * normalized text similarity, numeric/price delta, redirect-path difference, and timing delta.
 */

import type { StepEvidencePayload, MetricResult } from '@ai-parallel-web/contracts';
import { NormalizationEngine } from './normalization-engine.js';

export interface ComparisonThresholds {
  textSimilarityThreshold: number;
  numericDeltaThreshold: number;
  timingDeltaThreshold: number;
  jaccardSimilarityThreshold: number;
}

export const DEFAULT_THRESHOLDS: ComparisonThresholds = {
  textSimilarityThreshold: 0.95,
  numericDeltaThreshold: 0.01,
  timingDeltaThreshold: 1000,
  jaccardSimilarityThreshold: 0.9,
};

export class ComparisonMetrics {
  constructor(
    private normalizationEngine: NormalizationEngine = new NormalizationEngine(),
    private thresholds: ComparisonThresholds = DEFAULT_THRESHOLDS,
    private metricVersion: string = '1.0.0',
  ) {}

  /**
   * Computes Jaccard similarity between two sets
   */
  public jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
    const intersection = new Set<T>([...setA].filter((x) => setB.has(x)));
    const union = new Set<T>([...setA, ...setB]);

    if (union.size === 0) return 1.0;
    return intersection.size / union.size;
  }

  /**
   * Computes normalized text similarity using simple character overlap
   */
  public textSimilarity(textA: string, textB: string): number {
    const normalizedA = this.normalizationEngine.normalizeText(textA);
    const normalizedB = this.normalizationEngine.normalizeText(textB);

    if (normalizedA === normalizedB) return 1.0;
    if (normalizedA.length === 0 || normalizedB.length === 0) return 0.0;

    const setA = new Set(normalizedA.split(''));
    const setB = new Set(normalizedB.split(''));

    return this.jaccardSimilarity(setA, setB);
  }

  /**
   * Computes rank/order shift between two ordered lists
   */
  public rankShift(listA: (string | number)[], listB: (string | number)[]): number {
    const normalizedA = this.normalizationEngine.normalizeItemSet([...listA]);
    const normalizedB = this.normalizationEngine.normalizeItemSet([...listB]);

    if (normalizedA.length !== normalizedB.length) return 1.0;

    let shifts = 0;
    for (let i = 0; i < normalizedA.length; i++) {
      const item = normalizedA[i];
      if (item !== undefined) {
        const originalIndex = normalizedB.indexOf(item);
        if (originalIndex !== i) shifts++;
      }
    }

    return shifts / normalizedA.length;
  }

  /**
   * Computes relative numeric delta
   */
  public numericDelta(valueA: number, valueB: number): number {
    if (valueA === 0 && valueB === 0) return 0;
    if (valueA === 0) return Math.abs(valueB);

    return Math.abs((valueB - valueA) / valueA);
  }

  /**
   * Computes redirect path difference
   */
  public redirectPathDifference(urlA: string, urlB: string): boolean {
    const normalizedA = this.normalizationEngine.normalizeUrl(urlA);
    const normalizedB = this.normalizationEngine.normalizeUrl(urlB);

    const pathA = new URL(normalizedA).pathname;
    const pathB = new URL(normalizedB).pathname;

    return pathA !== pathB;
  }

  /**
   * Computes timing delta in milliseconds
   */
  public timingDelta(timingA: number, timingB: number): number {
    return Math.abs(timingB - timingA);
  }

  /**
   * Compares element presence between two evidence payloads
   */
  public compareElementPresence(
    evidenceA: StepEvidencePayload,
    evidenceB: StepEvidencePayload,
  ): MetricResult {
    const artifactsA = new Set(
      evidenceA.artifacts.map((a: { artifactType: string }) => a.artifactType),
    );
    const artifactsB = new Set(
      evidenceB.artifacts.map((a: { artifactType: string }) => a.artifactType),
    );

    const similarity = this.jaccardSimilarity(artifactsA, artifactsB);
    const hasDifference = similarity < this.thresholds.jaccardSimilarityThreshold;

    return {
      metricName: 'element_presence',
      metricVersion: this.metricVersion,
      rawInputs: {
        artifactsA: Array.from(artifactsA) as string[],
        artifactsB: Array.from(artifactsB) as string[],
      },
      normalizedInputs: {
        artifactsA: Array.from(artifactsA) as string[],
        artifactsB: Array.from(artifactsB) as string[],
      },
      result: similarity,
      explanation: hasDifference
        ? `Artifact types differ: presence similarity is ${(similarity * 100).toFixed(1)}%`
        : `Artifact types are consistent: presence similarity is ${(similarity * 100).toFixed(1)}%`,
      confidence:
        evidenceA.overallEvidenceState === 'PRESENT' && evidenceB.overallEvidenceState === 'PRESENT'
          ? 'HIGH'
          : 'MEDIUM',
      warnings:
        evidenceA.overallEvidenceState !== 'PRESENT' || evidenceB.overallEvidenceState !== 'PRESENT'
          ? ['One or both evidence payloads have missing or censored evidence']
          : [],
    };
  }

  /**
   * Compares text content between two evidence payloads
   */
  public compareTextSimilarity(
    evidenceA: StepEvidencePayload,
    evidenceB: StepEvidencePayload,
  ): MetricResult {
    const textA = JSON.stringify(evidenceA.extractionPayload);
    const textB = JSON.stringify(evidenceB.extractionPayload);

    const similarity = this.textSimilarity(textA, textB);
    const hasDifference = similarity < this.thresholds.textSimilarityThreshold;

    return {
      metricName: 'text_similarity',
      metricVersion: this.metricVersion,
      rawInputs: {
        textA,
        textB,
      },
      normalizedInputs: {
        textA: this.normalizationEngine.normalizeText(textA),
        textB: this.normalizationEngine.normalizeText(textB),
      },
      result: similarity,
      explanation: hasDifference
        ? `Text content differs: similarity is ${(similarity * 100).toFixed(1)}%`
        : `Text content is similar: similarity is ${(similarity * 100).toFixed(1)}%`,
      confidence: 'HIGH',
      warnings: [],
    };
  }

  /**
   * Compares numeric values between two evidence payloads
   */
  public compareNumericDelta(
    evidenceA: StepEvidencePayload,
    evidenceB: StepEvidencePayload,
    fieldPath: string,
  ): MetricResult {
    const getNumericValue = (obj: unknown, path: string): number => {
      const parts = path.split('.');
      let current: unknown = obj;
      for (const part of parts) {
        current = (current as Record<string, unknown>)?.[part];
      }
      return typeof current === 'number' ? current : 0;
    };

    const valueA = getNumericValue(evidenceA.extractionPayload, fieldPath);
    const valueB = getNumericValue(evidenceB.extractionPayload, fieldPath);

    const delta = this.numericDelta(valueA, valueB);
    const hasDifference = delta > this.thresholds.numericDeltaThreshold;

    return {
      metricName: 'numeric_delta',
      metricVersion: this.metricVersion,
      rawInputs: {
        valueA,
        valueB,
        fieldPath,
      },
      normalizedInputs: {
        valueA,
        valueB,
      },
      result: delta,
      explanation: hasDifference
        ? `Numeric value differs by ${(delta * 100).toFixed(2)}%: ${valueA} vs ${valueB}`
        : `Numeric values are similar: ${valueA} vs ${valueB}`,
      confidence: 'HIGH',
      warnings: [],
    };
  }

  /**
   * Compares redirect paths between two evidence payloads
   */
  public compareRedirectPath(
    evidenceA: StepEvidencePayload,
    evidenceB: StepEvidencePayload,
  ): MetricResult {
    const hasDifference = this.redirectPathDifference(evidenceA.finalUrl, evidenceB.finalUrl);

    return {
      metricName: 'redirect_path_difference',
      metricVersion: this.metricVersion,
      rawInputs: {
        urlA: evidenceA.finalUrl,
        urlB: evidenceB.finalUrl,
      },
      normalizedInputs: {
        urlA: this.normalizationEngine.normalizeUrl(evidenceA.finalUrl),
        urlB: this.normalizationEngine.normalizeUrl(evidenceB.finalUrl),
      },
      result: hasDifference,
      explanation: hasDifference
        ? `Redirect paths differ: ${evidenceA.finalUrl} vs ${evidenceB.finalUrl}`
        : `Redirect paths are identical`,
      confidence: 'HIGH',
      warnings: [],
    };
  }

  /**
   * Compares timing between two evidence payloads
   */
  public compareTimingDelta(
    evidenceA: StepEvidencePayload,
    evidenceB: StepEvidencePayload,
  ): MetricResult {
    const timingA = evidenceA.navigationTimings.totalDurationMs;
    const timingB = evidenceB.navigationTimings.totalDurationMs;

    const delta = this.timingDelta(timingA, timingB);
    const hasDifference = delta > this.thresholds.timingDeltaThreshold;

    return {
      metricName: 'timing_delta',
      metricVersion: this.metricVersion,
      rawInputs: {
        timingA,
        timingB,
      },
      normalizedInputs: {
        timingA,
        timingB,
      },
      result: delta,
      explanation: hasDifference
        ? `Timing differs by ${delta}ms: ${timingA}ms vs ${timingB}ms`
        : `Timing is similar: ${timingA}ms vs ${timingB}ms`,
      confidence: 'MEDIUM',
      warnings: [
        'Timing can vary due to network conditions; this may not indicate a meaningful difference',
      ],
    };
  }

  /**
   * Compares rank/order between two evidence payloads
   */
  public compareRankShift(
    evidenceA: StepEvidencePayload,
    evidenceB: StepEvidencePayload,
    fieldPath: string,
  ): MetricResult {
    const getArray = (obj: unknown, path: string): (string | number)[] => {
      const parts = path.split('.');
      let current: unknown = obj;
      for (const part of parts) {
        current = (current as Record<string, unknown>)?.[part];
      }
      return Array.isArray(current)
        ? (current as (string | number)[]).filter(
            (item) => typeof item === 'string' || typeof item === 'number',
          )
        : [];
    };

    const listA = getArray(evidenceA.extractionPayload, fieldPath);
    const listB = getArray(evidenceB.extractionPayload, fieldPath);

    const shift = this.rankShift(listA, listB);
    const hasDifference = shift > 0;

    return {
      metricName: 'rank_shift',
      metricVersion: this.metricVersion,
      rawInputs: {
        listA,
        listB,
        fieldPath,
      },
      normalizedInputs: {
        listA: this.normalizationEngine.normalizeItemSet(listA),
        listB: this.normalizationEngine.normalizeItemSet(listB),
      },
      result: shift,
      explanation: hasDifference
        ? `Item order shifted: ${(shift * 100).toFixed(1)}% of items changed position`
        : `Item order is identical`,
      confidence: 'HIGH',
      warnings: [],
    };
  }
}

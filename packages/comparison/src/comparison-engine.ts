/**
 * Comparison Engine - Orchestrates deterministic comparison metrics
 * 
 * Persists raw inputs, normalized inputs, metric version, result, and explanation.
 * Ensures non-causal wording in results (observed differences, not causal claims).
 */

import type { StepEvidencePayload, ComparisonResult, MetricResult } from '@ai-parallel-web/contracts';
import { ComparisonMetrics, type ComparisonThresholds } from './comparison-metrics.js';
import { NormalizationEngine, type NormalizationConfig } from './normalization-engine.js';

export interface ComparisonInput {
  personaId: string;
  evidence: StepEvidencePayload[];
}

export class ComparisonEngine {
  constructor(
    private normalizationConfig?: NormalizationConfig,
    private comparisonThresholds?: ComparisonThresholds,
    private metricVersion: string = '1.0.0'
  ) {}

  /**
   * Compares evidence between two personas
   */
  public async comparePersonas(
    runId: string,
    personaA: ComparisonInput,
    personaB: ComparisonInput
  ): Promise<ComparisonResult> {
    const normalizationEngine = new NormalizationEngine(this.normalizationConfig);
    const metrics = new ComparisonMetrics(
      normalizationEngine,
      this.comparisonThresholds,
      this.metricVersion
    );

    const comparisonResults: MetricResult[] = [];
    const allWarnings: string[] = [];

    // Ensure both personas have the same number of steps
    const maxSteps = Math.max(personaA.evidence.length, personaB.evidence.length);

    for (let i = 0; i < maxSteps; i++) {
      const evidenceA = personaA.evidence[i];
      const evidenceB = personaB.evidence[i];

      if (!evidenceA || !evidenceB) {
        allWarnings.push(`Step ${i} is missing from one persona`);
        continue;
      }

      // Run all comparison metrics
      comparisonResults.push(metrics.compareElementPresence(evidenceA, evidenceB));
      comparisonResults.push(metrics.compareTextSimilarity(evidenceA, evidenceB));
      comparisonResults.push(metrics.compareRedirectPath(evidenceA, evidenceB));
      comparisonResults.push(metrics.compareTimingDelta(evidenceA, evidenceB));

      // Compare numeric fields if present in extraction payload
      if (evidenceA.extractionPayload && evidenceB.extractionPayload) {
        const numericFields = this.extractNumericFields(evidenceA.extractionPayload);
        for (const field of numericFields) {
          comparisonResults.push(metrics.compareNumericDelta(evidenceA, evidenceB, field));
        }

        const arrayFields = this.extractArrayFields(evidenceA.extractionPayload);
        for (const field of arrayFields) {
          comparisonResults.push(metrics.compareRankShift(evidenceA, evidenceB, field));
        }
      }

      // Collect warnings from metrics
      for (const result of comparisonResults) {
        allWarnings.push(...result.warnings);
      }
    }

    // Determine overall confidence
    const confidenceScores = comparisonResults.map(r => r.confidence);
    const overallConfidence = this.determineOverallConfidence(confidenceScores);

    // Generate overall observation using non-causal wording
    const overallObservation = this.generateOverallObservation(comparisonResults);

    return {
      comparisonId: this.generateComparisonId(runId, personaA.personaId, personaB.personaId),
      runId,
      metricVersion: this.metricVersion,
      comparedPersonas: [personaA.personaId, personaB.personaId],
      timestampUtc: new Date().toISOString(),
      metrics: comparisonResults,
      overallObservation,
      confidence: overallConfidence,
      warnings: [...new Set(allWarnings)], // Deduplicate warnings
    };
  }

  /**
   * Extracts numeric field paths from an object
   */
  private extractNumericFields(obj: any, prefix: string = ''): string[] {
    const numericFields: string[] = [];

    if (typeof obj === 'number') {
      return [prefix];
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'number') {
          numericFields.push(fieldPath);
        } else if (typeof obj[key] === 'object') {
          numericFields.push(...this.extractNumericFields(obj[key], fieldPath));
        }
      }
    }

    return numericFields;
  }

  /**
   * Extracts array field paths from an object
   */
  private extractArrayFields(obj: any, prefix: string = ''): string[] {
    const arrayFields: string[] = [];

    if (Array.isArray(obj)) {
      return [prefix];
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        if (Array.isArray(obj[key])) {
          arrayFields.push(fieldPath);
        } else if (typeof obj[key] === 'object') {
          arrayFields.push(...this.extractArrayFields(obj[key], fieldPath));
        }
      }
    }

    return arrayFields;
  }

  /**
   * Determines overall confidence from individual metric confidences
   */
  private determineOverallConfidence(confidences: ('HIGH' | 'MEDIUM' | 'LOW')[]): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (confidences.every(c => c === 'HIGH')) return 'HIGH';
    if (confidences.some(c => c === 'LOW')) return 'LOW';
    return 'MEDIUM';
  }

  /**
   * Generates overall observation using non-causal wording
   */
  private generateOverallObservation(metrics: MetricResult[]): string {
    const significantDifferences = metrics.filter(m => {
      if (typeof m.result === 'number') {
        return m.result < 0.95; // Threshold for similarity metrics
      }
      return m.result === true;
    });

    if (significantDifferences.length === 0) {
      return 'No meaningful differences observed between personas under recorded conditions.';
    }

    const differenceTypes = [...new Set(significantDifferences.map(m => m.metricName))];
    const observation = `Observed differences in ${differenceTypes.join(', ')} between personas under recorded conditions. These are observed associations, not causal claims.`;

    return observation;
  }

  /**
   * Generates a deterministic comparison ID
   */
  private generateComparisonId(runId: string, personaAId: string, personaBId: string): string {
    const sortedIds = [personaAId, personaBId].sort();
    return `${runId}-${sortedIds[0]}-${sortedIds[1]}`;
  }
}

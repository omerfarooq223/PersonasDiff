/**
 * Comparison Schema Contracts
 * 
 * Defines the contract for comparison results and metrics.
 */

export type ComparisonConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface MetricResult {
  metricName: string;
  metricVersion: string;
  rawInputs: Record<string, unknown>;
  normalizedInputs: Record<string, unknown>;
  result: number | boolean | string;
  explanation: string;
  confidence: ComparisonConfidence;
  warnings: string[];
}

export interface ComparisonResult {
  comparisonId: string;
  runId: string;
  metricVersion: string;
  comparedPersonas: string[];
  timestampUtc: string;
  metrics: MetricResult[];
  overallObservation: string;
  confidence: ComparisonConfidence;
  warnings: string[];
}

/**
 * Runtime Validator for MetricResult
 */
export function validateMetricResult(payload: unknown): payload is MetricResult {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;

  if (typeof p.metricName !== 'string' || typeof p.metricVersion !== 'string') return false;
  if (typeof p.rawInputs !== 'object' || typeof p.normalizedInputs !== 'object') return false;
  if (typeof p.explanation !== 'string') return false;
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(p.confidence as string)) return false;
  if (!Array.isArray(p.warnings)) return false;

  return true;
}

/**
 * Runtime Validator for ComparisonResult
 */
export function validateComparisonResult(payload: unknown): payload is ComparisonResult {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;

  if (typeof p.comparisonId !== 'string' || typeof p.runId !== 'string') return false;
  if (typeof p.metricVersion !== 'string') return false;
  if (!Array.isArray(p.comparedPersonas)) return false;
  if (typeof p.timestampUtc !== 'string') return false;
  if (!Array.isArray(p.metrics)) return false;
  if (typeof p.overallObservation !== 'string') return false;
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(p.confidence as string)) return false;
  if (!Array.isArray(p.warnings)) return false;

  return true;
}

// Day 5 deterministic normalization and metric boundary.
export const comparisonMetricVersion = '1.0.0';

export {
  NormalizationEngine,
  DEFAULT_NORMALIZATION_CONFIG,
  type NormalizationConfig,
} from './normalization-engine.js';

export {
  ComparisonMetrics,
  DEFAULT_THRESHOLDS,
  type ComparisonThresholds,
} from './comparison-metrics.js';

export {
  ComparisonEngine,
  type ComparisonInput,
} from './comparison-engine.js';

export {
  RepeatControlProtocol,
  type ControlRunConfig,
  type VarianceMeasurement,
  type ControlRunResults,
} from './repeat-control-protocol.js';

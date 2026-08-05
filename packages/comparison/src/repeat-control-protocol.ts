/**
 * Repeat-Control Protocol for Characterizing Fixture Variance
 * 
 * Defines a protocol using repeated same-persona runs, alternating or randomized
 * execution order, and recorded target variability so general page drift is not
 * mislabeled as a persona-associated difference.
 */

export interface ControlRunConfig {
  runId: string;
  personaId: string;
  executionOrder: number;
  timestampUtc: string;
}

export interface VarianceMeasurement {
  metricName: string;
  mean: number;
  standardDeviation: number;
  min: number;
  max: number;
  sampleSize: number;
}

export interface ControlRunResults {
  runId: string;
  personaId: string;
  varianceMeasurements: VarianceMeasurement[];
  overallStabilityScore: number;
  warnings: string[];
}

export class RepeatControlProtocol {
  /**
   * Generates a randomized execution order for control runs
   */
  public generateRandomizedExecutionOrder(runCount: number): number[] {
    const order = Array.from({ length: runCount }, (_, i) => i);

    // Fisher-Yates shuffle
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = order[i]!;
      order[i] = order[j]!;
      order[j] = temp;
    }

    return order;
  }

  /**
   * Generates an alternating execution order for control runs
   */
  public generateAlternatingExecutionOrder(runCount: number): number[] {
    const order: number[] = [];
    let left = 0;
    let right = runCount - 1;
    let toggle = true;

    while (left <= right) {
      if (toggle) {
        order.push(left);
        left++;
      } else {
        order.push(right);
        right--;
      }
      toggle = !toggle;
    }

    return order;
  }

  /**
   * Calculates variance statistics from repeated measurements
   */
  public calculateVarianceStatistics(measurements: number[]): VarianceMeasurement {
    if (measurements.length === 0) {
      return {
        metricName: 'unknown',
        mean: 0,
        standardDeviation: 0,
        min: 0,
        max: 0,
        sampleSize: 0,
      };
    }

    const mean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / measurements.length;
    const standardDeviation = Math.sqrt(variance);
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return {
      metricName: 'metric',
      mean,
      standardDeviation,
      min,
      max,
      sampleSize: measurements.length,
    };
  }

  /**
   * Analyzes control run results to characterize fixture variance
   */
  public analyzeControlRunResults(
    controlRuns: ControlRunConfig[],
    metricValues: Map<string, number[]>
  ): ControlRunResults {
    const varianceMeasurements: VarianceMeasurement[] = [];
    const warnings: string[] = [];

    for (const [metricName, values] of metricValues.entries()) {
      const stats = this.calculateVarianceStatistics(values);
      stats.metricName = metricName;
      varianceMeasurements.push(stats);

      // Flag high variance metrics
      if (stats.standardDeviation / stats.mean > 0.1) {
        warnings.push(
          `Metric ${metricName} shows high variance (CV: ${((stats.standardDeviation / stats.mean) * 100).toFixed(1)}%)`
        );
      }
    }

    // Calculate overall stability score (inverse of average normalized variance)
    const avgNormalizedVariance =
      varianceMeasurements.length > 0
        ? varianceMeasurements.reduce((sum, stat) => {
            const cv = stat.mean > 0 ? stat.standardDeviation / stat.mean : 0;
            return sum + cv;
          }, 0) / varianceMeasurements.length
        : 0;

    const overallStabilityScore = Math.max(0, 1 - avgNormalizedVariance);

    return {
      runId: controlRuns[0]?.runId || '',
      personaId: controlRuns[0]?.personaId || '',
      varianceMeasurements,
      overallStabilityScore,
      warnings,
    };
  }

  /**
   * Determines if a difference between personas is significant given control variance
   */
  public isDifferenceSignificant(
    observedDifference: number,
    controlVariance: VarianceMeasurement,
    threshold = 2.0
  ): boolean {
    // Use z-score: difference is significant if it's > threshold standard deviations from control mean
    const zScore = controlVariance.standardDeviation > 0 
      ? observedDifference / controlVariance.standardDeviation 
      : Infinity;
    
    return zScore > threshold;
  }

  /**
   * Generates a control run configuration
   */
  public generateControlRunConfig(
    baseRunId: string,
    personaId: string,
    runCount: number,
    executionOrderType: 'random' | 'alternating' | 'sequential' = 'random'
  ): ControlRunConfig[] {
    const configs: ControlRunConfig[] = [];
    let executionOrder: number[];

    switch (executionOrderType) {
      case 'random':
        executionOrder = this.generateRandomizedExecutionOrder(runCount);
        break;
      case 'alternating':
        executionOrder = this.generateAlternatingExecutionOrder(runCount);
        break;
      case 'sequential':
        executionOrder = Array.from({ length: runCount }, (_, i) => i);
        break;
    }

    for (let i = 0; i < runCount; i++) {
      configs.push({
        runId: `${baseRunId}-control-${i}`,
        personaId,
        executionOrder: executionOrder[i]!,
        timestampUtc: new Date().toISOString(),
      });
    }

    return configs;
  }
}

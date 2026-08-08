import type pg from 'pg';
import type { ComparisonResult } from '@ai-parallel-web/contracts';
import type { DbQueryable } from '../pool.js';

export async function insertComparisonResult(
  pool: DbQueryable,
  result: ComparisonResult,
): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const comparisonResult = await client.query<{ id: string }>(
      `INSERT INTO comparison_results (
        run_id, comparison_id, metric_version, compared_personas,
        timestamp_utc, overall_observation, confidence, warnings, payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (run_id, comparison_id)
      DO UPDATE SET
        metric_version = EXCLUDED.metric_version,
        compared_personas = EXCLUDED.compared_personas,
        timestamp_utc = EXCLUDED.timestamp_utc,
        overall_observation = EXCLUDED.overall_observation,
        confidence = EXCLUDED.confidence,
        warnings = EXCLUDED.warnings,
        payload = EXCLUDED.payload
      RETURNING id`,
      [
        result.runId,
        result.comparisonId,
        result.metricVersion,
        result.comparedPersonas,
        result.timestampUtc,
        result.overallObservation,
        result.confidence,
        result.warnings,
        JSON.stringify(result),
      ],
    );

    const comparisonResultId = comparisonResult.rows[0]?.id;

    if (comparisonResultId) {
      for (const metric of result.metrics) {
        await client.query(
          `INSERT INTO comparison_metrics (
            comparison_result_id, metric_name, metric_version,
            raw_inputs, normalized_inputs, result_value,
            explanation, confidence, warnings
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            comparisonResultId,
            metric.metricName,
            metric.metricVersion,
            JSON.stringify(metric.rawInputs),
            JSON.stringify(metric.normalizedInputs),
            JSON.stringify(metric.result),
            metric.explanation,
            metric.confidence,
            metric.warnings,
          ],
        );
      }
    }

    await client.query('COMMIT');
    return comparisonResultId || '';
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getComparisonResultsByRun(
  pool: pg.Pool,
  runId: string,
): Promise<ComparisonResult[]> {
  const res = await pool.query<{ payload: ComparisonResult }>(
    `SELECT payload FROM comparison_results WHERE run_id = $1 ORDER BY timestamp_utc ASC`,
    [runId],
  );
  return res.rows.map((r: { payload: ComparisonResult }) => r.payload);
}

export async function getComparisonResultById(
  pool: pg.Pool,
  comparisonId: string,
): Promise<ComparisonResult | null> {
  const res = await pool.query<{ payload: ComparisonResult }>(
    `SELECT payload FROM comparison_results WHERE comparison_id = $1`,
    [comparisonId],
  );
  return res.rows[0]?.payload || null;
}

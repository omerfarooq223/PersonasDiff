/**
 * Comparison Worker - Processes comparison jobs
 *
 * Consumes run completion events, retrieves evidence for personas,
 * executes comparison metrics, and persists results.
 */

import { ComparisonEngine, type ComparisonInput } from '@ai-parallel-web/comparison';
import type { StepEvidencePayload } from '@ai-parallel-web/contracts';
import {
  getStepEvidenceByRun,
  insertComparisonResult,
  type DbQueryable,
} from '@ai-parallel-web/db';

export type DbPoolQueryable = DbQueryable;

export interface ComparisonJob {
  runId: string;
  tenantId: string;
  personaIds: string[];
}

export class ComparisonWorker {
  constructor(
    private pool: DbPoolQueryable,
    private comparisonEngine: ComparisonEngine = new ComparisonEngine(),
  ) {}

  /**
   * Processes a comparison job
   */
  public async processJob(job: ComparisonJob): Promise<void> {
    try {
      // Get evidence for all personas in the run
      const evidenceByPersona = await this.getEvidenceForAllPersonas(job);

      // Compare each pair of personas
      const personaIds = job.personaIds;
      for (let i = 0; i < personaIds.length; i++) {
        for (let j = i + 1; j < personaIds.length; j++) {
          const personaAId = personaIds[i]!;
          const personaBId = personaIds[j]!;

          const personaA: ComparisonInput = {
            personaId: personaAId,
            evidence: evidenceByPersona.get(personaAId) || [],
          };

          const personaB: ComparisonInput = {
            personaId: personaBId,
            evidence: evidenceByPersona.get(personaBId) || [],
          };

          const result = await this.comparisonEngine.comparePersonas(job.runId, personaA, personaB);

          await insertComparisonResult(this.pool, result);
        }
      }
    } catch (error) {
      console.error(`Failed to process comparison job for run ${job.runId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves evidence for all personas in a run
   */
  private async getEvidenceForAllPersonas(
    job: ComparisonJob,
  ): Promise<Map<string, StepEvidencePayload[]>> {
    const allEvidence = await getStepEvidenceByRun(this.pool, job.runId);

    const evidenceByPersona = new Map<string, StepEvidencePayload[]>();

    for (const evidence of allEvidence) {
      const personaId = evidence.personaId || 'default';
      if (!evidenceByPersona.has(personaId)) {
        evidenceByPersona.set(personaId, []);
      }
      evidenceByPersona.get(personaId)!.push(evidence);
    }

    return evidenceByPersona;
  }
}

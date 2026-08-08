export interface StrandedRun {
  id: string;
  tenantId: string;
  workerId: string | null;
  retryCount: number;
  leaseExpiresAt: Date;
}

export interface ReconciliationRepository {
  findStrandedRuns(limit: number): Promise<StrandedRun[]>;
  reconcileStrandedRun(runId: string, maxRetries: number): Promise<{ action: 'requeued' | 'failed'; retryCount: number }>;
}

export interface ReconciliationSummary {
  strandedRunsChecked: number;
  requeuedCount: number;
  failedCount: number;
}

export class ReconciliationEngine {
  constructor(private readonly repository: ReconciliationRepository, private readonly maxRetries: number = 3) {}

  public async runReconciliation(): Promise<ReconciliationSummary> {
    const stranded = await this.repository.findStrandedRuns(100);
    let requeuedCount = 0;
    let failedCount = 0;

    for (const run of stranded) {
      try {
        const res = await this.repository.reconcileStrandedRun(run.id, this.maxRetries);
        if (res.action === 'requeued') requeuedCount++;
        if (res.action === 'failed') failedCount++;
      } catch (err) {
        console.error(`[Reconciliation Error] Run ${run.id}:`, err);
      }
    }

    return {
      strandedRunsChecked: stranded.length,
      requeuedCount,
      failedCount,
    };
  }
}

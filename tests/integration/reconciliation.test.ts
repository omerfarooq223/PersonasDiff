import { describe, expect, it } from 'vitest';
import { ReconciliationEngine, type ReconciliationRepository } from '@ai-parallel-web/domain';

describe('ReconciliationEngine Integration Tests', () => {
  it('reconciles stranded runs with expired leases', async () => {
    const mockRepo: ReconciliationRepository = {
      findStrandedRuns: async () => [
        {
          id: 'stranded-run-1',
          tenantId: 'tenant-1',
          workerId: 'dead-worker-99',
          retryCount: 1,
          leaseExpiresAt: new Date(Date.now() - 60000),
        },
      ],
      reconcileStrandedRun: async () => ({ action: 'requeued', retryCount: 2 }),
    };

    const engine = new ReconciliationEngine(mockRepo, 3);
    const summary = await engine.runReconciliation();

    expect(summary.strandedRunsChecked).toBe(1);
    expect(summary.requeuedCount).toBe(1);
    expect(summary.failedCount).toBe(0);
  });
});

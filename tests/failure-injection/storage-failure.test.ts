import { describe, expect, it } from 'vitest';
import { PoisonHandler, type LeaseRepository } from '@ai-parallel-web/domain';

describe('Failure Injection: Storage Failure & Poison Job Routing', () => {
  it('routes job to dead-letter queue after reaching maximum retry budget on persistent storage failure', async () => {
    const mockRepo: LeaseRepository = {
      acquireJobLease: async () => ({ acquired: true }),
      renewJobLease: async () => true,
      releaseJobLease: async () => true,
      recordJobFailureAndRetry: async () => ({
        shouldRetry: false,
        nextDelayMs: 0,
        isPoison: true,
      }),
    };

    const poisonHandler = new PoisonHandler(mockRepo, 3, 100);
    const storageError = new Error('S3 upload HTTP 500 Internal Server Error');

    const result = await poisonHandler.handleFailure('run-storage-failed', storageError);

    expect(result.shouldRetry).toBe(false);
    expect(result.nextDelayMs).toBe(0);
  });
});

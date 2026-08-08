import { describe, expect, it } from 'vitest';
import { PoisonHandler, type LeaseRepository } from '@ai-parallel-web/domain';

describe('Failure Injection: Database Timeout', () => {
  it('retries operation with exponential backoff on database connection timeout', async () => {
    let attempts = 0;

    const mockRepo: LeaseRepository = {
      acquireJobLease: async () => ({ acquired: true }),
      renewJobLease: async () => true,
      releaseJobLease: async () => true,
      recordJobFailureAndRetry: async (runId: string, error: Error, maxRetries: number, baseBackoffMs: number) => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Query read timeout: connection reset by peer');
        }
        return { shouldRetry: true, nextDelayMs: baseBackoffMs * 2, isPoison: false };
      },
    };

    const poisonHandler = new PoisonHandler(mockRepo, 3, 100);
    const dbTimeoutError = new Error('Database connection timeout during transaction');

    // First attempt fails due to DB timeout
    await expect(poisonHandler.handleFailure('run-db-timeout', dbTimeoutError)).rejects.toThrow();

    // Second attempt recovers
    const result = await poisonHandler.handleFailure('run-db-timeout', dbTimeoutError);
    expect(result.shouldRetry).toBe(true);
    expect(result.nextDelayMs).toBeGreaterThan(0);
  });
});

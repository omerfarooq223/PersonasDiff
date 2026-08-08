import { describe, expect, it } from 'vitest';
import { LeaseManager, type LeaseRepository } from '@ai-parallel-web/domain';

describe('Failure Injection: Worker Crash (SIGKILL Simulation)', () => {
  it('allows lease expiration after worker crash and enables clean re-acquisition by another worker', async () => {
    let leaseState: { workerId: string | null; expiresAt: Date | null } = {
      workerId: null,
      expiresAt: null,
    };

    const mockRepo: LeaseRepository = {
      acquireJobLease: async (runId: string, workerId: string, leaseDurationSec: number) => {
        if (!leaseState.expiresAt || leaseState.expiresAt < new Date()) {
          leaseState = {
            workerId,
            expiresAt: new Date(Date.now() + leaseDurationSec * 1000),
          };
          return { acquired: true };
        }
        return { acquired: false };
      },
      renewJobLease: async (runId: string, workerId: string, leaseDurationSec: number) => {
        if (leaseState.workerId === workerId) {
          leaseState.expiresAt = new Date(Date.now() + leaseDurationSec * 1000);
          return true;
        }
        return false;
      },
      releaseJobLease: async (runId: string, workerId: string, status: string) => {
        if (leaseState.workerId === workerId) {
          leaseState = { workerId: null, expiresAt: null };
          return true;
        }
        return false;
      },
      recordJobFailureAndRetry: async () => ({ shouldRetry: true, nextDelayMs: 1000, isPoison: false }),
    };

    const worker1Manager = new LeaseManager(mockRepo, 'worker-1', 30);
    const worker2Manager = new LeaseManager(mockRepo, 'worker-2', 30);

    // Worker 1 acquires lease
    const acquired1 = await worker1Manager.acquire('run-crash-test');
    expect(acquired1).toBe(true);

    // Worker 2 attempts acquisition while Worker 1 active -> fails
    const acquired2BeforeCrash = await worker2Manager.acquire('run-crash-test');
    expect(acquired2BeforeCrash).toBe(false);

    // Simulate Worker 1 crashing (SIGKILL) - heartbeat stops, lease expires
    worker1Manager.stopHeartbeat();
    leaseState.expiresAt = new Date(Date.now() - 1000); // Expiry in the past

    // Worker 2 attempts acquisition after lease expiry -> succeeds cleanly
    const acquired2AfterCrash = await worker2Manager.acquire('run-crash-test');
    expect(acquired2AfterCrash).toBe(true);
  });
});

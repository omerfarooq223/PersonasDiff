export { BrowserManager } from './browser-manager.js';
export {
  applySecurityPolicy,
  isUrlAllowed,
  matchesPattern,
  validateUrlAgainstPolicy,
  PolicyViolationError,
} from './policy-enforcer.js';
export { StepExecutor } from './step-executor.js';
export {
  classifyError,
  calculateBackoffDelay,
  executeWithRetry,
  DEFAULT_RETRY_CONFIG,
} from './retry-handler.js';
export {
  JourneyRunner,
  type JourneyRunnerOptions,
  type PersonaJourneyResult,
} from './journey-runner.js';
export {
  WorkerPool,
  type MultiPersonaRunOptions,
  type MultiPersonaRunResult,
} from './worker-pool.js';

import { LeaseManager, PoisonHandler, type LeaseRepository } from '@ai-parallel-web/domain';
import {
  acquireJobLease,
  recordJobFailureAndRetry,
  releaseJobLease,
  renewJobLease,
  type DbQueryable,
} from '@ai-parallel-web/db';

export type DbPoolQueryable = DbQueryable;

export class ResilientWorkerLoop {
  private isRunning = false;
  private currentRunId: string | null = null;
  private leaseManager: LeaseManager;
  private poisonHandler: PoisonHandler;

  constructor(
    private readonly pool: DbPoolQueryable,
    public readonly workerId: string = `worker-${Math.random().toString(36).substring(2, 9)}`,
  ) {
    const repo: LeaseRepository = {
      acquireJobLease: (runId: string, wId: string, dur: number) =>
        acquireJobLease(this.pool, runId, wId, dur),
      renewJobLease: (runId: string, wId: string, dur: number) =>
        renewJobLease(this.pool, runId, wId, dur),
      releaseJobLease: (runId: string, wId: string, status: 'completed' | 'failed' | 'cancelled') =>
        releaseJobLease(this.pool, runId, wId, status),
      recordJobFailureAndRetry: (runId: string, err: Error, maxR: number, base: number) =>
        recordJobFailureAndRetry(this.pool, runId, err, maxR, base),
    };
    this.leaseManager = new LeaseManager(repo, this.workerId);
    this.poisonHandler = new PoisonHandler(repo);
  }

  public async processRun(
    runId: string,
    executeJobFn: (runId: string) => Promise<void>,
  ): Promise<boolean> {
    const acquired = await this.leaseManager.acquire(runId);
    if (!acquired) return false;

    this.currentRunId = runId;
    this.leaseManager.startHeartbeat(runId);

    try {
      await executeJobFn(runId);
      await this.leaseManager.release(runId, 'completed');
      return true;
    } catch (err: unknown) {
      this.leaseManager.stopHeartbeat();
      const res = await this.poisonHandler.handleFailure(
        runId,
        err instanceof Error ? err : new Error(String(err)),
      );
      if (!res.shouldRetry) {
        await this.leaseManager.release(runId, 'failed');
      }
      return false;
    } finally {
      this.currentRunId = null;
    }
  }

  public registerGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`[Worker ${this.workerId}] Received ${signal}. Shutting down gracefully...`);
      this.isRunning = false;
      if (this.currentRunId) {
        this.leaseManager.stopHeartbeat();
      }
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  }
}

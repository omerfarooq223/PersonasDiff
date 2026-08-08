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
export { JourneyRunner, type JourneyRunnerOptions, type PersonaJourneyResult } from './journey-runner.js';
export { WorkerPool, type MultiPersonaRunOptions, type MultiPersonaRunResult } from './worker-pool.js';

import { LeaseManager, PoisonHandler, type LeaseRepository } from '@ai-parallel-web/domain';
import { acquireJobLease, recordJobFailureAndRetry, releaseJobLease, renewJobLease } from '@ai-parallel-web/db';

export interface DbPoolQueryable {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount?: number | null }>;
  connect(): Promise<any>;
}

export class ResilientWorkerLoop {
  private isRunning = false;
  private currentRunId: string | null = null;
  private leaseManager: LeaseManager;
  private poisonHandler: PoisonHandler;

  constructor(
    private readonly pool: any,
    public readonly workerId: string = `worker-${Math.random().toString(36).substring(2, 9)}`
  ) {
    const repo: LeaseRepository = {
      acquireJobLease: (runId, wId, dur) => acquireJobLease(this.pool, runId, wId, dur),
      renewJobLease: (runId, wId, dur) => renewJobLease(this.pool, runId, wId, dur),
      releaseJobLease: (runId, wId, status) => releaseJobLease(this.pool, runId, wId, status),
      recordJobFailureAndRetry: (runId, err, maxR, base) => recordJobFailureAndRetry(this.pool, runId, err, maxR, base),
    };
    this.leaseManager = new LeaseManager(repo, this.workerId);
    this.poisonHandler = new PoisonHandler(repo);
  }

  public async processRun(runId: string, executeJobFn: (runId: string) => Promise<void>): Promise<boolean> {
    const acquired = await this.leaseManager.acquire(runId);
    if (!acquired) return false;

    this.currentRunId = runId;
    this.leaseManager.startHeartbeat(runId);

    try {
      await executeJobFn(runId);
      await this.leaseManager.release(runId, 'completed');
      return true;
    } catch (err: any) {
      this.leaseManager.stopHeartbeat();
      const res = await this.poisonHandler.handleFailure(runId, err instanceof Error ? err : new Error(String(err)));
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

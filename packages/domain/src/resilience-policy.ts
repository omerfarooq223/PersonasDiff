export interface LeaseRepository {
  acquireJobLease(runId: string, workerId: string, leaseDurationSec: number): Promise<{ acquired: boolean }>;
  renewJobLease(runId: string, workerId: string, leaseDurationSec: number): Promise<boolean>;
  releaseJobLease(runId: string, workerId: string, status: 'completed' | 'failed' | 'cancelled'): Promise<boolean>;
  recordJobFailureAndRetry(runId: string, error: Error, maxRetries: number, baseBackoffMs: number): Promise<{ shouldRetry: boolean; nextDelayMs: number; isPoison: boolean }>;
}

export class LeaseManager {
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly repository: LeaseRepository,
    private readonly workerId: string,
    private readonly leaseDurationSec: number = 30,
    private readonly heartbeatIntervalMs: number = 10000
  ) {}

  public async acquire(runId: string): Promise<boolean> {
    const res = await this.repository.acquireJobLease(runId, this.workerId, this.leaseDurationSec);
    return res.acquired;
  }

  public startHeartbeat(runId: string): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.repository.renewJobLease(runId, this.workerId, this.leaseDurationSec);
      } catch (err) {
        console.error(`[Heartbeat Failed] Worker ${this.workerId} for Run ${runId}:`, err);
      }
    }, this.heartbeatIntervalMs);
  }

  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public async release(runId: string, status: 'completed' | 'failed' | 'cancelled'): Promise<boolean> {
    this.stopHeartbeat();
    return this.repository.releaseJobLease(runId, this.workerId, status);
  }
}

export class PoisonHandler {
  constructor(
    private readonly repository: LeaseRepository,
    private readonly maxRetries: number = 3,
    private readonly baseBackoffMs: number = 1000
  ) {}

  public async handleFailure(
    runId: string,
    error: Error
  ): Promise<{ shouldRetry: boolean; nextDelayMs: number; isPoison: boolean }> {
    return this.repository.recordJobFailureAndRetry(runId, error, this.maxRetries, this.baseBackoffMs);
  }
}

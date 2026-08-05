export interface StorageDeletionAdapter {
  deleteObject(key: string): Promise<void>;
  deleteMany?(keys: string[]): Promise<{ deletedKeys: string[]; failedKeys: string[] }>;
}

export interface DatabaseDeletionAdapter {
  getExpiredRunIds?(retentionDays: number): Promise<string[]>;
  getRunArtifactStorageKeys(runId: string): Promise<string[]>;
  deleteRunRecords(runId: string): Promise<void>;
  logDeletionAudit(params: {
    runId: string;
    tenantId?: string | null;
    deletedArtifactCount: number;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    errorMessage?: string | null;
  }): Promise<void>;
}

export class RetentionDeletionWorkflow {
  constructor(
    private db: DatabaseDeletionAdapter,
    private storage: StorageDeletionAdapter
  ) {}

  public async executeRetentionJob(retentionDays = 30): Promise<{ processedRuns: number; errors: string[] }> {
    const expiredRunIds = this.db.getExpiredRunIds ? await this.db.getExpiredRunIds(retentionDays) : [];
    const errors: string[] = [];
    let processedRuns = 0;

    for (const runId of expiredRunIds) {
      try {
        await this.purgeRun(runId);
        processedRuns++;
      } catch (err) {
        const msg = `Failed to purge run ${runId}: ${(err as Error).message}`;
        errors.push(msg);
        await this.db.logDeletionAudit({
          runId,
          tenantId: null,
          deletedArtifactCount: 0,
          status: 'FAILED',
          errorMessage: msg,
        });
      }
    }

    return { processedRuns, errors };
  }

  public async purgeRun(runId: string, tenantId?: string): Promise<void> {
    // 1. Fetch all artifact keys linked to the run
    const keysToDelete = await this.db.getRunArtifactStorageKeys(runId);

    // 2. Perform object storage deletion
    const deletedKeys: string[] = [];
    const failedKeys: string[] = [];

    if (this.storage.deleteMany) {
      const result = await this.storage.deleteMany(keysToDelete);
      deletedKeys.push(...result.deletedKeys);
      failedKeys.push(...result.failedKeys);
    } else {
      for (const key of keysToDelete) {
        try {
          await this.storage.deleteObject(key);
          deletedKeys.push(key);
        } catch {
          failedKeys.push(key);
        }
      }
    }

    if (failedKeys.length > 0) {
      await this.db.logDeletionAudit({
        runId,
        tenantId: tenantId ?? null,
        deletedArtifactCount: deletedKeys.length,
        status: 'PARTIAL',
        errorMessage: `Storage cleanup incomplete. Failed keys: ${failedKeys.join(', ')}`,
      });
      throw new Error(`Storage cleanup incomplete for run ${runId}`);
    }

    // 3. Perform cascading database deletion
    await this.db.deleteRunRecords(runId);

    // 4. Log deletion audit
    await this.db.logDeletionAudit({
      runId,
      tenantId: tenantId ?? null,
      deletedArtifactCount: deletedKeys.length,
      status: 'SUCCESS',
      errorMessage: null,
    });
  }
}

import { describe, expect, it } from 'vitest';
import type { DatabaseDeletionAdapter } from '@ai-parallel-web/capture';
import { RetentionDeletionWorkflow } from '@ai-parallel-web/capture';

class MockDatabaseDeletionAdapter implements DatabaseDeletionAdapter {
  public artifactStorageKeys = new Map<string, string[]>();
  public deletedRuns = new Set<string>();
  public deletionAudits: Array<{
    runId: string;
    deletedArtifactCount: number;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  }> = [];

  public async getRunArtifactStorageKeys(runId: string): Promise<string[]> {
    return this.artifactStorageKeys.get(runId) || [];
  }

  public async deleteRunRecords(runId: string): Promise<void> {
    this.deletedRuns.add(runId);
  }

  public async logDeletionAudit(params: {
    runId: string;
    tenantId?: string | null;
    deletedArtifactCount: number;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    errorMessage?: string | null;
  }): Promise<void> {
    this.deletionAudits.push({
      runId: params.runId,
      deletedArtifactCount: params.deletedArtifactCount,
      status: params.status,
    });
  }
}

class MockStorageDeletionAdapter {
  public storedKeys = new Set<string>();

  public async deleteObject(key: string): Promise<void> {
    this.storedKeys.delete(key);
  }

  public async deleteMany(
    keys: string[],
  ): Promise<{ deletedKeys: string[]; failedKeys: string[] }> {
    const deletedKeys: string[] = [];
    const failedKeys: string[] = [];

    for (const k of keys) {
      if (this.storedKeys.has(k)) {
        this.storedKeys.delete(k);
        deletedKeys.push(k);
      } else {
        failedKeys.push(k);
      }
    }

    return { deletedKeys, failedKeys };
  }
}

describe('Retention & Deletion Consistency', () => {
  it('purges run storage artifacts and logs deletion audit successfully', async () => {
    const db = new MockDatabaseDeletionAdapter();
    const storage = new MockStorageDeletionAdapter();
    const workflow = new RetentionDeletionWorkflow(db, storage);

    const runId = '99999999-9999-4000-8000-999999999999';
    const keys = [
      `tenants/tenant-1/runs/${runId}/steps/0/screenshot-sha1`,
      `tenants/tenant-1/runs/${runId}/steps/0/dom-sha2`,
    ];

    db.artifactStorageKeys.set(runId, keys);
    keys.forEach((k) => storage.storedKeys.add(k));

    await workflow.purgeRun(runId, 'tenant-1');

    // Verify storage object deletion
    expect(storage.storedKeys.has(keys[0]!)).toBe(false);
    expect(storage.storedKeys.has(keys[1]!)).toBe(false);

    // Verify database cascade deletion
    expect(db.deletedRuns.has(runId)).toBe(true);

    // Verify deletion audit trail
    expect(db.deletionAudits).toHaveLength(1);
    expect(db.deletionAudits[0]).toEqual({
      runId,
      deletedArtifactCount: 2,
      status: 'SUCCESS',
    });
  });
});

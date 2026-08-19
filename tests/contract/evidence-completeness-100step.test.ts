import { describe, expect, it } from 'vitest';
import { ArtifactCapturePipeline } from '@ai-parallel-web/capture';
import { ManifestGenerator } from '@ai-parallel-web/capture';
import type { StepEvidencePayload } from '@ai-parallel-web/contracts';
import type { PutObjectInput, StorageObjectMetadata } from '@ai-parallel-web/storage';

class MockMemoryStorageAdapter {
  public store = new Map<string, Buffer>();

  public async putObject(input: PutObjectInput): Promise<StorageObjectMetadata> {
    const body =
      typeof input.body === 'string' ? Buffer.from(input.body, 'utf-8') : Buffer.from(input.body);
    this.store.set(input.key, body);
    return {
      key: input.key,
      contentType: input.contentType,
      checksumSha256: input.checksumSha256,
      byteLength: body.length,
    };
  }

  public async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  public async deleteObject(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('Evidence Completeness & Manifest Integrity', () => {
  it('achieves >= 99% evidence completeness in a 100-step test fixture run', async () => {
    const storage = new MockMemoryStorageAdapter();
    const pipeline = new ArtifactCapturePipeline(storage);

    const tenantId = '00000000-0000-4000-8000-000000000001';
    const runId = '11111111-1111-4000-8000-111111111111';
    const personaIds = [
      '22222222-2222-4000-8000-222222222222',
      '33333333-3333-4000-8000-333333333333',
    ];

    const capturedPayloads: StepEvidencePayload[] = [];
    const totalSteps = 100;

    for (let stepIdx = 0; stepIdx < totalSteps; stepIdx++) {
      const personaId = personaIds[stepIdx % 2]!;

      // Simulate step capture (99 successful steps, 1 intentional error step to test incompleteness boundary)
      const isErrorStep = stepIdx === 99;

      const mockBufScreenshot = Buffer.from(`mock_png_data_for_step_${stepIdx}`);
      const mockBufDom = Buffer.from(`<html><body><h1>Step ${stepIdx} content</h1></body></html>`);

      const screenshotRef = await pipeline.processAndUploadArtifact({
        tenantId,
        runId,
        personaId,
        stepIndex: stepIdx,
        artifactType: 'screenshot',
        buffer: mockBufScreenshot,
        mimeType: 'image/png',
      });

      const domRef = await pipeline.processAndUploadArtifact({
        tenantId,
        runId,
        personaId,
        stepIndex: stepIdx,
        artifactType: 'dom_snapshot',
        buffer: mockBufDom,
        mimeType: 'text/html',
      });

      const payload: StepEvidencePayload = {
        runId,
        personaId,
        stepId: `step-${stepIdx}`,
        stepIndex: stepIdx,
        timestampUtc: new Date().toISOString(),
        monotonicDurationNs: (1_000_000n * BigInt(stepIdx + 1)).toString(),
        finalUrl: `https://example.com/page/${stepIdx}`,
        httpOutcome: {
          statusCode: isErrorStep ? 500 : 200,
          ok: !isErrorStep,
          redirectChain: [],
        },
        navigationTimings: {
          startTimeUtc: new Date().toISOString(),
          fetchStartMs: 5,
          domainLookupStartMs: 10,
          domainLookupEndMs: 15,
          connectStartMs: 20,
          connectEndMs: 25,
          requestStartMs: 30,
          responseStartMs: 40,
          responseEndMs: 50,
          domContentLoadedMs: 60,
          loadEventMs: 70,
          totalDurationMs: 75,
        },
        responseMetadata: {
          statusCode: isErrorStep ? 500 : 200,
          statusText: isErrorStep ? 'Internal Server Error' : 'OK',
          url: `https://example.com/page/${stepIdx}`,
          mimeType: 'text/html',
          headers: { 'content-type': 'text/html' },
          protocol: 'http/1.1',
        },
        consoleErrors: [],
        extractionPayload: { itemIndex: stepIdx },
        artifacts: [screenshotRef, domRef],
        redactionAuditLogs: [],
        overallEvidenceState: isErrorStep ? 'MISSING_FAILURE' : 'PRESENT',
      };

      capturedPayloads.push(payload);
    }

    // Generate Manifest
    const manifest = ManifestGenerator.generateManifest(runId, capturedPayloads);

    // Assert Completeness Gate Requirement: >= 99%
    expect(manifest.totalSteps).toBe(100);
    expect(manifest.completedSteps).toBe(99);
    expect(manifest.completenessPercentage).toBeGreaterThanOrEqual(99.0);

    // Assert Cryptographic Hash Integrity
    expect(manifest.manifestSha256).toHaveLength(64);
    expect(manifest.stepChecksums).toHaveLength(100);
    for (const stepSum of manifest.stepChecksums) {
      expect(stepSum.sha256).toHaveLength(64);
    }

    // Verify storage object counts (2 artifacts per step * 100 steps = 200 objects)
    expect(storage.store.size).toBe(200);
  });
});

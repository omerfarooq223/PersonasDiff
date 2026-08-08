import { describe, expect, it } from 'vitest';
import { ExportBuilder } from '@ai-parallel-web/domain';

describe('ExportBuilder Integration Tests', () => {
  const builder = new ExportBuilder();

  it('generates valid JSON and CSV export bundle with matching SHA-256 manifest', () => {
    const runData = {
      id: 'run-12345',
      tenantId: 'tenant-001',
      surfaceId: 'surface-001',
      journeyVersionId: 'journey-v1',
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      configSnapshot: { timeoutMs: 5000 },
      warnings: ['Minor render delay on step 2'],
    };

    const steps = [
      {
        stepIndex: 1,
        stepId: 'step_1',
        actionType: 'navigate',
        status: 'passed',
        finalUrl: 'https://example.com/checkout',
        durationMs: 1250,
        diffScore: 0.02,
        artifactId: 'art-001',
      },
      {
        stepIndex: 2,
        stepId: 'step_2',
        actionType: 'click',
        status: 'passed',
        finalUrl: 'https://example.com/confirmation',
        durationMs: 850,
        diffScore: 0.0,
        artifactId: 'art-002',
      },
    ];

    const artifacts = [
      {
        id: 'art-001',
        type: 'screenshot',
        s3Key: 'artifacts/step_1.png',
        checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        sizeBytes: 1024,
      },
    ];

    const bundle = builder.buildExportBundle(runData, steps, artifacts);

    expect(bundle.manifest.exportVersion).toBe('1.0.0');
    expect(bundle.manifest.runId).toBe('run-12345');
    expect(bundle.manifest.files).toHaveLength(2);

    // Verify SHA-256 hash match for JSON
    const computedJsonHash = builder.computeSha256(bundle.jsonContent);
    const jsonManifestEntry = bundle.manifest.files.find((f) => f.filename === 'run_export.json');
    expect(jsonManifestEntry).toBeDefined();
    expect(jsonManifestEntry?.sha256).toBe(computedJsonHash);

    // Verify SHA-256 hash match for CSV
    const computedCsvHash = builder.computeSha256(bundle.csvContent);
    const csvManifestEntry = bundle.manifest.files.find((f) => f.filename === 'run_export.csv');
    expect(csvManifestEntry).toBeDefined();
    expect(csvManifestEntry?.sha256).toBe(computedCsvHash);

    // Parse JSON export content
    const parsed = JSON.parse(bundle.jsonContent);
    expect(parsed.export_version).toBe('1.0.0');
    expect(parsed.run.id).toBe('run-12345');
    expect(parsed.steps).toHaveLength(2);

    // CSV format validation
    expect(bundle.csvContent).toContain('step_index,step_id,action_type,status');
    expect(bundle.csvContent).toContain('1,"step_1","navigate","passed"');
  });
});

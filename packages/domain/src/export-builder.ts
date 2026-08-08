import { createHash } from 'node:crypto';

export interface ExportManifestFile {
  filename: string;
  sha256: string;
  sizeBytes: number;
}

export interface ExportManifest {
  exportVersion: string;
  generatedAt: string;
  runId: string;
  files: ExportManifestFile[];
}

export interface ExportBundle {
  manifest: ExportManifest;
  manifestHash: string;
  jsonContent: string;
  csvContent: string;
}

export class ExportBuilder {
  public static readonly SCHEMA_VERSION = '1.0.0';

  public buildExportBundle(
    runData: {
      id: string;
      tenantId: string;
      surfaceId?: string;
      journeyVersionId?: string;
      status: string;
      createdAt: string;
      completedAt?: string | null;
      configSnapshot?: Record<string, unknown>;
      warnings?: string[];
    },
    steps: Array<{
      stepIndex: number;
      stepId?: string;
      actionType?: string;
      status: string;
      finalUrl?: string;
      durationMs?: number;
      diffScore?: number;
      artifactId?: string;
      payload?: Record<string, unknown>;
    }>,
    artifacts: Array<{
      id: string;
      type: string;
      s3Key: string;
      checksumSha256: string;
      sizeBytes: number;
    }>,
  ): ExportBundle {
    const timestamp = new Date().toISOString();

    // 1. JSON Export
    const jsonPayload = {
      export_version: ExportBuilder.SCHEMA_VERSION,
      generated_at: timestamp,
      run: {
        id: runData.id,
        tenant_id: runData.tenantId,
        surface_id: runData.surfaceId,
        journey_version_id: runData.journeyVersionId,
        status: runData.status,
        created_at: runData.createdAt,
        completed_at: runData.completedAt ?? null,
      },
      configuration_snapshot: runData.configSnapshot ?? {},
      metric_definitions: {
        duration_ms: 'Total step navigation latency in milliseconds',
        diff_score: 'Visual structural divergence index (0.0 to 1.0)',
      },
      warnings: runData.warnings ?? [],
      artifact_index: artifacts.map((art) => ({
        id: art.id,
        type: art.type,
        s3_key: art.s3Key,
        checksum_sha256: art.checksumSha256,
        size_bytes: art.sizeBytes,
      })),
      steps: steps.map((s) => ({
        step_index: s.stepIndex,
        step_id: s.stepId ?? `step_${s.stepIndex}`,
        action_type: s.actionType ?? 'navigate',
        status: s.status,
        final_url: s.finalUrl ?? null,
        duration_ms: s.durationMs ?? 0,
        diff_score: s.diffScore ?? 0,
        artifact_id: s.artifactId ?? null,
        payload: s.payload ?? {},
      })),
    };

    const jsonContent = JSON.stringify(jsonPayload, null, 2);

    // 2. CSV Export
    const csvHeader =
      'step_index,step_id,action_type,status,final_url,duration_ms,diff_score,artifact_id';
    const csvRows = steps.map((s) =>
      [
        s.stepIndex,
        `"${s.stepId ?? `step_${s.stepIndex}`}"`,
        `"${s.actionType ?? 'navigate'}"`,
        `"${s.status}"`,
        `"${s.finalUrl ?? ''}"`,
        s.durationMs ?? 0,
        s.diffScore ?? 0,
        `"${s.artifactId ?? ''}"`,
      ].join(','),
    );
    const csvContent = [csvHeader, ...csvRows].join('\n');

    // 3. Hashes and Manifest
    const jsonHash = this.computeSha256(jsonContent);
    const csvHash = this.computeSha256(csvContent);

    const manifest: ExportManifest = {
      exportVersion: ExportBuilder.SCHEMA_VERSION,
      generatedAt: timestamp,
      runId: runData.id,
      files: [
        {
          filename: 'run_export.json',
          sha256: jsonHash,
          sizeBytes: Buffer.byteLength(jsonContent),
        },
        { filename: 'run_export.csv', sha256: csvHash, sizeBytes: Buffer.byteLength(csvContent) },
      ],
    };

    const manifestString = JSON.stringify(manifest, null, 2);
    const manifestHash = this.computeSha256(manifestString);

    return {
      manifest,
      manifestHash,
      jsonContent,
      csvContent,
    };
  }

  public computeSha256(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }
}

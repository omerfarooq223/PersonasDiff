import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface DbPoolQueryable {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
}

export interface RestoreVerificationReport {
  totalArtifactsChecked: number;
  validCount: number;
  missingKeys: string[];
  failedKeys: string[];
}

export class RestoreVerifier {
  private client: S3Client;

  constructor(
    private readonly pool: DbPoolQueryable,
    private readonly bucket: string,
    s3Config: { region: string; endpoint?: string; accessKeyId?: string; secretAccessKey?: string; forcePathStyle?: boolean }
  ) {
    const config: Record<string, unknown> = {
      region: s3Config.region,
      forcePathStyle: s3Config.forcePathStyle ?? false,
    };
    if (s3Config.endpoint) {
      config.endpoint = s3Config.endpoint;
    }
    if (s3Config.accessKeyId && s3Config.secretAccessKey) {
      config.credentials = {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      };
    }
    this.client = new S3Client(config as any);
  }

  public async verifyRestoredMetadata(): Promise<RestoreVerificationReport> {
    const res = await this.pool.query<{ storage_key: string; sha256: string }>(
      `SELECT storage_key, sha256 FROM step_artifacts WHERE storage_key IS NOT NULL`
    );

    const report: RestoreVerificationReport = {
      totalArtifactsChecked: res.rows.length,
      validCount: 0,
      missingKeys: [],
      failedKeys: [],
    };

    for (const row of res.rows) {
      try {
        const head = await this.client.send(
          new HeadObjectCommand({ Bucket: this.bucket, Key: row.storage_key })
        );
        if (head) {
          report.validCount++;
        } else {
          report.missingKeys.push(row.storage_key);
        }
      } catch (err: any) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
          report.missingKeys.push(row.storage_key);
        } else {
          report.failedKeys.push(row.storage_key);
        }
      }
    }

    return report;
  }
}

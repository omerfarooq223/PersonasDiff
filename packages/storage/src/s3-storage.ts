import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type {
  PutObjectInput,
  S3StorageConfig,
  StorageAdapter,
  StorageObjectMetadata,
} from './types.js';

export function createS3Storage(config: S3StorageConfig): StorageAdapter {
  const clientConfig: S3ClientConfig = {
    forcePathStyle: config.forcePathStyle ?? false,
    region: config.region,
  };
  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
  }
  if (config.accessKeyId && config.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };
  }

  const client = new S3Client(clientConfig);
  const defaultRetentionDays = config.defaultRetentionDays ?? 30;

  return {
    async deleteObject(key: string): Promise<void> {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }),
      );
    },

    async getSignedUrl(key: string, options = {}): Promise<string> {
      const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      });
      return getSignedUrl(client, command, {
        expiresIn: options.expiresInSeconds ?? 900,
      });
    },

    async healthCheck(): Promise<boolean> {
      try {
        await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
        return true;
      } catch {
        return false;
      }
    },

    async putObject(input: PutObjectInput): Promise<StorageObjectMetadata> {
      const { createHash } = await import('node:crypto');
      const body =
        typeof input.body === 'string' ? Buffer.from(input.body, 'utf8') : Buffer.from(input.body);
      const checksum = createHash('sha256').update(body).digest('hex');
      if (checksum !== input.checksumSha256) {
        throw new Error('Checksum mismatch for storage upload');
      }

      const retentionDays = input.retentionDays ?? defaultRetentionDays;
      const retentionExpiresAt = new Date(Date.now() + retentionDays * 86_400_000).toISOString();
      const retentionTag = `retention-${retentionDays}d`;

      await client.send(
        new PutObjectCommand({
          Body: body,
          Bucket: config.bucket,
          ContentType: input.contentType,
          Key: input.key,
          Metadata: {
            checksumsha256: input.checksumSha256,
            retentionexpiresat: retentionExpiresAt,
            retentiontag: retentionTag,
          },
          ServerSideEncryption: config.serverSideEncryption ?? 'AES256',
        }),
      );

      return {
        byteLength: body.byteLength,
        checksumSha256: input.checksumSha256,
        contentType: input.contentType,
        key: input.key,
        retentionExpiresAt,
        retentionTag,
      };
    },
  };
}

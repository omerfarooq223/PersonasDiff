export interface StorageObjectMetadata {
  key: string;
  contentType: string;
  checksumSha256: string;
  byteLength: number;
  retentionTag?: string;
  retentionExpiresAt?: string;
}

export interface PutObjectInput {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  checksumSha256: string;
  retentionDays?: number;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
}

export interface StorageAdapter {
  putObject(input: PutObjectInput): Promise<StorageObjectMetadata>;
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  deleteObject(key: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface S3StorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  defaultRetentionDays?: number;
  serverSideEncryption?: 'AES256' | 'aws:kms';
}

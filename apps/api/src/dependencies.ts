import {
  checkDatabaseHealth,
  createPool,
  defaultMigrationsDirectory,
  runMigrations,
  seedDevelopmentData,
} from '@ai-parallel-web/db';
import {
  createS3Storage,
  type S3StorageConfig,
  type StorageAdapter,
} from '@ai-parallel-web/storage';
import { Redis } from 'ioredis';
import type pg from 'pg';

import type { ApiConfig } from './config.js';

export interface AppDependencies {
  db: pg.Pool | null;
  redis: Redis | null;
  storage: StorageAdapter | null;
}

function buildStorageConfig(config: ApiConfig): S3StorageConfig | null {
  if (!config.s3.bucket) {
    return null;
  }

  const storageConfig: S3StorageConfig = {
    bucket: config.s3.bucket,
    defaultRetentionDays: config.s3.defaultRetentionDays,
    forcePathStyle: config.s3.forcePathStyle,
    region: config.s3.region,
  };

  if (config.s3.endpoint) {
    storageConfig.endpoint = config.s3.endpoint;
  }
  if (config.s3.accessKeyId) {
    storageConfig.accessKeyId = config.s3.accessKeyId;
  }
  if (config.s3.secretAccessKey) {
    storageConfig.secretAccessKey = config.s3.secretAccessKey;
  }

  return storageConfig;
}

export async function createDependencies(config: ApiConfig): Promise<AppDependencies> {
  let db: pg.Pool | null = null;
  let redis: Redis | null = null;
  let storage: StorageAdapter | null = null;

  if (config.databaseUrl) {
    db = createPool(config.databaseUrl);
    await runMigrations(db, defaultMigrationsDirectory());
    if (config.seedOnStartup && config.appEnv === 'development') {
      await seedDevelopmentData(db);
    }
  }

  if (config.redisUrl) {
    redis = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    await redis.connect();
  }

  const storageConfig = buildStorageConfig(config);
  if (storageConfig) {
    storage = createS3Storage(storageConfig);
  }

  return { db, redis, storage };
}

export async function checkDependencyHealth(deps: AppDependencies): Promise<{
  database: boolean;
  redis: boolean;
  storage: boolean;
}> {
  const database = deps.db ? await checkDatabaseHealth(deps.db) : false;
  let redis = false;
  if (deps.redis) {
    try {
      redis = (await deps.redis.ping()) === 'PONG';
    } catch {
      redis = false;
    }
  }
  const storage = deps.storage ? await deps.storage.healthCheck() : false;
  return { database, redis, storage };
}

export async function closeDependencies(deps: AppDependencies): Promise<void> {
  await deps.db?.end();
  if (deps.redis) {
    await deps.redis.quit();
  }
}

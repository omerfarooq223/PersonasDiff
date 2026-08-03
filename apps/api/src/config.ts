export type AppEnvironment = 'development' | 'staging' | 'production' | 'test';

export interface ApiConfig {
  appEnv: AppEnvironment;
  databaseUrl: string | null;
  defaultPageSize: number;
  host: string;
  logLevel: string;
  maxPageSize: number;
  port: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  redisUrl: string | null;
  releaseSha: string;
  s3: {
    accessKeyId: string | null;
    bucket: string | null;
    defaultRetentionDays: number;
    endpoint: string | null;
    forcePathStyle: boolean;
    region: string;
    secretAccessKey: string | null;
  };
  seedOnStartup: boolean;
}

const validEnvironments = new Set<AppEnvironment>(['development', 'staging', 'production', 'test']);

function parsePort(value: string | undefined): number {
  const port = Number(value ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535');
  }
  return port;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid integer: ${value}`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const appEnv = env.APP_ENV ?? 'development';
  if (!validEnvironments.has(appEnv as AppEnvironment)) {
    throw new Error(`APP_ENV is invalid: ${appEnv}`);
  }

  return {
    appEnv: appEnv as AppEnvironment,
    databaseUrl: env.DATABASE_URL ?? null,
    defaultPageSize: parsePositiveInt(env.API_DEFAULT_PAGE_SIZE, 20),
    host: env.API_HOST ?? '0.0.0.0',
    logLevel: env.LOG_LEVEL ?? 'info',
    maxPageSize: parsePositiveInt(env.API_MAX_PAGE_SIZE, 100),
    port: parsePort(env.API_PORT),
    rateLimitMax: parsePositiveInt(env.API_RATE_LIMIT_MAX, 120),
    rateLimitWindowMs: parsePositiveInt(env.API_RATE_LIMIT_WINDOW_MS, 60_000),
    redisUrl: env.REDIS_URL ?? null,
    releaseSha: env.RELEASE_SHA ?? 'local',
    s3: {
      accessKeyId: env.S3_ACCESS_KEY ?? null,
      bucket: env.S3_BUCKET ?? null,
      defaultRetentionDays: parsePositiveInt(env.EVIDENCE_RETENTION_DAYS, 30),
      endpoint: env.S3_ENDPOINT ?? null,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      region: env.S3_REGION ?? 'us-east-1',
      secretAccessKey: env.S3_SECRET_KEY ?? null,
    },
    seedOnStartup: env.SEED_ON_STARTUP !== 'false',
  };
}

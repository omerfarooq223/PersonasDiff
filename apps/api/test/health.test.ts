import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import type { AppDependencies } from '../src/dependencies.js';

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

const emptyDeps: AppDependencies = {
  db: null,
  redis: null,
  storage: null,
};

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

describe('health endpoints', () => {
  it('returns liveness without exposing secrets', async () => {
    const app = await buildApp(
      {
        appEnv: 'test',
        databaseUrl: null,
        defaultPageSize: 20,
        host: '127.0.0.1',
        logLevel: 'silent',
        maxPageSize: 100,
        port: 3000,
        rateLimitMax: 1000,
        rateLimitWindowMs: 60_000,
        redisUrl: null,
        releaseSha: 'test-sha',
        s3: {
          accessKeyId: null,
          bucket: null,
          defaultRetentionDays: 30,
          endpoint: null,
          forcePathStyle: false,
          region: 'us-east-1',
          secretAccessKey: null,
        },
        seedOnStartup: false,
      },
      emptyDeps,
    );
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ service: 'api', status: 'ok' });
  });

  it('reports the deployment identity on readiness', async () => {
    const app = await buildApp(
      {
        appEnv: 'staging',
        databaseUrl: null,
        defaultPageSize: 20,
        host: '127.0.0.1',
        logLevel: 'silent',
        maxPageSize: 100,
        port: 3000,
        rateLimitMax: 1000,
        rateLimitWindowMs: 60_000,
        redisUrl: null,
        releaseSha: 'abc123',
        s3: {
          accessKeyId: null,
          bucket: null,
          defaultRetentionDays: 30,
          endpoint: null,
          forcePathStyle: false,
          region: 'us-east-1',
          secretAccessKey: null,
        },
        seedOnStartup: false,
      },
      emptyDeps,
    );
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      environment: 'staging',
      release: 'abc123',
      status: 'ready',
    });
  });
});

describe('run authorization', () => {
  it('rejects unauthenticated run creation', async () => {
    const app = await buildApp(
      {
        appEnv: 'test',
        databaseUrl: null,
        defaultPageSize: 20,
        host: '127.0.0.1',
        logLevel: 'silent',
        maxPageSize: 100,
        port: 3000,
        rateLimitMax: 1000,
        rateLimitWindowMs: 60_000,
        redisUrl: null,
        releaseSha: 'test-sha',
        s3: {
          accessKeyId: null,
          bucket: null,
          defaultRetentionDays: 30,
          endpoint: null,
          forcePathStyle: false,
          region: 'us-east-1',
          secretAccessKey: null,
        },
        seedOnStartup: false,
      },
      emptyDeps,
    );
    apps.push(app);

    const response = await app.inject({
      headers: {
        'idempotency-key': 'idem-key-1234567890',
      },
      method: 'POST',
      payload: {
        journeyVersionId: '00000000-0000-4000-8000-000000000020',
        personaVersionIds: [
          '00000000-0000-4000-8000-000000000030',
          '00000000-0000-4000-8000-000000000031',
        ],
        surfaceId: '00000000-0000-4000-8000-000000000010',
      },
      url: '/v1/runs',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      status: 401,
      title: 'Unauthorized',
    });
  });
});

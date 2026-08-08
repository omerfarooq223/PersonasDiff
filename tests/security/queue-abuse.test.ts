import { describe, expect, it } from 'vitest';
import { buildApp } from '../../apps/api/src/app.js';
import type { AppDependencies } from '../../apps/api/src/dependencies.js';

const emptyDeps: AppDependencies = {
  db: null,
  redis: null,
  storage: null,
};

describe('Queue Abuse & Rate Limiting Security Tests', () => {
  it('enforces rate limiting when max requests threshold is exceeded', async () => {
    const app = await buildApp(
      {
        appEnv: 'test',
        databaseUrl: null,
        defaultPageSize: 20,
        host: '127.0.0.1',
        logLevel: 'silent',
        maxPageSize: 100,
        port: 0,
        rateLimitMax: 3,
        rateLimitWindowMs: 60000,
        redisUrl: null,
        releaseSha: 'test',
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

    const results = [];
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: 'GET',
        url: '/health/live',
      });
      results.push(res.statusCode);
    }

    expect(results.slice(0, 3)).toEqual([200, 200, 200]);
    expect(results[3]).toBe(429);
    expect(results[4]).toBe(429);

    await app.close();
  });

  it('rejects unauthenticated attempts to create runs with 401', async () => {
    const app = await buildApp(
      {
        appEnv: 'test',
        databaseUrl: null,
        defaultPageSize: 20,
        host: '127.0.0.1',
        logLevel: 'silent',
        maxPageSize: 100,
        port: 0,
        rateLimitMax: 100,
        rateLimitWindowMs: 60000,
        redisUrl: null,
        releaseSha: 'test',
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

    const res = await app.inject({
      headers: {
        'idempotency-key': '00000000-0000-0000-0000-000000000001',
      },
      method: 'POST',
      payload: {
        journeyVersionId: '00000000-0000-4000-8000-000000000001',
        personaVersionIds: [
          '00000000-0000-4000-8000-000000000002',
          '00000000-0000-4000-8000-000000000003',
        ],
        surfaceId: '00000000-0000-4000-8000-000000000004',
      },
      url: '/v1/runs',
    });

    expect(res.statusCode).toBe(401);
    await app.close();
  });
});

import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

describe('health endpoints', () => {
  it('returns liveness without exposing secrets', async () => {
    const app = buildApp({
      appEnv: 'test',
      host: '127.0.0.1',
      logLevel: 'silent',
      port: 3000,
      releaseSha: 'test-sha',
    });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ service: 'api', status: 'ok' });
  });

  it('reports the deployment identity on readiness', async () => {
    const app = buildApp({
      appEnv: 'staging',
      host: '127.0.0.1',
      logLevel: 'silent',
      port: 3000,
      releaseSha: 'abc123',
    });
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

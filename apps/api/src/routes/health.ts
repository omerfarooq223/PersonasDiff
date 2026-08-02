import type { FastifyInstance } from 'fastify';

import type { ApiConfig } from '../config.js';

export function registerHealthRoutes(app: FastifyInstance, config: ApiConfig): void {
  app.get('/health/live', async () => ({
    service: 'api',
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health/ready', async () => ({
    environment: config.appEnv,
    release: config.releaseSha,
    service: 'api',
    status: 'ready',
    timestamp: new Date().toISOString(),
  }));
}

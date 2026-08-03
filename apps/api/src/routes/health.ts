import type { FastifyInstance } from 'fastify';

import type { ApiConfig } from '../config.js';
import type { AppDependencies } from '../dependencies.js';
import { checkDependencyHealth } from '../dependencies.js';

export function registerHealthRoutes(
  app: FastifyInstance,
  config: ApiConfig,
  deps: AppDependencies,
): void {
  app.get('/health/live', async () => ({
    service: 'api',
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health/ready', async (_request, reply) => {
    const checks = await checkDependencyHealth(deps);
    const ready =
      deps.db === null ||
      (checks.database && (!deps.redis || checks.redis) && (!deps.storage || checks.storage));

    const body = {
      checks,
      environment: config.appEnv,
      release: config.releaseSha,
      service: 'api',
      status: ready ? ('ready' as const) : ('degraded' as const),
      timestamp: new Date().toISOString(),
    };

    if (!ready) {
      return reply.status(503).send(body);
    }

    return body;
  });
}

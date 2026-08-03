import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

import { buildProblem } from './auth.js';
import { loadConfig, type ApiConfig } from './config.js';
import { type AppDependencies, createDependencies } from './dependencies.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerRunRoutes } from './routes/runs.js';

declare module 'fastify' {
  interface FastifyInstance {
    appConfig: ApiConfig;
    appDependencies: AppDependencies;
  }
}

export async function buildApp(
  config: ApiConfig = loadConfig(),
  deps?: AppDependencies,
): Promise<FastifyInstance> {
  const resolvedDeps = deps ?? (await createDependencies(config));

  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    requestIdHeader: 'x-request-id',
  });

  app.decorate('appConfig', config);
  app.decorate('appDependencies', resolvedDeps);

  await app.register(rateLimit, {
    global: true,
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
  });

  registerHealthRoutes(app, config, resolvedDeps);
  registerRunRoutes(app, config, resolvedDeps);

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request failed');
    void reply.status(500).send(
      buildProblem({
        detail: 'The request could not be completed.',
        requestId: request.id,
        status: 500,
        title: 'Internal Server Error',
        type: 'internal-error',
      }),
    );
  });

  app.addHook('onClose', async () => {
    if (!deps) {
      const { closeDependencies } = await import('./dependencies.js');
      await closeDependencies(resolvedDeps);
    }
  });

  return app;
}

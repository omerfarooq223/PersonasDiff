import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

import { buildProblem } from './auth.js';
import { loadConfig, type ApiConfig } from './config.js';
import { type AppDependencies, createDependencies } from './dependencies.js';
import { createBackpressureMiddleware } from './middleware/backpressure.js';
import { registerExportRoutes } from './routes/exports.js';
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

  app.addHook('onRequest', async (_request, reply) => {
    void reply.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';",
    );
    void reply.header('X-Content-Type-Options', 'nosniff');
    void reply.header('X-Frame-Options', 'DENY');
    void reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  });

  app.addHook('preHandler', createBackpressureMiddleware(resolvedDeps.db));

  registerHealthRoutes(app, config, resolvedDeps);
  registerRunRoutes(app, config, resolvedDeps);
  registerExportRoutes(app, resolvedDeps);

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request failed');
    const status = error.statusCode ?? 500;
    void reply.status(status).send(
      buildProblem({
        detail: error.message || 'The request could not be completed.',
        requestId: request.id,
        status,
        title: status === 429 ? 'Too Many Requests' : 'Internal Server Error',
        type: status === 429 ? 'rate-limit-exceeded' : 'internal-error',
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

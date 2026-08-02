import Fastify, { type FastifyInstance } from 'fastify';

import { loadConfig, type ApiConfig } from './config.js';
import { registerHealthRoutes } from './routes/health.js';

export function buildApp(config: ApiConfig = loadConfig()): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    requestIdHeader: 'x-request-id',
  });

  app.decorate('appConfig', config);
  registerHealthRoutes(app, config);

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request failed');
    void reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'The request could not be completed.',
        requestId: request.id,
      },
    });
  });

  return app;
}

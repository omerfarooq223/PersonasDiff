import type { FastifyReply, FastifyRequest } from 'fastify';

export interface DbPoolQueryable {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
}

export interface BackpressureOptions {
  maxQueueDepth?: number;
  maxActivePerSurface?: number;
}

export function createBackpressureMiddleware(
  db: DbPoolQueryable | null,
  options: BackpressureOptions = {}
) {
  const maxQueueDepth = options.maxQueueDepth ?? 1000;
  const maxActivePerSurface = options.maxActivePerSurface ?? 2;

  return async function backpressureHandler(request: FastifyRequest, reply: FastifyReply) {
    if (!db) return;

    // 1. Check Global Pending/Queued Queue Depth
    try {
      const depthRes = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM runs WHERE status = 'queued'`
      );
      const currentQueueDepth = Number(depthRes.rows[0]?.count ?? '0');

      if (currentQueueDepth >= maxQueueDepth) {
        reply.header('Retry-After', '60');
        return reply.status(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'System queue capacity reached. Please back off before submitting new comparison runs.',
        });
      }
    } catch (err) {
      // In case DB fails, pass through or log
      request.log.error(err, 'Queue depth check failed in backpressure middleware');
    }

    // 2. Check Surface/Origin Concurrency
    const body = request.body as { surfaceId?: string } | undefined;
    if (body?.surfaceId) {
      try {
        const activeRes = await db.query<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM runs WHERE surface_id = $1 AND status = 'running'`,
          [body.surfaceId]
        );
        const activeCount = Number(activeRes.rows[0]?.count ?? '0');

        if (activeCount >= maxActivePerSurface) {
          reply.header('Retry-After', '15');
          return reply.status(429).send({
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Surface concurrency limit (${maxActivePerSurface}) reached for surface ${body.surfaceId}.`,
          });
        }
      } catch (err) {
        request.log.error(err, 'Surface concurrency check failed in backpressure middleware');
      }
    }
  };
}

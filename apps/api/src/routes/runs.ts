import { canCancelRun, canCreateRun, canListRuns, canViewAudit } from '@ai-parallel-web/auth';
import {
  createRun,
  findIdempotencyRecord,
  findJourneyVersionById,
  findPersonaVersionsByIds,
  findRunById,
  findSurfaceById,
  findUserByToken,
  hashRequestBody,
  insertAuditEvent,
  listAuditEvents,
  listRuns,
  saveIdempotencyRecord,
  transitionRunStatus,
} from '@ai-parallel-web/db';
import type { FastifyInstance } from 'fastify';

import { buildProblem, parseBearerToken, requireRole, toAuthenticatedUser } from '../auth.js';
import type { ApiConfig } from '../config.js';
import type { AppDependencies } from '../dependencies.js';

interface CreateRunBody {
  journeyVersionId: string;
  personaVersionIds: string[];
  surfaceId: string;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateCreateRunBody(body: unknown): CreateRunBody | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (
    typeof record.journeyVersionId !== 'string' ||
    typeof record.surfaceId !== 'string' ||
    !Array.isArray(record.personaVersionIds)
  ) {
    return null;
  }
  const personaVersionIds = record.personaVersionIds.filter(
    (value): value is string => typeof value === 'string',
  );
  if (
    !isUuid(record.journeyVersionId) ||
    !isUuid(record.surfaceId) ||
    personaVersionIds.length < 2 ||
    personaVersionIds.length !== record.personaVersionIds.length ||
    new Set(personaVersionIds).size !== personaVersionIds.length
  ) {
    return null;
  }
  for (const id of personaVersionIds) {
    if (!isUuid(id)) {
      return null;
    }
  }
  return {
    journeyVersionId: record.journeyVersionId,
    personaVersionIds,
    surfaceId: record.surfaceId,
  };
}

function publicRun(run: { id: string; status: string; createdAt: string }): {
  id: string;
  status: string;
  createdAt: string;
} {
  return {
    createdAt: run.createdAt,
    id: run.id,
    status: run.status,
  };
}

function serviceUnavailable(requestId: string) {
  return buildProblem({
    detail: 'Database is unavailable.',
    requestId,
    status: 503,
    title: 'Service Unavailable',
    type: 'service-unavailable',
  });
}

export function registerRunRoutes(
  app: FastifyInstance,
  config: ApiConfig,
  deps: AppDependencies,
): void {
  app.addHook('preHandler', async (request) => {
    request.authUser = null;
    request.correlationId =
      typeof request.headers['x-correlation-id'] === 'string' &&
      request.headers['x-correlation-id'].length > 0
        ? request.headers['x-correlation-id']
        : request.id;

    const token = parseBearerToken(request.headers.authorization);
    if (token && deps.db) {
      const user = await findUserByToken(deps.db, token);
      if (user) {
        request.authUser = toAuthenticatedUser(user);
      }
    }
  });

  app.post<{ Body: unknown }>('/v1/runs', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canCreateRun,
      'Operator or admin role is required to create runs.',
    );
    if (!user) {
      if (deps.db) {
        await insertAuditEvent(deps.db, {
          action: 'run.create',
          actorId: null,
          correlationId: request.correlationId,
          outcome: 'denied',
          requestId: request.id,
          resourceId: null,
          resourceType: 'run',
          tenantId: '00000000-0000-4000-8000-000000000000',
        }).catch(() => undefined);
      }
      return;
    }

    if (!deps.db) {
      return reply.status(503).send(serviceUnavailable(request.id));
    }

    const idempotencyKey = request.headers['idempotency-key'];
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.length < 16 ||
      idempotencyKey.length > 128
    ) {
      return reply.status(400).send(
        buildProblem({
          detail: 'Idempotency-Key header must be between 16 and 128 characters.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'invalid-idempotency-key',
        }),
      );
    }

    const body = validateCreateRunBody(request.body);
    if (!body) {
      return reply.status(400).send(
        buildProblem({
          detail: 'Request body failed validation.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'validation-error',
        }),
      );
    }

    const requestHash = hashRequestBody(body);
    const existing = await findIdempotencyRecord(deps.db, user.tenantId, idempotencyKey);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return reply.status(409).send(
          buildProblem({
            detail: 'Idempotency-Key was reused with a different request body.',
            requestId: request.id,
            status: 409,
            title: 'Conflict',
            type: 'idempotency-conflict',
          }),
        );
      }
      return reply.status(existing.responseStatus).send(existing.responseBody);
    }

    const surface = await findSurfaceById(deps.db, user.tenantId, body.surfaceId);
    if (!surface || surface.status !== 'approved') {
      await insertAuditEvent(deps.db, {
        action: 'run.create',
        actorId: user.id,
        correlationId: request.correlationId,
        metadata: { reason: 'surface_not_found_or_not_approved' },
        outcome: 'denied',
        requestId: request.id,
        resourceId: null,
        resourceType: 'run',
        tenantId: user.tenantId,
      });
      return reply.status(403).send(
        buildProblem({
          detail: 'Surface is not available for this tenant.',
          requestId: request.id,
          status: 403,
          title: 'Forbidden',
          type: 'surface-forbidden',
        }),
      );
    }

    const journey = await findJourneyVersionById(deps.db, user.tenantId, body.journeyVersionId);
    if (!journey || journey.surface_id !== body.surfaceId) {
      return reply.status(400).send(
        buildProblem({
          detail: 'Journey version is invalid for the requested surface.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'invalid-journey',
        }),
      );
    }

    const personas = await findPersonaVersionsByIds(deps.db, user.tenantId, body.personaVersionIds);
    if (personas.length !== body.personaVersionIds.length) {
      return reply.status(400).send(
        buildProblem({
          detail: 'One or more persona versions are invalid for this tenant.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'invalid-persona',
        }),
      );
    }

    const run = await createRun(deps.db, {
      correlationId: request.correlationId,
      createdBy: user.id,
      journeyVersionId: body.journeyVersionId,
      personaVersionIds: body.personaVersionIds,
      surfaceId: body.surfaceId,
      tenantId: user.tenantId,
    });

    const responseBody = publicRun(run);
    await saveIdempotencyRecord(
      deps.db,
      user.tenantId,
      idempotencyKey,
      requestHash,
      202,
      responseBody,
    );
    await insertAuditEvent(deps.db, {
      action: 'run.create',
      actorId: user.id,
      correlationId: request.correlationId,
      outcome: 'success',
      requestId: request.id,
      resourceId: run.id,
      resourceType: 'run',
      tenantId: user.tenantId,
    });

    return reply.status(202).send(responseBody);
  });

  app.get<{ Params: { id: string } }>('/v1/runs/:id', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canListRuns,
      'Viewer, operator, or admin role is required.',
    );
    if (!user) {
      return;
    }

    if (!deps.db) {
      return reply.status(503).send(serviceUnavailable(request.id));
    }

    if (!isUuid(request.params.id)) {
      return reply.status(400).send(
        buildProblem({
          detail: 'Run id must be a UUID.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'validation-error',
        }),
      );
    }

    const run = await findRunById(deps.db, user.tenantId, request.params.id);
    if (!run) {
      return reply.status(404).send(
        buildProblem({
          detail: 'Run was not found.',
          requestId: request.id,
          status: 404,
          title: 'Not Found',
          type: 'run-not-found',
        }),
      );
    }

    return reply.send({
      ...publicRun(run),
      correlationId: run.correlationId,
      journeyVersionId: run.journeyVersionId,
      personaVersionIds: run.personaVersionIds,
      surfaceId: run.surfaceId,
    });
  });

  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/v1/runs',
    async (request, reply) => {
      const user = requireRole(
        request,
        reply,
        canListRuns,
        'Viewer, operator, or admin role is required.',
      );
      if (!user) {
        return;
      }

      if (!deps.db) {
        return reply.status(503).send(serviceUnavailable(request.id));
      }

      const limit = Math.min(
        Number(request.query.limit ?? config.defaultPageSize),
        config.maxPageSize,
      );
      const offset = Number(request.query.offset ?? 0);
      if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(offset) || offset < 0) {
        return reply.status(400).send(
          buildProblem({
            detail: 'Pagination parameters are invalid.',
            requestId: request.id,
            status: 400,
            title: 'Bad Request',
            type: 'validation-error',
          }),
        );
      }

      const page = await listRuns(deps.db, user.tenantId, limit, offset);
      return reply.send({
        items: page.runs.map(publicRun),
        limit,
        offset,
        total: page.total,
      });
    },
  );

  app.post<{ Params: { id: string } }>('/v1/runs/:id/cancel', async (request, reply) => {
    const user = requireRole(
      request,
      reply,
      canCancelRun,
      'Operator or admin role is required to cancel runs.',
    );
    if (!user) {
      return;
    }

    if (!deps.db) {
      return reply.status(503).send(serviceUnavailable(request.id));
    }

    if (!isUuid(request.params.id)) {
      return reply.status(400).send(
        buildProblem({
          detail: 'Run id must be a UUID.',
          requestId: request.id,
          status: 400,
          title: 'Bad Request',
          type: 'validation-error',
        }),
      );
    }

    try {
      const run = await transitionRunStatus(deps.db, user.tenantId, request.params.id, 'cancelled');
      if (!run) {
        return reply.status(404).send(
          buildProblem({
            detail: 'Run was not found.',
            requestId: request.id,
            status: 404,
            title: 'Not Found',
            type: 'run-not-found',
          }),
        );
      }

      await insertAuditEvent(deps.db, {
        action: 'run.cancel',
        actorId: user.id,
        correlationId: request.correlationId,
        outcome: 'success',
        requestId: request.id,
        resourceId: run.id,
        resourceType: 'run',
        tenantId: user.tenantId,
      });

      return reply.send(publicRun(run));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Illegal run transition')) {
        return reply.status(409).send(
          buildProblem({
            detail: error.message,
            requestId: request.id,
            status: 409,
            title: 'Conflict',
            type: 'illegal-transition',
          }),
        );
      }
      throw error;
    }
  });

  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/v1/admin/audit-events',
    async (request, reply) => {
      const user = requireRole(
        request,
        reply,
        canViewAudit,
        'Admin role is required to view audit events.',
      );
      if (!user) {
        return;
      }

      if (!deps.db) {
        return reply.status(503).send(serviceUnavailable(request.id));
      }

      const limit = Math.min(
        Number(request.query.limit ?? config.defaultPageSize),
        config.maxPageSize,
      );
      const offset = Number(request.query.offset ?? 0);
      const page = await listAuditEvents(deps.db, user.tenantId, limit, offset);
      return reply.send({
        items: page.events,
        limit,
        offset,
        total: page.total,
      });
    },
  );
}

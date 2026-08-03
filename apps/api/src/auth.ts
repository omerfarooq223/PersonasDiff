import type { Role } from '@ai-parallel-web/auth';
import type { UserRow } from '@ai-parallel-web/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthenticatedUser | null;
    correlationId: string;
  }
}

export function toAuthenticatedUser(user: UserRow): AuthenticatedUser {
  return {
    email: user.email,
    id: user.id,
    role: user.role,
    tenantId: user.tenant_id,
  };
}

export function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): AuthenticatedUser | null {
  if (!request.authUser) {
    void reply.status(401).send(
      buildProblem({
        detail: 'A valid bearer token is required.',
        requestId: request.id,
        status: 401,
        title: 'Unauthorized',
        type: 'unauthorized',
      }),
    );
    return null;
  }
  return request.authUser;
}

export function requireRole(
  request: FastifyRequest,
  reply: FastifyReply,
  predicate: (role: Role) => boolean,
  detail: string,
): AuthenticatedUser | null {
  const user = requireAuth(request, reply);
  if (!user) {
    return null;
  }
  if (!predicate(user.role)) {
    void reply.status(403).send(
      buildProblem({
        detail,
        requestId: request.id,
        status: 403,
        title: 'Forbidden',
        type: 'forbidden',
      }),
    );
    return null;
  }
  return user;
}

export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail?: string;
  requestId: string;
}

export function buildProblem(input: ProblemBody): ProblemBody {
  return input;
}

export function parseBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authorizationHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

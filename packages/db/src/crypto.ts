import { createHash } from 'node:crypto';

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashRequestBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

import { describe, expect, it, vi } from 'vitest';
import { createBackpressureMiddleware } from '../../apps/api/src/middleware/backpressure.js';
import type { DbPoolQueryable } from '../../apps/api/src/middleware/backpressure.js';

describe('Failure Injection: Target Timeout & Per-Surface Back-Pressure', () => {
  it('returns HTTP 429 with Retry-After header when surface concurrency limit is exceeded', async () => {
    const mockDb: DbPoolQueryable = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("status = 'queued'")) {
          return Promise.resolve({ rows: [{ count: '10' }] });
        }
        if (sql.includes("status = 'running'")) {
          return Promise.resolve({ rows: [{ count: '2' }] }); // Max 2 active reached
        }
        return Promise.resolve({ rows: [] });
      }),
    };

    const middleware = createBackpressureMiddleware(mockDb, {
      maxQueueDepth: 100,
      maxActivePerSurface: 2,
    });

    const req = {
      body: { surfaceId: 'surface-busy-001' },
      log: { error: vi.fn() },
    } as unknown as Parameters<typeof middleware>[0];

    let statusCode = 0;
    const headers: Record<string, string> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let responseBody: any = null;

    const reply = {
      header: (name: string, value: string) => {
        headers[name] = value;
        return reply;
      },
      status: (code: number) => {
        statusCode = code;
        return reply;
      },
      send: (data: unknown) => {
        responseBody = data;
        return reply;
      },
    } as unknown as Parameters<typeof middleware>[1];

    await middleware(req, reply);

    expect(statusCode).toBe(429);
    expect(headers['Retry-After']).toBe('15');
    expect(responseBody?.error).toBe('Too Many Requests');
  });
});

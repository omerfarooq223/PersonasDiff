import { describe, expect, it, vi } from 'vitest';
import { createBackpressureMiddleware } from '../../apps/api/src/middleware/backpressure.js';

describe('Failure Injection: Target Timeout & Per-Surface Back-Pressure', () => {
  it('returns HTTP 429 with Retry-After header when surface concurrency limit is exceeded', async () => {
    const mockDb = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("status = 'queued'")) {
          return Promise.resolve({ rows: [{ count: '10' }] });
        }
        if (sql.includes("status = 'running'")) {
          return Promise.resolve({ rows: [{ count: '2' }] }); // Max 2 active reached
        }
        return Promise.resolve({ rows: [] });
      }),
    } as any;

    const middleware = createBackpressureMiddleware(mockDb, { maxQueueDepth: 100, maxActivePerSurface: 2 });

    const req = {
      body: { surfaceId: 'surface-busy-001' },
      log: { error: vi.fn() },
    } as any;

    let statusCode = 0;
    let headers: Record<string, string> = {};
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
      send: (data: any) => {
        responseBody = data;
        return reply;
      },
    } as any;

    await middleware(req, reply);

    expect(statusCode).toBe(429);
    expect(headers['Retry-After']).toBe('15');
    expect(responseBody.error).toBe('Too Many Requests');
  });
});

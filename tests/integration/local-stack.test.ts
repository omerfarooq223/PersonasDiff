import { describe, expect, it } from 'vitest';

const runStackTests = process.env.RUN_STACK_TESTS === 'true';

describe.skipIf(!runStackTests)('local stack', () => {
  it('reports API readiness', async () => {
    const response = await fetch('http://localhost:3000/health/ready');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ready' });
  });
});

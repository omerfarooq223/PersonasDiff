import { afterAll, describe, expect, it } from 'vitest';

import { seedIds, seedTokens } from '@ai-parallel-web/db';

const runStackTests = process.env.RUN_STACK_TESTS === 'true';
const apiBaseUrl = process.env.STACK_API_URL ?? 'http://localhost:3000';

const describeStack = runStackTests ? describe : describe.skip;

describeStack('runs API against local stack', () => {
  const operatorHeaders = {
    authorization: `Bearer ${seedTokens.operator}`,
    'content-type': 'application/json',
  };

  it('creates a run idempotently for an operator', async () => {
    const body = {
      journeyVersionId: seedIds.journey,
      personaVersionIds: [seedIds.personaControl, seedIds.personaVariant],
      surfaceId: seedIds.surface,
    };
    const idempotencyKey = `integration-${Date.now()}-1234567890`;

    const first = await fetch(`${apiBaseUrl}/v1/runs`, {
      body: JSON.stringify(body),
      headers: {
        ...operatorHeaders,
        'idempotency-key': idempotencyKey,
        'x-correlation-id': 'integration-create-run',
      },
      method: 'POST',
    });
    expect(first.status).toBe(202);
    const firstBody = (await first.json()) as { id: string; status: string };
    expect(firstBody.status).toBe('queued');

    const second = await fetch(`${apiBaseUrl}/v1/runs`, {
      body: JSON.stringify(body),
      headers: {
        ...operatorHeaders,
        'idempotency-key': idempotencyKey,
        'x-correlation-id': 'integration-create-run',
      },
      method: 'POST',
    });
    expect(second.status).toBe(202);
    const secondBody = (await second.json()) as { id: string };
    expect(secondBody.id).toBe(firstBody.id);
  });

  it('denies viewers from creating runs', async () => {
    const response = await fetch(`${apiBaseUrl}/v1/runs`, {
      body: JSON.stringify({
        journeyVersionId: seedIds.journey,
        personaVersionIds: [seedIds.personaControl, seedIds.personaVariant],
        surfaceId: seedIds.surface,
      }),
      headers: {
        authorization: `Bearer ${seedTokens.viewer}`,
        'content-type': 'application/json',
        'idempotency-key': `viewer-denied-${Date.now()}-123456`,
      },
      method: 'POST',
    });
    expect(response.status).toBe(403);
  });

  it('cancels a queued run and rejects illegal transitions', async () => {
    const createResponse = await fetch(`${apiBaseUrl}/v1/runs`, {
      body: JSON.stringify({
        journeyVersionId: seedIds.journey,
        personaVersionIds: [seedIds.personaControl, seedIds.personaVariant],
        surfaceId: seedIds.surface,
      }),
      headers: {
        ...operatorHeaders,
        'idempotency-key': `cancel-${Date.now()}-1234567890`,
      },
      method: 'POST',
    });
    const created = (await createResponse.json()) as { id: string };

    const cancelResponse = await fetch(`${apiBaseUrl}/v1/runs/${created.id}/cancel`, {
      headers: operatorHeaders,
      method: 'POST',
    });
    expect(cancelResponse.status).toBe(200);
    const cancelled = (await cancelResponse.json()) as { status: string };
    expect(cancelled.status).toBe('cancelled');

    const secondCancel = await fetch(`${apiBaseUrl}/v1/runs/${created.id}/cancel`, {
      headers: operatorHeaders,
      method: 'POST',
    });
    expect(secondCancel.status).toBe(409);
  });

  afterAll(async () => {
    // no-op; stack lifecycle handled by compose in CI
  });
});

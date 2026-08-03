import { describe, expect, it } from 'vitest';

import { hashApiToken, hashRequestBody } from '../src/crypto.js';

describe('crypto helpers', () => {
  it('hashes api tokens deterministically', () => {
    const first = hashApiToken('pw-admin-token-dev-only-0001');
    const second = hashApiToken('pw-admin-token-dev-only-0001');
    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });

  it('hashes request bodies deterministically', () => {
    const body = {
      journeyVersionId: '00000000-0000-4000-8000-000000000020',
      personaVersionIds: [
        '00000000-0000-4000-8000-000000000030',
        '00000000-0000-4000-8000-000000000031',
      ],
      surfaceId: '00000000-0000-4000-8000-000000000010',
    };
    expect(hashRequestBody(body)).toBe(hashRequestBody(body));
  });
});

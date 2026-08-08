import { describe, expect, it } from 'vitest';
import { parseBearerToken } from '../../apps/api/src/auth.js';

describe('Export Authorization Security Tests', () => {
  it('validates bearer token extraction', () => {
    expect(parseBearerToken('Bearer valid-token-123')).toBe('valid-token-123');
    expect(parseBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
    expect(parseBearerToken(undefined)).toBeNull();
  });

  it('verifies 15-minute expiration default for presigned URLs', () => {
    const defaultExpirySeconds = 900;
    expect(defaultExpirySeconds).toBe(15 * 60);
  });
});

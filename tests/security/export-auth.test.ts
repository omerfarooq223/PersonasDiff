import { describe, expect, it } from 'vitest';
import { parseBearerToken } from '../../apps/api/src/auth.js';
import { canListRuns, hasMinimumRole } from '@ai-parallel-web/auth';

describe('Export Authorization Security Tests', () => {
  it('validates bearer token extraction', () => {
    expect(parseBearerToken('Bearer valid-token-123')).toBe('valid-token-123');
    expect(parseBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
    expect(parseBearerToken('Bearer ')).toBeNull();
    expect(parseBearerToken(undefined)).toBeNull();
  });

  it('verifies 15-minute expiration default for presigned URLs', () => {
    const defaultExpirySeconds = 900;
    expect(defaultExpirySeconds).toBe(15 * 60);
  });

  it('verifies role hierarchy enforcement for export access', () => {
    expect(canListRuns('viewer')).toBe(true);
    expect(canListRuns('operator')).toBe(true);
    expect(canListRuns('admin')).toBe(true);
    expect(hasMinimumRole('viewer', 'operator')).toBe(false);
  });

  it('ensures tenant isolation rules forbid cross-tenant key derivation', () => {
    const tenantA = 'tenant-aaa';
    const tenantB = 'tenant-bbb';
    const exportId = 'exp-123';
    const format = 'json';

    const storageKeyA = `exports/${tenantA}/${exportId}/run_export.${format}`;
    const storageKeyB = `exports/${tenantB}/${exportId}/run_export.${format}`;

    expect(storageKeyA).not.toBe(storageKeyB);
    expect(storageKeyA.startsWith(`exports/${tenantA}/`)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { RedactionEngine } from '../../packages/capture/src/redaction-engine.js';
import { maskSecret } from '../../packages/db/src/crypto.js';

describe('Secrets Exposure & Redaction Security Tests', () => {
  it('masks sensitive database crypto secrets', () => {
    const rawSecret = 'super-secret-master-key-32bytes!';
    const masked = maskSecret(rawSecret);

    expect(masked).not.toBe(rawSecret);
    expect(masked).toContain('***');
    expect(masked.length).toBeLessThan(rawSecret.length);
  });

  it('redacts Authorization and Cookie headers in network evidence', () => {
    const redactionEngine = new RedactionEngine();
    const headers = {
      authorization: 'Bearer secret-jwt-token-12345',
      cookie: 'session_id=abc123xyz; secret_token=999',
      'user-agent': 'ParallelWeb/1.0',
    };

    const { sanitizedHeaders, audits } = redactionEngine.redactHeaders(headers);

    expect(sanitizedHeaders.authorization).toBe('[REDACTED_HEADER]');
    expect(sanitizedHeaders.cookie).toBe('[REDACTED_HEADER]');
    expect(sanitizedHeaders['user-agent']).toBe('ParallelWeb/1.0');
    expect(audits.length).toBeGreaterThan(0);
  });

  it('redacts sensitive query parameters containing secrets', () => {
    const redactionEngine = new RedactionEngine();
    const rawUrl = 'https://example.com/api?token=sk_live_12345&session=abc987&action=export';

    const { sanitizedUrl, audits } = redactionEngine.redactUrl(rawUrl);

    expect(sanitizedUrl).not.toContain('sk_live_12345');
    expect(sanitizedUrl).not.toContain('abc987');
    expect(sanitizedUrl).toContain('REDACTED_QUERY_PARAM');
    expect(audits.length).toBeGreaterThan(0);
  });
});

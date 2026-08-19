import { describe, expect, it } from 'vitest';
import { RedactionEngine } from '@ai-parallel-web/capture';

describe('Redaction Engine & Auditability', () => {
  it('redacts sensitive query parameters from URLs and records audit log', () => {
    const engine = new RedactionEngine();
    const rawUrl = 'https://example.com/checkout?token=secret_abc123&api_key=key_xyz789&item=book';

    const { sanitizedUrl, audits } = engine.redactUrl(rawUrl);

    expect(sanitizedUrl).not.toContain('secret_abc123');
    expect(sanitizedUrl).not.toContain('key_xyz789');
    expect(sanitizedUrl).toContain('token=%5BREDACTED_QUERY_PARAM%5D');
    expect(sanitizedUrl).toContain('api_key=%5BREDACTED_QUERY_PARAM%5D');
    expect(sanitizedUrl).toContain('item=book');

    expect(audits).toHaveLength(1);
    expect(audits[0]).toEqual({
      target: 'url_param',
      identifier: 'sensitive_query_params',
      matchesFound: 2,
      actionTaken: 'MASKED_QUERY_PARAM',
    });
  });

  it('redacts authorization headers and records audit log', () => {
    const engine = new RedactionEngine();
    const rawHeaders = {
      'content-type': 'application/json',
      authorization: 'Bearer super_secret_jwt_token',
      cookie: 'session_id=123456',
    };

    const { sanitizedHeaders, audits } = engine.redactHeaders(rawHeaders);

    expect(sanitizedHeaders['authorization']).toBe('[REDACTED_HEADER]');
    expect(sanitizedHeaders['cookie']).toBe('[REDACTED_HEADER]');
    expect(sanitizedHeaders['content-type']).toBe('application/json');

    expect(audits).toHaveLength(1);
    expect(audits[0]?.matchesFound).toBe(2);
  });

  it('sanitizes DOM content removing sensitive regex matches and inputs', () => {
    const engine = new RedactionEngine();
    const rawHtml = `
      <html>
        <body>
          <p>Contact us at user@example.com</p>
          <input type="password" name="user_password" value="mySecretPassword123" />
          <span>SSN: 123-45-6789</span>
        </body>
      </html>
    `;

    const { sanitizedHtml, audits } = engine.sanitizeDomContent(rawHtml);

    expect(sanitizedHtml).not.toContain('user@example.com');
    expect(sanitizedHtml).not.toContain('mySecretPassword123');
    expect(sanitizedHtml).not.toContain('123-45-6789');

    expect(sanitizedHtml).toContain('[REDACTED_PATTERN]');
    expect(sanitizedHtml).toContain('[REDACTED_SENSITIVE_INPUT]');

    expect(audits.length).toBeGreaterThanOrEqual(2);
  });
});

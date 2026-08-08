import { describe, expect, it } from 'vitest';
import { buildApp } from '../../apps/api/src/app.js';
import type { AppDependencies } from '../../apps/api/src/dependencies.js';
import { RedactionEngine } from '../../packages/capture/src/redaction-engine.js';

const emptyDeps: AppDependencies = {
  db: null,
  redis: null,
  storage: null,
};

describe('XSS & Content Security Policy Tests', () => {
  it('ensures API attaches restrictive CSP and frame headers', async () => {
    const app = await buildApp(
      {
        appEnv: 'test',
        databaseUrl: null,
        defaultPageSize: 20,
        host: '127.0.0.1',
        logLevel: 'silent',
        maxPageSize: 100,
        port: 0,
        rateLimitMax: 100,
        rateLimitWindowMs: 60000,
        redisUrl: null,
        releaseSha: 'test',
        s3: {
          accessKeyId: null,
          bucket: null,
          defaultRetentionDays: 30,
          endpoint: null,
          forcePathStyle: false,
          region: 'us-east-1',
          secretAccessKey: null,
        },
        seedOnStartup: false,
      },
      emptyDeps,
    );

    const response = await app.inject({
      method: 'GET',
      url: '/health/live',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-security-policy']).toBe(
      "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';",
    );
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');

    await app.close();
  });

  it('redacts sensitive query parameters in captured URLs', () => {
    const redactionEngine = new RedactionEngine();
    const maliciousUrl = 'https://example.com/search?token=secret123&q=test';

    const { sanitizedUrl, audits } = redactionEngine.redactUrl(maliciousUrl);

    expect(sanitizedUrl).not.toContain('secret123');
    expect(sanitizedUrl).toContain('REDACTED_QUERY_PARAM');
    expect(audits.length).toBeGreaterThan(0);
  });

  it('sanitizes DOM HTML content removing sensitive inputs and passwords', () => {
    const redactionEngine = new RedactionEngine();
    const dirtyHtml = `
      <html>
        <body>
          <input type="password" value="super-secret-123" id="pwd" />
          <h1>Welcome</h1>
        </body>
      </html>
    `;

    const { sanitizedHtml, audits } = redactionEngine.sanitizeDomContent(dirtyHtml);

    expect(sanitizedHtml).not.toContain('super-secret-123');
    expect(sanitizedHtml).toContain('[REDACTED_SENSITIVE_INPUT]');
    expect(audits.some((a) => a.target === 'dom_selector')).toBe(true);
  });
});

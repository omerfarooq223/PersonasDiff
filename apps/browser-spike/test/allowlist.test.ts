import { describe, expect, it } from 'vitest';

import { assertAllowedUrl } from '../src/allowlist.js';

const policy = {
  allowedOrigin: 'https://example.test',
  allowedPathPrefixes: ['/catalogue'],
};

describe('surface allowlist', () => {
  it('allows the exact origin and approved path prefix', () => {
    expect(assertAllowedUrl('https://example.test/catalogue/item', policy).pathname).toBe(
      '/catalogue/item',
    );
  });

  it.each([
    'https://other.test/catalogue',
    'https://example.test/admin',
    'https://user:pass@example.test/catalogue',
  ])('blocks %s', (url) => {
    expect(() => assertAllowedUrl(url, policy)).toThrow();
  });
});

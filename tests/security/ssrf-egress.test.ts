import { describe, expect, it } from 'vitest';
import {
  hasCredentialsInUrl,
  isForbiddenScheme,
  isPrivateOrLoopbackHost,
  isUrlAllowed,
  validateUrlAgainstPolicy,
  PolicyViolationError,
} from '../../apps/worker-browser/src/policy-enforcer.js';

describe('SSRF & Egress Security Controls', () => {
  it('blocks loopback IPv4 and IPv6 addresses', () => {
    expect(isPrivateOrLoopbackHost('127.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackHost('127.0.0.50')).toBe(true);
    expect(isPrivateOrLoopbackHost('::1')).toBe(true);
    expect(isPrivateOrLoopbackHost('localhost')).toBe(true);
    expect(isPrivateOrLoopbackHost('0.0.0.0')).toBe(true);
  });

  it('blocks cloud metadata IP (169.254.169.254) and link-local ranges', () => {
    expect(isPrivateOrLoopbackHost('169.254.169.254')).toBe(true);
    expect(isPrivateOrLoopbackHost('169.254.1.1')).toBe(true);
  });

  it('blocks RFC 1918 private IPv4 subnets', () => {
    // 10.0.0.0/8
    expect(isPrivateOrLoopbackHost('10.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackHost('10.255.255.255')).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateOrLoopbackHost('172.16.0.1')).toBe(true);
    expect(isPrivateOrLoopbackHost('172.31.255.255')).toBe(true);
    expect(isPrivateOrLoopbackHost('172.32.0.1')).toBe(false);

    // 192.168.0.0/16
    expect(isPrivateOrLoopbackHost('192.168.1.1')).toBe(true);
    expect(isPrivateOrLoopbackHost('192.168.255.254')).toBe(true);
  });

  it('permits public hosts', () => {
    expect(isPrivateOrLoopbackHost('example.com')).toBe(false);
    expect(isPrivateOrLoopbackHost('93.184.216.34')).toBe(false);
    expect(isPrivateOrLoopbackHost('8.8.8.8')).toBe(false);
  });

  it('detects credential-bearing URLs', () => {
    expect(hasCredentialsInUrl('https://admin:secret@example.com/api')).toBe(true);
    expect(hasCredentialsInUrl('http://user@example.com')).toBe(true);
    expect(hasCredentialsInUrl('https://example.com/api')).toBe(false);
  });

  it('blocks dangerous protocol schemes', () => {
    expect(isForbiddenScheme('file:///etc/passwd')).toBe(true);
    expect(isForbiddenScheme('gopher://example.com')).toBe(true);
    expect(isForbiddenScheme('dict://example.com')).toBe(true);
    expect(isForbiddenScheme('ftp://example.com')).toBe(true);
    expect(isForbiddenScheme('javascript:alert(1)')).toBe(true);

    expect(isForbiddenScheme('http://example.com')).toBe(false);
    expect(isForbiddenScheme('https://example.com')).toBe(false);
  });

  it('throws PolicyViolationError when accessing forbidden SSRF targets', () => {
    const policy = { allowedUrlPatterns: ['https://example.com/*'] };

    expect(() => validateUrlAgainstPolicy('http://127.0.0.1/admin', policy)).toThrow(
      PolicyViolationError,
    );
    expect(() =>
      validateUrlAgainstPolicy('http://169.254.169.254/latest/meta-data/', policy),
    ).toThrow(PolicyViolationError);
    expect(() => validateUrlAgainstPolicy('file:///etc/hosts', policy)).toThrow(
      PolicyViolationError,
    );
    expect(() => validateUrlAgainstPolicy('https://user:pass@example.com/page', policy)).toThrow(
      PolicyViolationError,
    );
  });

  it('returns false in isUrlAllowed for disallowed or malicious URLs', () => {
    const allowedPatterns = ['https://example.com/*'];

    expect(isUrlAllowed('http://127.0.0.1/', allowedPatterns)).toBe(false);
    expect(isUrlAllowed('https://example.com/page', allowedPatterns)).toBe(true);
    expect(isUrlAllowed('https://unauthorized.org/page', allowedPatterns)).toBe(false);
  });
});

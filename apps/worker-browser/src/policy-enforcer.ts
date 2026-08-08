import type { Page, Request, Response } from 'playwright';
import type { PolicyConfig } from '@ai-parallel-web/contracts';

export class PolicyViolationError extends Error {
  readonly code = 'POLICY_VIOLATION';
  readonly url: string;

  constructor(message: string, url: string) {
    super(message);
    this.name = 'PolicyViolationError';
    this.url = url;
  }
}

export function matchesPattern(url: string, pattern: string): boolean {
  const regexPattern = '^' + pattern.split('*').map(escapeRegex).join('.*') + '$';
  const regex = new RegExp(regexPattern, 'i');
  return regex.test(url);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hasCredentialsInUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return Boolean(parsed.username || parsed.password);
  } catch {
    return false;
  }
}

export function isForbiddenScheme(url: string): boolean {
  try {
    const parsed = new URL(url);
    return !['http:', 'https:', 'data:', 'about:'].includes(parsed.protocol);
  } catch {
    return true;
  }
}

export function isPrivateOrLoopbackHost(host: string): boolean {
  const normalized = host.toLowerCase().trim();
  if (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '0.0.0.0' ||
    normalized === '169.254.169.254'
  ) {
    return true;
  }

  // IPv4 Private & Link-Local Ranges
  // 10.0.0.0/8
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized)) return true;
  // 127.0.0.0/8
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized)) return true;
  // 169.254.0.0/16
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(normalized)) return true;
  // 172.16.0.0/12
  const ip172 = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(normalized);
  if (ip172) {
    const secondOctet = parseInt(ip172[1]!, 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  // 192.168.0.0/16
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(normalized)) return true;

  return false;
}

export function validateSsrfSafety(url: string): void {
  if (isForbiddenScheme(url)) {
    throw new PolicyViolationError(`URL protocol scheme is not allowed: "${url}"`, url);
  }
  if (hasCredentialsInUrl(url)) {
    throw new PolicyViolationError(`Credential-bearing URLs are blocked for security: "${url}"`, url);
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      if (isPrivateOrLoopbackHost(parsed.hostname)) {
        throw new PolicyViolationError(
          `Navigation to loopback, private IP, or metadata endpoint is blocked: "${url}"`,
          url,
        );
      }
    }
  } catch (err) {
    if (err instanceof PolicyViolationError) throw err;
    throw new PolicyViolationError(`Invalid URL string: "${url}"`, url);
  }
}

export function isUrlAllowed(url: string, allowedPatterns: string[]): boolean {
  if (!allowedPatterns || allowedPatterns.length === 0) return false;
  try {
    validateSsrfSafety(url);
  } catch {
    return false;
  }
  return allowedPatterns.some((pattern) => matchesPattern(url, pattern));
}

export function applySecurityPolicy(page: Page, policy: PolicyConfig): void {
  void page.route('**/*', (route) => {
    const req: Request = route.request();
    const requestUrl = req.url();

    if (requestUrl.startsWith('data:') || requestUrl === 'about:blank') {
      return route.continue();
    }

    if (!isUrlAllowed(requestUrl, policy.allowedUrlPatterns)) {
      return route.abort('blockedbyclient');
    }

    return route.continue();
  });

  page.on('response', (response: Response) => {
    const status = response.status();
    if (status >= 300 && status < 400) {
      const redirectLocation = response.headers()['location'];
      if (redirectLocation) {
        let resolvedUrl = redirectLocation;
        try {
          resolvedUrl = new URL(redirectLocation, response.url()).href;
        } catch {
          // Fall back to location header string
        }

        if (!isUrlAllowed(resolvedUrl, policy.allowedUrlPatterns)) {
          void page.evaluate((url) => {
            console.error(`Blocked navigation redirect to unauthorized URL: ${url}`);
          }, resolvedUrl);
        }
      }
    }
  });

  if (policy.blockPopups !== false) {
    page.on('popup', (popup) => {
      void popup.close();
    });
  }

  if (policy.blockDownloads !== false) {
    page.on('download', (download) => {
      void download.cancel();
    });
  }
}

export function validateUrlAgainstPolicy(url: string, policy: PolicyConfig): void {
  validateSsrfSafety(url);
  if (!isUrlAllowed(url, policy.allowedUrlPatterns)) {
    throw new PolicyViolationError(
      `Navigation to destination URL "${url}" is blocked by security policy allowlist.`,
      url,
    );
  }
}


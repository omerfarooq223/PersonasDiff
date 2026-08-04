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

export function isUrlAllowed(url: string, allowedPatterns: string[]): boolean {
  if (!allowedPatterns || allowedPatterns.length === 0) return false;
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
  if (!isUrlAllowed(url, policy.allowedUrlPatterns)) {
    throw new PolicyViolationError(
      `Navigation to destination URL "${url}" is blocked by security policy allowlist.`,
      url,
    );
  }
}

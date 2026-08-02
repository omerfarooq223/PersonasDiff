export interface SurfacePolicy {
  allowedOrigin: string;
  allowedPathPrefixes: readonly string[];
}

export function assertAllowedUrl(rawUrl: string, policy: SurfacePolicy): URL {
  const url = new URL(rawUrl);
  const origin = new URL(policy.allowedOrigin).origin;

  if (url.origin !== origin) {
    throw new Error(`Blocked origin: ${url.origin}`);
  }

  if (!policy.allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
    throw new Error(`Blocked path: ${url.pathname}`);
  }

  if (url.username || url.password) {
    throw new Error('Credential-bearing URLs are blocked');
  }

  return url;
}

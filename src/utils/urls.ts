const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export type UrlParseOptions = {
  allowHttpLoopback?: boolean;
};

export function parseBaseUrl(name: string, raw: string, opts: UrlParseOptions = {}): URL {
  const value = raw.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }

  if (url.username || url.password) {
    throw new Error(`${name} must not include userinfo`);
  }

  const allowHttpLoopback = opts.allowHttpLoopback ?? true;
  const isLoopbackHost = LOOPBACK_HOSTS.has(url.hostname);

  if (url.protocol !== 'https:') {
    if (!(allowHttpLoopback && isLoopbackHost && url.protocol === 'http:')) {
      throw new Error(`${name} must use https (http is only allowed for loopback URLs)`);
    }
  }

  // Normalize: strip trailing slash for consistent joining.
  if (url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }

  return url;
}

export function joinUrl(base: URL, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  // new URL('/x', 'https://example.com/base') -> 'https://example.com/x' (desired)
  return new URL(p, base.toString() + '/').toString();
}

export function isLoopbackUrl(url: URL): boolean {
  return LOOPBACK_HOSTS.has(url.hostname) && (url.protocol === 'http:' || url.protocol === 'https:');
}

import { randomUUID } from 'crypto';
import { getValidToken } from '../auth/tokenRefresh.js';
import { getApiUrl, VERSION } from '../config.js';
import { AuthError, parseApiResponse } from '../utils/errors.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import { joinUrl } from '../utils/urls.js';

let cachedApiUrl: URL | null = null;

function apiBaseUrl(): URL {
  if (cachedApiUrl) return cachedApiUrl;
  cachedApiUrl = getApiUrl();
  return cachedApiUrl;
}

export interface ApiRequestOptions extends RequestInit {
  /** Skip authentication header (for public endpoints). */
  noAuth?: boolean;
  /** Auto-generate an Idempotency-Key header. */
  idempotent?: boolean;
  /** Timeout in milliseconds (default: 20000). */
  timeoutMs?: number;
}

const USER_AGENT = `eremos-cli/${VERSION}`;

/**
 * Make an API request to the Eremos API.
 * Automatically includes the OAuth Bearer token unless noAuth is set.
 */
export async function apiRequest(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const { noAuth, idempotent, timeoutMs, ...fetchOpts } = options;

  const headers = new Headers(fetchOpts.headers);
  headers.set('User-Agent', USER_AGENT);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');

  if (!noAuth) {
    const token = await getValidToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    // If no token, continue without Authorization header.
    // Auth-required commands should call requireAuth() before apiCall().
  }

  if (idempotent && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', randomUUID());
  }

  // If caller passes a string body and no explicit content type, assume JSON.
  if (fetchOpts.body != null && typeof fetchOpts.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = joinUrl(apiBaseUrl(), path);

  const verbose = process.argv.includes('--verbose');
  const method = fetchOpts.method ?? 'GET';
  const start = verbose ? performance.now() : 0;

  if (verbose) {
    process.stderr.write(`> ${method} ${url}\n`);
  }

  const response = await fetchWithTimeout(url, {
    ...fetchOpts,
    headers,
    redirect: 'error',
    timeoutMs: timeoutMs ?? 20_000,
  });

  if (verbose) {
    const elapsed = Math.round(performance.now() - start);
    process.stderr.write(`< ${response.status} ${response.statusText} (${elapsed}ms)\n`);
  }

  return response;
}

/**
 * High-level API call: request + parse response + throw on error.
 * Returns the parsed API envelope { data, meta?, current_user_id? }.
 */
export async function apiCall<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<{ data: T; meta?: { next_cursor?: string | null; has_more?: boolean }; current_user_id?: string }> {
  const response = await apiRequest(path, options);
  return parseApiResponse<T>(response);
}

/**
 * Ensure the user is authenticated, throwing AuthError if not.
 * Returns the valid access token.
 */
export async function requireAuth(): Promise<string> {
  const token = await getValidToken();
  if (!token) {
    throw new AuthError('Not authenticated. Please run `eremos login` first.');
  }
  return token;
}

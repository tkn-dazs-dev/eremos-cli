import { getSupabaseUrl } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import { joinUrl } from '../utils/urls.js';
import { toFormUrlEncoded } from '../utils/form.js';
import { stripTerminalEscapes } from '../utils/sanitize.js';
import { loadTokens, saveTokens, isTokenExpired, type StoredTokens } from './tokenStore.js';

const verbose = () => process.argv.includes('--verbose');

/**
 * Get a valid access token, refreshing if expired.
 * Returns null if no tokens stored or refresh fails.
 */
export async function getValidToken(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) return null;

  if (!isTokenExpired(tokens)) return tokens.access_token;

  const refreshed = await refreshAccessToken(tokens);
  return refreshed?.access_token ?? null;
}

/**
 * Refresh the access token using the refresh token.
 *
 * - Uses x-www-form-urlencoded body (most OAuth servers expect this)
 * - Includes client_id
 * - Preserves old refresh_token if server doesn't return a new one
 */
async function refreshAccessToken(tokens: StoredTokens): Promise<StoredTokens | null> {
  let tokenEndpoint: string;

  try {
    const supabaseUrl = getSupabaseUrl();
    tokenEndpoint = joinUrl(supabaseUrl, '/auth/v1/oauth/token');
  } catch (e) {
    if (verbose()) {
      process.stderr.write(`[token-refresh] config error: ${stripTerminalEscapes(e instanceof Error ? e.message : String(e))}\n`);
    }
    return null;
  }

  try {
    const response = await fetchWithTimeout(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: toFormUrlEncoded({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: tokens.client_id,
      }),
      redirect: 'error',
      timeoutMs: 20_000,
    });

    if (!response.ok) {
      if (verbose()) {
        process.stderr.write(`[token-refresh] server returned ${response.status}\n`);
      }
      return null;
    }

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) return null;

    const newTokens: StoredTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? tokens.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      client_id: tokens.client_id,
    };

    saveTokens(newTokens);
    return newTokens;
  } catch (e) {
    if (verbose()) {
      process.stderr.write(`[token-refresh] failed: ${stripTerminalEscapes(e instanceof Error ? e.message : String(e))}\n`);
    }
    return null;
  }
}

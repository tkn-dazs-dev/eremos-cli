import { parseBaseUrl } from './utils/urls.js';

export const VERSION = '0.1.0';
const DEFAULT_SUPABASE_URL = 'https://auth.eremos.jp';
const DEFAULT_API_URL = 'https://eremos.jp';
const DEFAULT_OAUTH_CLIENT_ID = '28127dd8-2f0b-4809-80ab-08c6b919ef9b';
const DEFAULT_LOOPBACK_PORT = 17654;

export function getSupabaseUrl(): URL {
  return parseBaseUrl('EREMOS_SUPABASE_URL', process.env.EREMOS_SUPABASE_URL ?? DEFAULT_SUPABASE_URL);
}

export function getApiUrl(): URL {
  return parseBaseUrl('EREMOS_API_URL', process.env.EREMOS_API_URL ?? DEFAULT_API_URL);
}

export function getOauthClientId(): string {
  const id = (process.env.EREMOS_OAUTH_CLIENT_ID ?? DEFAULT_OAUTH_CLIENT_ID).trim();
  if (!id) {
    throw new Error('EREMOS_OAUTH_CLIENT_ID must not be empty');
  }
  return id;
}

export function getLoopbackPort(): number {
  const env = process.env.EREMOS_LOOPBACK_PORT;
  if (env != null) {
    const port = Number(env);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`EREMOS_LOOPBACK_PORT must be a valid port number (1-65535), got: ${env}`);
    }
    return port;
  }
  return DEFAULT_LOOPBACK_PORT;
}

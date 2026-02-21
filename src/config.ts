export const VERSION = '0.1.0';
const SUPABASE_URL = 'https://auth.eremos.jp';
const API_URL = 'https://eremos.jp';
const OAUTH_CLIENT_ID = '28127dd8-2f0b-4809-80ab-08c6b919ef9b';
const DEFAULT_LOOPBACK_PORT = 17654;

export function getSupabaseUrl(): URL {
  return new URL(SUPABASE_URL);
}

export function getApiUrl(): URL {
  return new URL(API_URL);
}

export function getOauthClientId(): string {
  return OAUTH_CLIENT_ID;
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

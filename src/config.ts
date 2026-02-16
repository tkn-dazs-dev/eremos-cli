export const VERSION = '0.1.0';
export const SUPABASE_URL = 'https://otiasifzdmfwvgminled.supabase.co';
export const API_URL = 'https://eremos.jp';
export const OAUTH_CLIENT_ID = '28127dd8-2f0b-4809-80ab-08c6b919ef9b';
export const LOOPBACK_PORT = 17654;

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
  return LOOPBACK_PORT;
}
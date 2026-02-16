import { describe, it, expect } from 'vitest';
import {
  VERSION,
  SUPABASE_URL,
  API_URL,
  OAUTH_CLIENT_ID,
  LOOPBACK_PORT,
  getSupabaseUrl,
  getApiUrl,
  getOauthClientId,
  getLoopbackPort,
} from '../config.js';

describe('config', () => {
  it('exports VERSION', () => {
    expect(VERSION).toBe('0.1.0');
  });

  it('getSupabaseUrl returns production URL', () => {
    const url = getSupabaseUrl();
    expect(url.hostname).toBe('otiasifzdmfwvgminled.supabase.co');
    expect(url.protocol).toBe('https:');
  });

  it('getApiUrl returns production URL', () => {
    const url = getApiUrl();
    expect(url.hostname).toBe('eremos.jp');
    expect(url.protocol).toBe('https:');
  });

  it('getOauthClientId returns production client ID', () => {
    expect(getOauthClientId()).toBe(OAUTH_CLIENT_ID);
    expect(OAUTH_CLIENT_ID).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('getLoopbackPort returns default port', () => {
    expect(getLoopbackPort()).toBe(17654);
    expect(LOOPBACK_PORT).toBe(17654);
  });
});

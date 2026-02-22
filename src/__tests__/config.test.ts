import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  VERSION,
  getSupabaseUrl,
  getApiUrl,
  getOauthClientId,
  getLoopbackPort,
} from '../config.js';

describe('config', () => {
  const envBackup: Record<string, string | undefined> = {};
  const ENV_KEYS = ['EREMOS_LOOPBACK_PORT'];

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      envBackup[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (envBackup[key] !== undefined) {
        process.env[key] = envBackup[key];
      } else {
        delete process.env[key];
      }
    }
  });

  it('exports VERSION from package.json', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('getSupabaseUrl returns default URL', () => {
    const url = getSupabaseUrl();
    expect(url.hostname).toBe('auth.eremos.jp');
    expect(url.protocol).toBe('https:');
  });

  it('getApiUrl returns default URL', () => {
    const url = getApiUrl();
    expect(url.hostname).toBe('eremos.jp');
    expect(url.protocol).toBe('https:');
  });

  it('getOauthClientId returns client ID', () => {
    expect(getOauthClientId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('getLoopbackPort returns default port', () => {
    expect(getLoopbackPort()).toBe(17654);
  });

  it('respects EREMOS_LOOPBACK_PORT override', () => {
    process.env.EREMOS_LOOPBACK_PORT = '18000';
    expect(getLoopbackPort()).toBe(18000);
  });

  it('rejects invalid EREMOS_LOOPBACK_PORT', () => {
    process.env.EREMOS_LOOPBACK_PORT = 'abc';
    expect(() => getLoopbackPort()).toThrow('valid port number');
  });

  it('rejects out-of-range EREMOS_LOOPBACK_PORT', () => {
    process.env.EREMOS_LOOPBACK_PORT = '99999';
    expect(() => getLoopbackPort()).toThrow('valid port number');
  });
});

import { describe, it, expect } from 'vitest';
import { parseBaseUrl, joinUrl, isLoopbackUrl } from '../utils/urls.js';

describe('parseBaseUrl', () => {
  it('accepts a valid HTTPS URL', () => {
    const url = parseBaseUrl('TEST', 'https://example.com');
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('example.com');
  });

  it('rejects empty string', () => {
    expect(() => parseBaseUrl('TEST', '')).toThrow('TEST is required');
  });

  it('rejects invalid URL', () => {
    expect(() => parseBaseUrl('TEST', 'not-a-url')).toThrow('must be a valid absolute URL');
  });

  it('rejects URL with userinfo', () => {
    expect(() => parseBaseUrl('TEST', 'https://user:pass@example.com')).toThrow('must not include userinfo');
  });

  it('rejects HTTP for non-loopback', () => {
    expect(() => parseBaseUrl('TEST', 'http://example.com')).toThrow('must use https');
  });

  it('allows HTTP for 127.0.0.1', () => {
    const url = parseBaseUrl('TEST', 'http://127.0.0.1:3000', { allowHttpLoopback: true });
    expect(url.hostname).toBe('127.0.0.1');
  });

  it('allows HTTP for localhost', () => {
    const url = parseBaseUrl('TEST', 'http://localhost:3000', { allowHttpLoopback: true });
    expect(url.hostname).toBe('localhost');
  });

  it('strips trailing slashes from path', () => {
    const url = parseBaseUrl('TEST', 'https://example.com/api/');
    expect(url.pathname).toBe('/api');
  });
});

describe('joinUrl', () => {
  it('joins base URL and path', () => {
    const base = new URL('https://example.com');
    expect(joinUrl(base, '/api/test')).toBe('https://example.com/api/test');
  });

  it('prepends slash if missing', () => {
    const base = new URL('https://example.com');
    expect(joinUrl(base, 'api/test')).toBe('https://example.com/api/test');
  });
});

describe('isLoopbackUrl', () => {
  it('returns true for 127.0.0.1', () => {
    expect(isLoopbackUrl(new URL('http://127.0.0.1:3000'))).toBe(true);
  });

  it('returns true for localhost', () => {
    expect(isLoopbackUrl(new URL('http://localhost:3000'))).toBe(true);
  });

  it('returns false for external host', () => {
    expect(isLoopbackUrl(new URL('https://example.com'))).toBe(false);
  });
});

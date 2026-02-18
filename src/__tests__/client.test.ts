import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing client.
vi.mock('../auth/tokenRefresh.js', () => ({
  getValidToken: vi.fn(),
}));

vi.mock('../utils/fetch.js', () => ({
  fetchWithTimeout: vi.fn(),
}));

vi.mock('../config.js', () => ({
  getApiUrl: () => new URL('https://eremos.jp'),
  VERSION: '0.1.0',
}));

import { apiRequest, apiCall, requireAuth } from '../api/client.js';
import { getValidToken } from '../auth/tokenRefresh.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import { AuthError } from '../utils/errors.js';

const mockGetValidToken = vi.mocked(getValidToken);
const mockFetch = vi.mocked(fetchWithTimeout);

describe('client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apiRequest', () => {
    it('includes Authorization header when authenticated', async () => {
      mockGetValidToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      await apiRequest('/api/test');

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('includes User-Agent header', async () => {
      mockGetValidToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      await apiRequest('/api/test');

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('User-Agent')).toBe('eremos-cli/0.1.0');
    });

    it('skips auth header with noAuth option', async () => {
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      await apiRequest('/api/test', { noAuth: true });

      expect(mockGetValidToken).not.toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.has('Authorization')).toBe(false);
    });

    it('continues without Authorization header when not authenticated', async () => {
      mockGetValidToken.mockResolvedValue(null);
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      await apiRequest('/api/test');

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.has('Authorization')).toBe(false);
    });

    it('adds Idempotency-Key with idempotent option', async () => {
      mockGetValidToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      await apiRequest('/api/test', { method: 'POST', idempotent: true });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      const key = headers.get('Idempotency-Key');
      expect(key).toBeTruthy();
      // UUID v4 format.
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
    });

    it('does not override existing Idempotency-Key', async () => {
      mockGetValidToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      await apiRequest('/api/test', {
        method: 'POST',
        idempotent: true,
        headers: { 'Idempotency-Key': 'custom-key' },
      });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('Idempotency-Key')).toBe('custom-key');
    });

    it('auto-detects JSON content type for string bodies', async () => {
      mockGetValidToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      await apiRequest('/api/test', { method: 'POST', body: '{"key":"value"}' });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('constructs correct URL', async () => {
      mockGetValidToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      await apiRequest('/api/contents');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://eremos.jp/api/contents');
    });

    it('sanitizes verbose status output to prevent terminal escape injection', async () => {
      mockGetValidToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue({
        status: 500,
        statusText: '\x1b[31mFAIL\x1b[0m\x00',
      } as unknown as Response);

      const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
      const originalArgv = process.argv.slice();
      process.argv = ['node', 'eremos', '--verbose'];
      let output = '';

      try {
        await apiRequest('/api/test');
        output = stderrSpy.mock.calls.map((call) => String(call[0])).join('');
      } finally {
        process.argv = originalArgv;
        stderrSpy.mockRestore();
      }

      expect(output).toContain('< 500 FAIL (');
      expect(output).not.toContain('\x1b[31m');
      expect(output).not.toContain('\x00');
    });
  });

  describe('apiCall', () => {
    it('parses successful response', async () => {
      mockGetValidToken.mockResolvedValue('test-token');
      const responseBody = { data: { id: '123' }, meta: { has_more: false } };
      mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

      const result = await apiCall<{ id: string }>('/api/test');
      expect(result.data.id).toBe('123');
      expect(result.meta?.has_more).toBe(false);
    });

    it('throws ApiError on error response', async () => {
      mockGetValidToken.mockResolvedValue('test-token');
      const responseBody = { error: { code: 'NOT_FOUND', message: 'Not found' } };
      mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 404 }));

      await expect(apiCall('/api/test')).rejects.toThrow('Not found');
    });
  });

  describe('requireAuth', () => {
    it('returns token when authenticated', async () => {
      mockGetValidToken.mockResolvedValue('test-token');
      const token = await requireAuth();
      expect(token).toBe('test-token');
    });

    it('throws AuthError when not authenticated', async () => {
      mockGetValidToken.mockResolvedValue(null);
      await expect(requireAuth()).rejects.toThrow(AuthError);
    });
  });
});

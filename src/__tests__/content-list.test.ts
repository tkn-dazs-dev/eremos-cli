import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing.
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

import { getValidToken } from '../auth/tokenRefresh.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import { apiCall } from '../api/client.js';
import { buildQueryParams } from '../utils/pagination.js';

const mockGetValidToken = vi.mocked(getValidToken);
const mockFetch = vi.mocked(fetchWithTimeout);

describe('content list (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetValidToken.mockResolvedValue('test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes pagination flags to query string', async () => {
    const responseBody = {
      data: [{ id: '1', title: 'Post' }],
      meta: { has_more: true, next_cursor: 'cursor123' },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const qs = buildQueryParams({ limit: 10, cursor: 'abc', type: 'image' });
    const result = await apiCall<Record<string, unknown>[]>(`/api/contents${qs}`);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/contents?');
    expect(url).toContain('limit=10');
    expect(url).toContain('cursor=abc');
    expect(url).toContain('type=image');

    expect(result.data).toHaveLength(1);
    expect(result.meta?.has_more).toBe(true);
    expect(result.meta?.next_cursor).toBe('cursor123');
  });

  it('clamps limit to max 50', async () => {
    const responseBody = { data: [] };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const qs = buildQueryParams({ limit: 100 });
    await apiCall<Record<string, unknown>[]>(`/api/contents${qs}`);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('limit=50');
  });

  it('works without authentication for pub endpoints', async () => {
    mockGetValidToken.mockResolvedValue(null);
    const responseBody = {
      data: [{ id: '1', title: 'Public Post' }],
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const result = await apiCall<Record<string, unknown>[]>('/api/contents');

    expect(result.data).toHaveLength(1);
    const [, opts] = mockFetch.mock.calls[0];
    const headers = opts?.headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });

  it('includes auth token when available for personalization', async () => {
    mockGetValidToken.mockResolvedValue('user-token');
    const responseBody = {
      data: [{ id: '1' }],
      current_user_id: 'user-uuid',
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const result = await apiCall<Record<string, unknown>[]>('/api/contents');

    expect(result.current_user_id).toBe('user-uuid');
    const [, opts] = mockFetch.mock.calls[0];
    const headers = opts?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer user-token');
  });

  it('skips undefined/null query params', async () => {
    const responseBody = { data: [] };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const qs = buildQueryParams({ type: undefined, period: null, sort: 'popular' });
    await apiCall<Record<string, unknown>[]>(`/api/contents${qs}`);

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain('type=');
    expect(url).not.toContain('period=');
    expect(url).toContain('sort=popular');
  });
});

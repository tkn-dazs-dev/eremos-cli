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

describe('comment replies (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetValidToken.mockResolvedValue('test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls correct endpoint with comment ID', async () => {
    const responseBody = {
      data: [
        { id: 'r1', body: 'Reply 1', like_count: 0, author: { id: 'u1', handle: 'alice' } },
      ],
      meta: { has_more: false, next_cursor: null, total_reply_count: 1 },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const commentId = 'c0000001-0001-0001-0001-000000000001';
    const result = await apiCall<Record<string, unknown>[]>(
      `/api/comments/${commentId}/replies`,
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`https://eremos.jp/api/comments/${commentId}/replies`);
    expect(result.data).toHaveLength(1);
  });

  it('passes pagination flags to query string', async () => {
    const responseBody = {
      data: [
        { id: 'r1', body: 'Reply 1' },
        { id: 'r2', body: 'Reply 2' },
        { id: 'r3', body: 'Reply 3' },
      ],
      meta: { has_more: true, next_cursor: '2026-02-22T00:00:00Z', total_reply_count: 10 },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const commentId = 'c0000001-0001-0001-0001-000000000002';
    const qs = buildQueryParams({ limit: 3, cursor: '2026-02-21T00:00:00Z' });
    const result = await apiCall<Record<string, unknown>[]>(
      `/api/comments/${commentId}/replies${qs}`,
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/replies?');
    expect(url).toContain('limit=3');
    expect(url).toContain('cursor=2026-02-21T00%3A00%3A00Z');
    expect(result.data).toHaveLength(3);
    expect(result.meta?.has_more).toBe(true);
    expect(result.meta?.next_cursor).toBe('2026-02-22T00:00:00Z');
  });

  it('clamps limit to max 50', async () => {
    const responseBody = { data: [], meta: { has_more: false, total_reply_count: 0 } };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const qs = buildQueryParams({ limit: 100 });
    await apiCall<Record<string, unknown>[]>(
      `/api/comments/some-id/replies${qs}`,
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('limit=50');
  });

  it('works without authentication for public endpoint', async () => {
    mockGetValidToken.mockResolvedValue(null);
    const responseBody = {
      data: [{ id: 'r1', body: 'Public reply' }],
      meta: { has_more: false, total_reply_count: 1 },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const result = await apiCall<Record<string, unknown>[]>(
      '/api/comments/some-id/replies',
    );

    expect(result.data).toHaveLength(1);
    const [, opts] = mockFetch.mock.calls[0];
    const headers = opts?.headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });

  it('includes auth token when available for is_liked personalization', async () => {
    mockGetValidToken.mockResolvedValue('user-token');
    const responseBody = {
      data: [{ id: 'r1', body: 'Reply', is_liked: true }],
      meta: { has_more: false, total_reply_count: 1 },
      current_user_id: 'user-uuid',
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const result = await apiCall<Record<string, unknown>[]>(
      '/api/comments/some-id/replies',
    );

    expect(result.current_user_id).toBe('user-uuid');
    const [, opts] = mockFetch.mock.calls[0];
    const headers = opts?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer user-token');
  });

  it('returns total_reply_count in meta', async () => {
    const responseBody = {
      data: [{ id: 'r1', body: 'Reply 1' }],
      meta: { has_more: true, next_cursor: '2026-01-01T00:00:00Z', total_reply_count: 15 },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const result = await apiCall<Record<string, unknown>[]>(
      '/api/comments/some-id/replies?limit=1',
    );

    expect(result.meta?.total_reply_count).toBe(15);
  });

  it('handles empty replies', async () => {
    const responseBody = {
      data: [],
      meta: { has_more: false, next_cursor: null, total_reply_count: 0 },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const result = await apiCall<Record<string, unknown>[]>(
      '/api/comments/some-id/replies',
    );

    expect(result.data).toHaveLength(0);
    expect(result.meta?.has_more).toBe(false);
    expect(result.meta?.total_reply_count).toBe(0);
  });

  it('throws on 404 comment not found', async () => {
    const responseBody = { error: { code: 'NOT_FOUND', message: 'Comment not found' } };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 404 }));

    await expect(
      apiCall('/api/comments/nonexistent-id/replies'),
    ).rejects.toThrow('Comment not found');
  });

  it('defaults to limit 20 when no limit is specified', async () => {
    const responseBody = { data: [], meta: { has_more: false, total_reply_count: 0 } };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    const qs = buildQueryParams({});
    await apiCall<Record<string, unknown>[]>(`/api/comments/some-id/replies${qs}`);

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain('limit=');
  });
});

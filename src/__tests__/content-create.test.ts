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
import { createContentAction } from '../commands/content/create.js';

const mockGetValidToken = vi.mocked(getValidToken);
const mockFetch = vi.mocked(fetchWithTimeout);

describe('content create (integration)', () => {
  let stdoutData: string;

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutData = '';

    mockGetValidToken.mockResolvedValue('test-token');

    // Capture stdout.
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutData += String(chunk);
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends correct payload for basic text content', async () => {
    const responseBody = {
      data: { id: 'new-id', title: 'Test', content_type: 'text', is_published: true },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    await createContentAction({ title: 'Test', body: 'Hello world' });

    // Verify the API was called.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://eremos.jp/api/contents');
    expect(opts?.method).toBe('POST');

    // Verify payload.
    const payload = JSON.parse(opts?.body as string);
    expect(payload.title).toBe('Test');
    expect(payload.text_content).toBe('Hello world');
    expect(payload.content_type).toBe('text');
    expect(payload.is_published).toBe(true);
  });

  it('sends draft flag correctly', async () => {
    const responseBody = {
      data: { id: 'draft-id', title: 'Draft', content_type: 'text', is_published: false },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    await createContentAction({ title: 'Draft', draft: true });

    const [, opts] = mockFetch.mock.calls[0];
    const payload = JSON.parse(opts?.body as string);
    expect(payload.is_published).toBe(false);
  });

  it('sends tags as array', async () => {
    const responseBody = {
      data: { id: 'tag-id', title: 'Tagged', content_type: 'text', is_published: true },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    await createContentAction({ title: 'Tagged', tags: 'art, photo, landscape' });

    const [, opts] = mockFetch.mock.calls[0];
    const payload = JSON.parse(opts?.body as string);
    expect(payload.tags).toEqual(['art', 'photo', 'landscape']);
  });

  it('sends AI-related fields', async () => {
    const responseBody = {
      data: { id: 'ai-id', title: 'AI Art', content_type: 'image', is_published: true },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    await createContentAction({
      title: 'AI Art',
      type: 'image',
      aiModel: 'stable-diffusion',
      aiTools: 'comfyui, photoshop',
      aiLevel: 'mostly_ai',
      mediaUrl: 'https://cdn.example.com/img.png',
    });

    const [, opts] = mockFetch.mock.calls[0];
    const payload = JSON.parse(opts?.body as string);
    expect(payload.content_type).toBe('image');
    expect(payload.ai_model).toBe('stable-diffusion');
    expect(payload.ai_tools).toEqual(['comfyui', 'photoshop']);
    expect(payload.ai_contribution_level).toBe('mostly_ai');
    expect(payload.media_url).toBe('https://cdn.example.com/img.png');
  });

  it('accepts thread as content type', async () => {
    const responseBody = {
      data: { id: 'thread-id', title: 'Thread', content_type: 'thread', is_published: false },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    await createContentAction({ title: 'Thread', type: 'thread', draft: true });

    const [, opts] = mockFetch.mock.calls[0];
    const payload = JSON.parse(opts?.body as string);
    expect(payload.content_type).toBe('thread');
  });

  it('rejects invalid content type before API call', async () => {
    await expect(createContentAction({ title: 'Bad', type: 'invalid_type' })).rejects.toThrow(
      'Invalid content type',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('includes Idempotency-Key header', async () => {
    const responseBody = {
      data: { id: 'idem-id', title: 'Test', content_type: 'text', is_published: true },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));

    await createContentAction({ title: 'Test' });

    const [, opts] = mockFetch.mock.calls[0];
    const headers = opts?.headers as Headers;
    const key = headers.get('Idempotency-Key');
    expect(key).toBeTruthy();
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it('throws AuthError when not authenticated', async () => {
    mockGetValidToken.mockResolvedValue(null);

    await expect(createContentAction({ title: 'Test' })).rejects.toThrow(
      'Not authenticated',
    );
  });
});

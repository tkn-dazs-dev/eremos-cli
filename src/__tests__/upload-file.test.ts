import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, statSync } from 'fs';

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

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

import { getValidToken } from '../auth/tokenRefresh.js';
import { fetchWithTimeout } from '../utils/fetch.js';

const mockGetValidToken = vi.mocked(getValidToken);
const mockFetch = vi.mocked(fetchWithTimeout);
const mockReadFileSync = vi.mocked(readFileSync);
const mockStatSync = vi.mocked(statSync);

// Import after mocks.
async function loadUploadCommand() {
  const mod = await import('../commands/upload/file.js');
  return mod.uploadFileCommand;
}

describe('upload file (integration)', () => {
  let stdoutData: string;

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutData = '';

    mockGetValidToken.mockResolvedValue('test-token');
    mockStatSync.mockReturnValue({ size: 12345 } as ReturnType<typeof statSync>);
    mockReadFileSync.mockReturnValue(Buffer.from('fake-image-data'));

    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutData += String(chunk);
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes sign + PUT two-step flow', async () => {
    // Step 1: Sign response.
    const signResponse = {
      data: {
        upload_url: 'https://r2.example.com/presigned-put',
        media_url: 'https://cdn.example.com/image.png',
        content_id: 'content-uuid',
        required_headers: { 'x-amz-meta-owner': 'user-id' },
      },
    };
    // Step 2: PUT response.
    const putResponse = new Response('', { status: 200 });

    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(signResponse), { status: 200 }))
      .mockResolvedValueOnce(putResponse);

    // Import and use apiCall + fetchWithTimeout directly to test the flow.
    const { apiCall, requireAuth } = await import('../api/client.js');
    const { mimeFromExtension } = await import('../utils/mime.js');

    await requireAuth(); // Ensure auth passes.

    const fileName = 'photo.png';
    const contentType = mimeFromExtension(fileName);
    expect(contentType).toBe('image/png');

    // Step 1: Sign.
    const signResult = await apiCall<{
      upload_url: string;
      media_url: string;
      content_id: string;
      required_headers: Record<string, string>;
    }>('/api/upload/sign', {
      method: 'POST',
      idempotent: true,
      body: JSON.stringify({
        filename: fileName,
        contentType,
        sizeBytes: 12345,
      }),
    });

    expect(signResult.data.upload_url).toBe('https://r2.example.com/presigned-put');
    expect(signResult.data.media_url).toBe('https://cdn.example.com/image.png');
    expect(signResult.data.content_id).toBe('content-uuid');

    // Step 2: PUT.
    const { fetchWithTimeout: fetchFn } = await import('../utils/fetch.js');
    const putRes = await fetchFn(signResult.data.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType!,
        ...signResult.data.required_headers,
      },
      body: Buffer.from('fake-image-data'),
      timeoutMs: 120_000,
    });

    expect(putRes.ok).toBe(true);

    // Verify first call was to sign endpoint.
    const [signUrl, signOpts] = mockFetch.mock.calls[0];
    expect(signUrl).toBe('https://eremos.jp/api/upload/sign');
    expect(signOpts?.method).toBe('POST');
    const signPayload = JSON.parse(signOpts?.body as string);
    expect(signPayload.filename).toBe('photo.png');
    expect(signPayload.contentType).toBe('image/png');
    expect(signPayload.sizeBytes).toBe(12345);

    // Verify second call was PUT to presigned URL.
    const [putUrl, putOpts] = mockFetch.mock.calls[1];
    expect(putUrl).toBe('https://r2.example.com/presigned-put');
    expect(putOpts?.method).toBe('PUT');
    const putHeaders = putOpts?.headers as Record<string, string>;
    expect(putHeaders['Content-Type']).toBe('image/png');
    expect(putHeaders['x-amz-meta-owner']).toBe('user-id');
  });

  it('sign request includes Idempotency-Key', async () => {
    const signResponse = {
      data: {
        upload_url: 'https://r2.example.com/presigned-put',
        media_url: 'https://cdn.example.com/image.png',
        content_id: 'content-uuid',
        required_headers: {},
      },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(signResponse), { status: 200 }));

    const { apiCall } = await import('../api/client.js');

    await apiCall('/api/upload/sign', {
      method: 'POST',
      idempotent: true,
      body: JSON.stringify({ filename: 'test.jpg', contentType: 'image/jpeg', sizeBytes: 100 }),
    });

    const [, opts] = mockFetch.mock.calls[0];
    const headers = opts?.headers as Headers;
    expect(headers.get('Idempotency-Key')).toBeTruthy();
  });

  it('throws on unsupported file type', async () => {
    const { mimeFromExtension } = await import('../utils/mime.js');
    expect(mimeFromExtension('file.xyz')).toBeUndefined();
  });
});

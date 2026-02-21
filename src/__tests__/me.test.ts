import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/client.js', () => ({
  apiCall: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('../utils/output.js', () => ({
  printJson: vi.fn(),
  printKeyValue: vi.fn(),
}));

import { apiCall, requireAuth } from '../api/client.js';
import { printJson, printKeyValue } from '../utils/output.js';
import { ApiError } from '../utils/errors.js';
import { meCommand, resolveMeData } from '../commands/me.js';

const mockApiCall = vi.mocked(apiCall);
const mockRequireAuth = vi.mocked(requireAuth);
const mockPrintJson = vi.mocked(printJson);
const mockPrintKeyValue = vi.mocked(printKeyValue);

function makeToken(payload: Record<string, unknown>): string {
  const head = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${head}.${body}.sig`;
}

async function runMe(opts: { showEmail?: boolean }, parentOpts: { json?: boolean }) {
  const optsSpy = vi.spyOn(meCommand, 'opts').mockReturnValue(opts);
  const originalParent = (meCommand as any).parent;
  (meCommand as any).parent = { opts: () => parentOpts };
  try {
    await (
      meCommand as unknown as {
        _actionHandler: (args: unknown[]) => Promise<void>;
      }
    )._actionHandler([]);
  } finally {
    optsSpy.mockRestore();
    (meCommand as any).parent = originalParent;
  }
}

describe('resolveMeData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses /api/users/me when profile is available', async () => {
    mockApiCall.mockResolvedValueOnce({
      data: {
        profile: {
          id: 'u1',
          handle: 'alice',
          name: 'Alice',
          website: 'https://example.com',
          role: 'admin',
        },
        email: 'alice@example.com',
      },
    } as any);

    const token = makeToken({ sub: 'u1', email: 'jwt@example.com' });
    const result = await resolveMeData(token);

    expect(result.source).toBe('users_me');
    expect(result.email).toBe('alice@example.com');
    expect(result.profile.id).toBe('u1');
    expect(result.profile.name).toBe('Alice');
    expect(result.profile.is_admin).toBe(true);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
    expect(mockApiCall).toHaveBeenNthCalledWith(1, '/api/users/me');
  });

  it('falls back to /api/users/{id} when /api/users/me returns embedded OAUTH_NOT_ALLOWED', async () => {
    mockApiCall
      .mockResolvedValueOnce({
        data: {
          profile: { error: 'OAUTH_NOT_ALLOWED' },
          email: 'api@example.com',
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          id: 'u1',
          handle: 'alice',
          name: 'Alice',
        },
      } as any);

    const token = makeToken({ sub: 'u1', email: 'jwt@example.com' });
    const result = await resolveMeData(token);

    expect(result.source).toBe('users_get_fallback');
    expect(result.email).toBe('api@example.com');
    expect(result.profile.id).toBe('u1');
    expect(result.warnings?.[0]).toContain('fell back to /api/users/{id}');
    expect(mockApiCall).toHaveBeenCalledTimes(2);
    expect(mockApiCall).toHaveBeenNthCalledWith(1, '/api/users/me');
    expect(mockApiCall).toHaveBeenNthCalledWith(2, '/api/users/u1');
  });

  it('falls back to /api/users/{id} when /api/users/me returns top-level OAUTH_NOT_ALLOWED', async () => {
    mockApiCall
      .mockRejectedValueOnce(
        new ApiError(403, { code: 'OAUTH_NOT_ALLOWED', message: 'This endpoint does not support OAuth access' }),
      )
      .mockResolvedValueOnce({
        data: {
          id: 'u1',
          handle: 'alice',
          name: 'Alice',
        },
      } as any);

    const token = makeToken({ sub: 'u1', email: 'jwt@example.com' });
    const result = await resolveMeData(token);

    expect(result.source).toBe('users_get_fallback');
    expect(result.email).toBe('jwt@example.com');
    expect(result.profile.id).toBe('u1');
    expect(mockApiCall).toHaveBeenCalledTimes(2);
    expect(mockApiCall).toHaveBeenNthCalledWith(1, '/api/users/me');
    expect(mockApiCall).toHaveBeenNthCalledWith(2, '/api/users/u1');
  });

  it('throws when fallback is needed but token has no sub claim', async () => {
    mockApiCall.mockResolvedValueOnce({
      data: {
        profile: { error: 'OAUTH_NOT_ALLOWED' },
      },
    } as any);

    const token = makeToken({ email: 'jwt@example.com' });
    await expect(resolveMeData(token)).rejects.toThrow('Unable to resolve current user ID');
  });

  it('keeps email field using JWT email when API payload has no email', async () => {
    mockApiCall.mockResolvedValueOnce({
      data: {
        profile: {
          id: 'u1',
          handle: 'alice',
          name: 'Alice',
        },
      },
    } as any);

    const token = makeToken({ sub: 'u1', email: 'jwt@example.com' });
    const result = await resolveMeData(token);

    expect(result).toHaveProperty('email');
    expect(result.email).toBe('jwt@example.com');
  });
});

describe('me command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides email from human-readable output when --show-email is not specified', async () => {
    mockRequireAuth.mockResolvedValue(makeToken({ sub: 'u1', email: 'jwt@example.com' }));
    mockApiCall.mockResolvedValueOnce({
      data: {
        profile: {
          id: 'u1',
          handle: 'alice',
          name: 'Alice',
        },
        email: 'alice@example.com',
      },
    } as any);

    await runMe({}, { json: false });

    expect(mockPrintJson).not.toHaveBeenCalled();
    expect(mockPrintKeyValue).toHaveBeenCalledTimes(2);
    const [, fields] = mockPrintKeyValue.mock.calls[1] as [Record<string, unknown>, Array<{ key: string }>];
    expect(fields.some((field) => field.key === 'email')).toBe(false);
  });

  it('hides email from JSON output when --show-email is not specified', async () => {
    mockRequireAuth.mockResolvedValue(makeToken({ sub: 'u1', email: 'jwt@example.com' }));
    mockApiCall.mockResolvedValueOnce({
      data: {
        profile: {
          id: 'u1',
          handle: 'alice',
          name: 'Alice',
        },
        email: 'alice@example.com',
      },
    } as any);

    await runMe({}, { json: true });

    expect(mockPrintKeyValue).not.toHaveBeenCalled();
    expect(mockPrintJson).toHaveBeenCalledTimes(1);
    const [payload] = mockPrintJson.mock.calls[0] as [{ data: { email?: string | null } }];
    expect(payload.data.email).toBeUndefined();
  });
});

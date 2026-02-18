import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../auth/tokenStore.js', () => ({
  loadTokens: vi.fn(),
  isTokenExpired: vi.fn(),
}));

vi.mock('../auth/tokenRefresh.js', () => ({
  getValidToken: vi.fn(),
}));

import { statusCommand } from '../commands/status.js';
import { loadTokens, isTokenExpired } from '../auth/tokenStore.js';
import { getValidToken } from '../auth/tokenRefresh.js';

const mockLoadTokens = vi.mocked(loadTokens);
const mockIsTokenExpired = vi.mocked(isTokenExpired);
const mockGetValidToken = vi.mocked(getValidToken);

async function runStatus(opts: { showEmail?: boolean }) {
  const optsSpy = vi.spyOn(statusCommand, 'opts').mockReturnValue(opts);
  try {
    await (
      statusCommand as unknown as {
        _actionHandler: (args: unknown[]) => Promise<void>;
      }
    )._actionHandler([]);
  } finally {
    optsSpy.mockRestore();
  }
}

describe('status command', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sanitizes malicious client_id before printing', async () => {
    mockLoadTokens.mockReturnValue({
      access_token: 'token',
      refresh_token: 'refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      client_id: 'cli\x1b[31ment\x00',
    });
    mockIsTokenExpired.mockReturnValue(false);
    mockGetValidToken.mockResolvedValue(null);

    await runStatus({});

    const output = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('Client ID: client');
    expect(output).not.toContain('\x1b[31m');
    expect(output).not.toContain('\x00');
  });

  it('sanitizes malicious JWT claims before printing', async () => {
    mockLoadTokens.mockReturnValue({
      access_token: 'token',
      refresh_token: 'refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      client_id: 'safe-client',
    });
    mockIsTokenExpired.mockReturnValue(false);

    const payload = Buffer.from(
      JSON.stringify({ sub: 'u\x1b[31mser\x1b[0m', email: 'me\x00@example.com' }),
      'utf-8',
    ).toString('base64url');
    mockGetValidToken.mockResolvedValue(`head.${payload}.sig`);

    await runStatus({ showEmail: true });

    const output = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('User ID: user');
    expect(output).toContain('Email: me@example.com');
    expect(output).not.toContain('\x1b[31m');
    expect(output).not.toContain('\x00');
  });
});

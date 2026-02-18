import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config.js', () => ({
  getSupabaseUrl: vi.fn(),
  getOauthClientId: vi.fn(),
}));

import { loginCommand } from '../commands/login.js';
import { getSupabaseUrl, getOauthClientId } from '../config.js';

const mockGetSupabaseUrl = vi.mocked(getSupabaseUrl);
const mockGetOauthClientId = vi.mocked(getOauthClientId);

async function runLogin(opts: { manual?: boolean }) {
  const optsSpy = vi.spyOn(loginCommand, 'opts').mockReturnValue(opts);
  try {
    await (
      loginCommand as unknown as {
        _actionHandler: (args: unknown[]) => Promise<void>;
      }
    )._actionHandler([]);
  } finally {
    optsSpy.mockRestore();
  }
}

describe('login command', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sanitizes configuration errors before printing', async () => {
    mockGetSupabaseUrl.mockImplementation(() => {
      throw new Error('\x1b]0;pwned\x07Bad\x00Config');
    });
    mockGetOauthClientId.mockReturnValue('client-id');

    await expect(runLogin({ manual: true })).rejects.toThrow('process.exit:1');

    const output = errorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('Error: BadConfig');
    expect(output).not.toContain('\x1b]0;');
    expect(output).not.toContain('\x00');
  });
});

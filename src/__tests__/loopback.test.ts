import { describe, it, expect, afterEach, vi } from 'vitest';
import http from 'http';

let nextPort = 17800 + Math.floor(Math.random() * 100);
function allocatePort() {
  return nextPort++;
}

vi.mock('../config.js', () => ({
  getLoopbackPort: () => nextPort - 1, // return the last allocated port
}));

import { startLoopbackServer, getLoopbackRedirectUri } from '../auth/loopback.js';
import type { LoopbackServerHandle } from '../auth/loopback.js';

function httpGet(port: number, path: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode!, body }));
    }).on('error', reject);
  });
}

describe('getLoopbackRedirectUri', () => {
  it('returns correct loopback URL', () => {
    const port = allocatePort();
    const uri = getLoopbackRedirectUri();
    expect(uri).toBe(`http://127.0.0.1:${port}/callback`);
  });
});

describe('startLoopbackServer', () => {
  let handle: LoopbackServerHandle | null = null;

  afterEach(() => {
    handle?.close();
    handle = null;
  });

  it('resolves on valid callback with matching state', async () => {
    const port = allocatePort();
    const state = 'test-state-123';
    handle = await startLoopbackServer(state);

    const responsePromise = httpGet(port, `/callback?code=auth-code-abc&state=${state}`);
    const result = await handle.result;

    expect(result.code).toBe('auth-code-abc');
    expect(result.state).toBe(state);

    const response = await responsePromise;
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Success');
  });

  it('returns 400 on state mismatch without terminating server', async () => {
    const port = allocatePort();
    const state = 'correct-state';
    handle = await startLoopbackServer(state);

    const badResponse = await httpGet(port, `/callback?code=code&state=wrong-state`);
    expect(badResponse.statusCode).toBe(400);
    expect(badResponse.body).toContain('State mismatch');
  });

  it('rejects on OAuth error with matching state', async () => {
    const port = allocatePort();
    const state = 'test-state-err';
    handle = await startLoopbackServer(state);

    const responsePromise = httpGet(
      port,
      `/callback?error=access_denied&error_description=User+denied&state=${state}`
    ).catch(() => null);

    await expect(handle.result).rejects.toThrow('User denied');
    await responsePromise;
  });

  it('returns 404 for non-callback paths', async () => {
    const port = allocatePort();
    handle = await startLoopbackServer('test-state-404');

    const response = await httpGet(port, '/other-path');
    expect(response.statusCode).toBe(404);
  });
});

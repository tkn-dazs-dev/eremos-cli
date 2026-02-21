import http from 'http';
import { URL } from 'url';
import { getLoopbackPort } from '../config.js';

interface CallbackResult {
  code: string;
  state: string;
}

export interface LoopbackServerHandle {
  redirectUri: string;
  result: Promise<CallbackResult>;
  close: () => void;
}

const LOOPBACK_HOST = '127.0.0.1';
const CALLBACK_PATH = '/callback';
const TIMEOUT_MS = 5 * 60 * 1000;

export function getLoopbackRedirectUri(): string {
  const port = getLoopbackPort();
  return `http://${LOOPBACK_HOST}:${port}${CALLBACK_PATH}`;
}

/**
 * Start a loopback HTTP server to receive the OAuth callback.
 *
 * Notes:
 * - Many OAuth servers require an exact redirect URI match, so the port is configurable
 *   but not randomized by default.
 * - Invalid / unrelated callback requests do NOT terminate the server (DoS hardening).
 */
export async function startLoopbackServer(expectedState: string): Promise<LoopbackServerHandle> {
  const port = getLoopbackPort();
  const redirectUri = `http://${LOOPBACK_HOST}:${port}${CALLBACK_PATH}`;

  let done = false;
  let server: http.Server | null = null;

  const shutdownServer = () => {
    try {
      server?.close();
    } catch {
      // ignore
    }
    try {
      server?.closeAllConnections();
    } catch {
      // ignore
    }
  };

  let resolveResult!: (r: CallbackResult) => void;
  let rejectResult!: (e: Error) => void;
  const result = new Promise<CallbackResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const finalize = (fn: () => void) => {
    if (done) return;
    done = true;
    try {
      fn();
    } finally {
      shutdownServer();
    }
  };

  server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      if (!req.url) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
        return;
      }

      if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
      }

      const url = new URL(req.url, `http://${LOOPBACK_HOST}:${port}`);

      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      // Require state match for terminating the flow.
      if (!state || state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlResponse('Error', 'State mismatch or missing state.'));
        return;
      }

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlResponse('Authorization Denied', 'You can close this window.'));
        finalize(() => rejectResult(new Error(errorDescription || error)));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlResponse('Error', 'Missing code parameter.'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        htmlResponse('Success', 'Authorization complete! You can close this window and return to the terminal.')
      );
      finalize(() => resolveResult({ code, state }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  await new Promise<void>((resolve, reject) => {
    server!.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Loopback port ${port} is already in use. ` +
              `Close the process using it or set EREMOS_LOOPBACK_PORT to an available port and register the matching redirect URI.`
          )
        );
      } else {
        reject(err);
      }
    });
    server!.listen(port, LOOPBACK_HOST, () => resolve());
  });

  const timeout = setTimeout(() => {
    finalize(() => rejectResult(new Error('Authorization timed out after 5 minutes')));
  }, TIMEOUT_MS);

  server.on('close', () => clearTimeout(timeout));

  return {
    redirectUri,
    result,
    close: () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      shutdownServer();
    },
  };
}

function htmlResponse(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>${escapeHtml(title)} - Eremos CLI</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; display: flex;
         justify-content: center; align-items: center; min-height: 100vh;
         margin: 0; background: #111; color: #eee; }
  .card { text-align: center; padding: 2rem; max-width: 36rem; }
  h1 { margin-bottom: 0.5rem; }
  p { color: #bbb; line-height: 1.4; }
</style>
</head>
<body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></div></body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

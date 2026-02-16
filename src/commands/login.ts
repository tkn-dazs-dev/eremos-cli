import { Command } from 'commander';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '../auth/pkce.js';
import { getLoopbackRedirectUri, startLoopbackServer } from '../auth/loopback.js';
import { saveTokens, type StoredTokens } from '../auth/tokenStore.js';
import { getOauthClientId, getSupabaseUrl } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import { joinUrl } from '../utils/urls.js';
import { toFormUrlEncoded } from '../utils/form.js';

const DEFAULT_OAUTH_SCOPES = 'openid';

export const loginCommand = new Command('login')
  .description('Authenticate with the Eremos platform via OAuth 2.1 PKCE')
  .option('--manual', 'Do not start a local server; paste the callback URL manually')
  .action(async (opts: { manual?: boolean }) => {
    let supabaseUrl: URL;
    let clientId: string;

    try {
      supabaseUrl = getSupabaseUrl();
      clientId = getOauthClientId();
    } catch (e) {
      console.error(`Error: ${(e as Error).message}`);
      process.exit(1);
      return;
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();
    const redirectUri = getLoopbackRedirectUri();

    // Start loopback server before opening the browser (race avoidance).
    const loopback = opts.manual
      ? null
      : await startLoopbackServer(state).catch((e: Error) => {
          console.error(`Error: ${e.message}`);
          process.exit(1);
          return null;
        });

    const authorizeUrl = new URL(joinUrl(supabaseUrl, '/auth/v1/oauth/authorize'));
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('scope', DEFAULT_OAUTH_SCOPES);

    console.log('Opening browser for authorization...');
    console.log();

    try {
      const open = (await import('open')).default;
      await open(authorizeUrl.toString());
    } catch {
      console.log('Could not open browser automatically.');
    }

    console.log('If the browser did not open, visit this URL:');
    console.log(authorizeUrl.toString());
    console.log();

    let code = '';

    if (opts.manual) {
      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      console.log('After approving, copy the full callback URL from your browser address bar');
      console.log('and paste it here. (If the page shows an error, you can still copy the URL.)');
      console.log();

      const callbackUrl = await new Promise<string>((resolve) => {
        rl.question('Callback URL: ', (answer: string) => {
          rl.close();
          resolve(answer.trim());
        });
      });

      try {
        const parsed = new URL(callbackUrl);
        const urlCode = parsed.searchParams.get('code');
        const urlState = parsed.searchParams.get('state');

        if (!urlCode) throw new Error('No authorization code found in the callback URL');
        if (urlState !== state) throw new Error('State mismatch');

        code = urlCode;
      } catch (e) {
        console.error(`Error: ${(e as Error).message || 'Invalid callback URL'}`);
        process.exit(1);
        return;
      }
    } else {
      console.log('Waiting for authorization...');
      try {
        if (!loopback) throw new Error('Loopback server did not start');
        const result = await loopback.result;
        code = result.code;
      } catch (e) {
        console.error(`Authorization failed: ${(e as Error).message}`);
        process.exit(1);
        return;
      } finally {
        loopback?.close();
      }
    }

    console.log('Exchanging code for tokens...');

    const tokenEndpoint = joinUrl(supabaseUrl, '/auth/v1/oauth/token');

    try {
      const tokenResponse = await fetchWithTimeout(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: toFormUrlEncoded({
          grant_type: 'authorization_code',
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
          client_id: clientId,
        }),
        timeoutMs: 20_000,
      });

      const tokenData = (await tokenResponse.json().catch(() => ({}))) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
      };

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokenData.error_description || tokenData.error || 'Unknown error');
        process.exit(1);
        return;
      }

      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      if (!accessToken || !refreshToken) {
        console.error('Token exchange failed: missing tokens in response');
        process.exit(1);
        return;
      }

      const tokens: StoredTokens = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + (tokenData.expires_in ?? 3600),
        client_id: clientId,
      };

      saveTokens(tokens);

      console.log();
      console.log('Login successful!');
      console.log('Tokens saved to ~/.eremos/credentials.json');
    } catch (e) {
      console.error(`Login failed: ${(e as Error).message}`);
      process.exit(1);
    }
  });

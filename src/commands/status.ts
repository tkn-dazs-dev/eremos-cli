import { Command } from 'commander';
import { loadTokens, isTokenExpired } from '../auth/tokenStore.js';
import { getValidToken } from '../auth/tokenRefresh.js';
import { stripTerminalEscapes } from '../utils/sanitize.js';

export const statusCommand = new Command('status')
  .description('Show current authentication status')
  .option('--show-email', 'Show email claim if present (may be sensitive)')
  .action(async (opts: { showEmail?: boolean }) => {
    const tokens = loadTokens();
    if (!tokens) {
      console.log('Not logged in.');
      console.log('Run `eremos login` to authenticate.');
      return;
    }

    console.log('Authentication Status:');
    console.log(`  Client ID: ${stripTerminalEscapes(tokens.client_id)}`);
    console.log(`  Token expires: ${new Date(tokens.expires_at * 1000).toLocaleString()}`);
    console.log(`  Expired: ${isTokenExpired(tokens) ? 'Yes' : 'No'}`);

    const valid = await getValidToken();
    if (!valid) {
      console.log('  Status: Invalid (please re-login)');
      return;
    }

    console.log('  Status: Active');

    // Best-effort JWT decode (no verification here).
    try {
      const payload = JSON.parse(Buffer.from(valid.split('.')[1], 'base64url').toString('utf-8')) as Record<string, any>;
      if (payload.sub) console.log(`  User ID: ${stripTerminalEscapes(String(payload.sub))}`);
      if (opts.showEmail && payload.email) console.log(`  Email: ${stripTerminalEscapes(String(payload.email))}`);
    } catch {
      // ignore
    }
  });

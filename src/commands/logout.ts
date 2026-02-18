import { Command } from 'commander';
import { deleteTokens, loadTokens } from '../auth/tokenStore.js';
import { getSupabaseUrl } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import { joinUrl } from '../utils/urls.js';

export const logoutCommand = new Command('logout')
  .description('Sign out and remove stored tokens')
  .action(async () => {
    const tokens = loadTokens();
    if (!tokens) {
      console.log('Not currently logged in.');
      return;
    }

    // Best-effort server-side logout (still delete locally even if it fails).
    if (tokens.access_token) {
      try {
        const supabaseUrl = getSupabaseUrl();
        const endpoint = joinUrl(supabaseUrl, '/auth/v1/logout');

        await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: 'application/json',
          },
          redirect: 'error',
          timeoutMs: 10_000,
        });
      } catch {
        // ignore
      }
    }

    deleteTokens();
    console.log('Logged out successfully. Tokens removed.');
  });

import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printSuccess } from '../../utils/output.js';
import { safePathSegment } from '../../utils/sanitize.js';

export const userFollowCommand = new Command('follow')
  .description('Follow a user')
  .argument('<id>', 'User ID')
  .action(
    withErrorHandler(async (id: string, _opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<unknown>(`/api/users/${safePathSegment(id)}/follow`, { method: 'POST', idempotent: true });

      if (json) {
        printJson(result);
      } else {
        printSuccess(`Followed user ${id}`);
      }
    }),
  );

export const userUnfollowCommand = new Command('unfollow')
  .description('Unfollow a user')
  .argument('<id>', 'User ID')
  .action(
    withErrorHandler(async (id: string, _opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<unknown>(`/api/users/${safePathSegment(id)}/follow`, { method: 'DELETE' });

      if (json) {
        printJson(result);
      } else {
        printSuccess(`Unfollowed user ${id}`);
      }
    }),
  );

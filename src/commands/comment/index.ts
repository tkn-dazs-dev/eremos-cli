import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printSuccess } from '../../utils/output.js';
import { safePathSegment } from '../../utils/sanitize.js';

export const commentCommand = new Command('comment').description('Comment commands');

commentCommand
  .command('like')
  .description('Like a comment')
  .argument('<id>', 'Comment ID')
  .action(
    withErrorHandler(async (id: string, _opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<unknown>(`/api/comments/${safePathSegment(id)}/like`, { method: 'POST', idempotent: true });

      if (json) {
        printJson(result);
      } else {
        printSuccess(`Liked comment ${id}`);
      }
    }),
  );

commentCommand
  .command('unlike')
  .description('Unlike a comment')
  .argument('<id>', 'Comment ID')
  .action(
    withErrorHandler(async (id: string, _opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<unknown>(`/api/comments/${safePathSegment(id)}/like`, { method: 'DELETE' });

      if (json) {
        printJson(result);
      } else {
        printSuccess(`Unliked comment ${id}`);
      }
    }),
  );

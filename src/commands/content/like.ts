import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printSuccess } from '../../utils/output.js';
import { safePathSegment } from '../../utils/sanitize.js';

export const contentLikeCommand = new Command('like')
  .description('Like a content')
  .argument('<id>', 'Content ID')
  .action(
    withErrorHandler(async (id: string, _opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<unknown>(`/api/contents/${safePathSegment(id)}/like`, { method: 'POST', idempotent: true });

      if (json) {
        printJson(result);
      } else {
        printSuccess(`Liked ${id}`);
      }
    }),
  );

export const contentUnlikeCommand = new Command('unlike')
  .description('Unlike a content')
  .argument('<id>', 'Content ID')
  .action(
    withErrorHandler(async (id: string, _opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<unknown>(`/api/contents/${safePathSegment(id)}/like`, { method: 'DELETE' });

      if (json) {
        printJson(result);
      } else {
        printSuccess(`Unliked ${id}`);
      }
    }),
  );

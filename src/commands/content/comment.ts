import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printSuccess } from '../../utils/output.js';
import { safePathSegment } from '../../utils/sanitize.js';

export const contentCommentCommand = new Command('comment')
  .description('Post a comment on content')
  .argument('<id>', 'Content ID')
  .requiredOption('-b, --body <body>', 'Comment body (1-1000 chars)')
  .option('-p, --parent <parentId>', 'Parent comment ID (for replies)')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;

      const body = (opts.body as string).trim();
      if (!body || body.length > 1000) {
        throw new Error('Comment body must be 1-1000 characters');
      }

      const payload: Record<string, unknown> = { body };
      if (opts.parent) payload.parent_id = opts.parent;

      const result = await apiCall<Record<string, unknown>>(`/api/contents/${safePathSegment(id)}/comments`, {
        method: 'POST',
        idempotent: true,
        body: JSON.stringify(payload),
      });

      if (json) {
        printJson(result);
      } else {
        printSuccess(`Comment posted on ${id}`);
      }
    }),
  );

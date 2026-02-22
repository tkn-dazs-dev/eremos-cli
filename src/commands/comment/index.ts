import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printSuccess, printTable, printPagination, type ColumnDef } from '../../utils/output.js';
import { buildQueryParams } from '../../utils/pagination.js';
import { safePathSegment } from '../../utils/sanitize.js';

const replyColumns: ColumnDef[] = [
  { key: 'id', label: 'ID', width: 36 },
  { key: 'body', label: 'Body', width: 40 },
  { key: 'author', label: 'Author', width: 16, transform: (v) => {
    const a = v as Record<string, unknown> | null;
    return a ? `@${a.handle ?? ''}` : '';
  }},
  { key: 'like_count', label: 'Likes', width: 6 },
  { key: 'created_at', label: 'Created', width: 20, transform: (v) => v ? new Date(v as string).toLocaleDateString() : '—' },
];

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

commentCommand
  .command('replies')
  .description('List replies to a comment')
  .argument('<id>', 'Comment ID')
  .option('--limit <n>', 'Results per page', '20')
  .option('--cursor <cursor>', 'Pagination cursor')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({
        limit: opts.limit,
        cursor: opts.cursor,
      });

      const result = await apiCall<Record<string, unknown>[]>(
        `/api/comments/${safePathSegment(id)}/replies${qs}`,
      );

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, replyColumns);
        printPagination(result.meta);
      }
    }),
  );

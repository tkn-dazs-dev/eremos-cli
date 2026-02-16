import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, printPagination, type ColumnDef } from '../../utils/output.js';
import { buildQueryParams } from '../../utils/pagination.js';

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', width: 36 },
  { key: 'title', label: 'Title', width: 30 },
  { key: 'content_type', label: 'Type', width: 8 },
  { key: 'author', label: 'Author', width: 20, transform: (v) => {
    const a = v as Record<string, unknown> | null;
    return a ? `@${a.handle ?? ''}` : '';
  }},
];

export const feedFollowingCommand = new Command('following')
  .description('Feed from users you follow')
  .option('--type <type>', 'Filter by content type')
  .option('--limit <n>', 'Results per page', '20')
  .option('--cursor <cursor>', 'Pagination cursor')
  .action(
    withErrorHandler(async (opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({
        type: opts.type,
        limit: opts.limit,
        cursor: opts.cursor,
      });

      const result = await apiCall<Record<string, unknown>[]>(`/api/feed/following${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
        printPagination(result.meta);
      }
    }),
  );

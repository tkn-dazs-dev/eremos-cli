import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
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
  { key: 'like_count', label: 'Likes', width: 6 },
];

export const feedListCommand = new Command('list')
  .description('List feed items')
  .option('--type <type>', 'Filter by content type')
  .option('--period <period>', 'Time period (day, week, month, all)')
  .option('--limit <n>', 'Results per page', '20')
  .option('--cursor <cursor>', 'Pagination cursor')
  .action(
    withErrorHandler(async (opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({
        type: opts.type,
        period: opts.period,
        limit: opts.limit,
        cursor: opts.cursor,
      });

      const result = await apiCall<Record<string, unknown>[]>(`/api/feed${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
        printPagination(result.meta);
      }
    }),
  );

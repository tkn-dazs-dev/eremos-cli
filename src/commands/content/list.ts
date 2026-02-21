import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, printPagination, type ColumnDef } from '../../utils/output.js';
import { buildQueryParams } from '../../utils/pagination.js';

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', width: 36 },
  { key: 'title', label: 'Title', width: 30 },
  { key: 'content_type', label: 'Type', width: 8 },
  { key: 'is_published', label: 'Published', width: 9, transform: (v) => (v ? 'Yes' : 'Draft') },
  { key: 'created_at', label: 'Created', width: 20, transform: (v) => v ? new Date(v as string).toLocaleDateString() : '—' },
];

export const contentListCommand = new Command('list')
  .description('List contents')
  .option('--type <type>', 'Filter by content type (text, image, video, music, novel, article, thread)')
  .option('--period <period>', 'Time period (day, week, month, all)')
  .option('--sort <sort>', 'Sort order (latest, popular)')
  .option('--limit <n>', 'Results per page', '20')
  .option('--cursor <cursor>', 'Pagination cursor')
  .action(
    withErrorHandler(async (opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({
        type: opts.type,
        period: opts.period,
        sort: opts.sort,
        limit: opts.limit,
        cursor: opts.cursor,
      });

      const result = await apiCall<Record<string, unknown>[]>(`/api/contents${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
        printPagination(result.meta);
      }
    }),
  );

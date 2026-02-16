import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, printPagination, type ColumnDef } from '../../utils/output.js';
import { buildQueryParams } from '../../utils/pagination.js';

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', width: 36 },
  { key: 'title', label: 'Title', width: 30 },
  { key: 'description', label: 'Description', width: 30 },
  { key: 'content_count', label: 'Contents', width: 9 },
];

export const seriesListCommand = new Command('list')
  .description('List series')
  .option('--author-id <id>', 'Filter by author ID')
  .option('--limit <n>', 'Results per page', '20')
  .option('--cursor <cursor>', 'Pagination cursor')
  .action(
    withErrorHandler(async (opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({
        author_id: opts.authorId,
        limit: opts.limit,
        cursor: opts.cursor,
      });

      const result = await apiCall<Record<string, unknown>[]>(`/api/series${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
        printPagination(result.meta);
      }
    }),
  );

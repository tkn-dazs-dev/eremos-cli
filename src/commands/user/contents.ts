import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, printPagination, type ColumnDef } from '../../utils/output.js';
import { buildQueryParams } from '../../utils/pagination.js';
import { safePathSegment } from '../../utils/sanitize.js';

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', width: 36 },
  { key: 'title', label: 'Title', width: 30 },
  { key: 'content_type', label: 'Type', width: 8 },
  { key: 'like_count', label: 'Likes', width: 6 },
  { key: 'created_at', label: 'Created', width: 20, transform: (v) => v ? new Date(v as string).toLocaleDateString() : '—' },
];

export const userContentsCommand = new Command('contents')
  .description("List a user's published contents")
  .argument('<id>', 'User ID')
  .option('--sort <sort>', 'Sort order (latest, popular)')
  .option('--limit <n>', 'Results per page', '20')
  .option('--cursor <cursor>', 'Pagination cursor')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({ sort: opts.sort, limit: opts.limit, cursor: opts.cursor });
      const result = await apiCall<Record<string, unknown>[]>(`/api/users/${safePathSegment(id)}/contents${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
        printPagination(result.meta);
      }
    }),
  );

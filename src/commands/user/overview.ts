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
];

export const userOverviewCommand = new Command('overview')
  .description('Get user overview (posts/likes tab)')
  .argument('<id>', 'User ID')
  .option('--tab <tab>', 'Tab view (posts, likes)')
  .option('--sort <sort>', 'Sort order (latest, popular)')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({ tab: opts.tab, sort: opts.sort });
      const result = await apiCall<Record<string, unknown>[]>(`/api/users/${safePathSegment(id)}/overview${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
        printPagination(result.meta);
      }
    }),
  );

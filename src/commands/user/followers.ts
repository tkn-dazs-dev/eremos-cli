import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, printPagination, type ColumnDef } from '../../utils/output.js';
import { buildQueryParams } from '../../utils/pagination.js';
import { safePathSegment } from '../../utils/sanitize.js';

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', width: 36 },
  { key: 'handle', label: 'Handle', width: 20, transform: (v) => v ? `@${v}` : '' },
  { key: 'display_name', label: 'Name', width: 20 },
];

export const userFollowersCommand = new Command('followers')
  .description("List a user's followers")
  .argument('<id>', 'User ID')
  .option('--limit <n>', 'Results per page', '20')
  .option('--cursor <cursor>', 'Pagination cursor')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({ limit: opts.limit, cursor: opts.cursor });
      const result = await apiCall<Record<string, unknown>[]>(`/api/users/${safePathSegment(id)}/followers${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
        printPagination(result.meta);
      }
    }),
  );

export const userFollowingCommand = new Command('following')
  .description("List users that a user follows")
  .argument('<id>', 'User ID')
  .option('--limit <n>', 'Results per page', '20')
  .option('--cursor <cursor>', 'Pagination cursor')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({ limit: opts.limit, cursor: opts.cursor });
      const result = await apiCall<Record<string, unknown>[]>(`/api/users/${safePathSegment(id)}/following${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
        printPagination(result.meta);
      }
    }),
  );

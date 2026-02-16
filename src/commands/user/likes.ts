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
  { key: 'author', label: 'Author', width: 20, transform: (v) => {
    const a = v as Record<string, unknown> | null;
    return a ? `@${a.handle ?? ''}` : '';
  }},
];

export const userLikesCommand = new Command('likes')
  .description("List a user's liked contents")
  .argument('<id>', 'User ID')
  .option('--limit <n>', 'Results per page', '20')
  .option('--cursor <cursor>', 'Pagination cursor')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({ limit: opts.limit, cursor: opts.cursor });
      const result = await apiCall<Record<string, unknown>[]>(`/api/users/${safePathSegment(id)}/likes${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
        printPagination(result.meta);
      }
    }),
  );

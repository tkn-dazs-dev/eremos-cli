import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, type ColumnDef } from '../../utils/output.js';
import { buildQueryParams } from '../../utils/pagination.js';
import { safePathSegment } from '../../utils/sanitize.js';

const columns: ColumnDef[] = [
  { key: 'user_id', label: 'User ID', width: 36 },
  { key: 'handle', label: 'Handle', width: 20, transform: (v) => v ? `@${v}` : '' },
  { key: 'display_name', label: 'Name', width: 20 },
];

export const contentReactionsCommand = new Command('reactions')
  .description('List users who reacted to content')
  .argument('<id>', 'Content ID')
  .option('--type <type>', 'Reaction type (like or stamp_id)')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({ type: opts.type });
      const result = await apiCall<Record<string, unknown>[]>(
        `/api/contents/${safePathSegment(id)}/reactions/users${qs}`,
      );

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
      }
    }),
  );

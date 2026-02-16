import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, type ColumnDef } from '../../utils/output.js';
import { buildQueryParams } from '../../utils/pagination.js';

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', width: 36 },
  { key: 'handle', label: 'Handle', width: 20, transform: (v) => v ? `@${v}` : '' },
  { key: 'display_name', label: 'Name', width: 20 },
  { key: 'bio', label: 'Bio', width: 30 },
];

export const userSuggestedCommand = new Command('suggested')
  .description('List suggested users to follow')
  .option('--limit <n>', 'Number of suggestions (default: 5, max: 20)')
  .action(
    withErrorHandler(async (opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({ limit: opts.limit });
      const result = await apiCall<Record<string, unknown>[]>(`/api/users/suggested${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
      }
    }),
  );

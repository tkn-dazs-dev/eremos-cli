import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, type ColumnDef } from '../../utils/output.js';
import { buildQueryParams } from '../../utils/pagination.js';

const columns: ColumnDef[] = [
  { key: 'name', label: 'Tag', width: 30 },
  { key: 'count', label: 'Uses', width: 8 },
];

export const tagSearchCommand = new Command('search')
  .description('Search tags')
  .option('--query <q>', 'Search query')
  .option('--limit <n>', 'Max results')
  .action(
    withErrorHandler(async (opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({ q: opts.query, limit: opts.limit });
      const result = await apiCall<Record<string, unknown>[]>(`/api/tags${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
      }
    }),
  );

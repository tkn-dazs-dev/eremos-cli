import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, type ColumnDef } from '../../utils/output.js';
import { buildQueryParams } from '../../utils/pagination.js';

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', width: 36 },
  { key: 'name', label: 'Name', width: 20 },
  { key: 'description', label: 'Description', width: 40 },
];

export const aiToolCommand = new Command('ai-tool').description('AI tool commands');

aiToolCommand
  .command('search')
  .description('Search AI tools')
  .option('--query <q>', 'Search query')
  .option('--limit <n>', 'Max results')
  .action(
    withErrorHandler(async (opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const qs = buildQueryParams({ q: opts.query, limit: opts.limit });
      const result = await apiCall<Record<string, unknown>[]>(`/api/ai-tools/search${qs}`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
      }
    }),
  );

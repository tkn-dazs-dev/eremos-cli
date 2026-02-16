import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, type ColumnDef } from '../../utils/output.js';

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', width: 36 },
  { key: 'name', label: 'Name', width: 20 },
  { key: 'emoji', label: 'Emoji', width: 6 },
];

export const stampCommand = new Command('stamp').description('Stamp catalog commands');

stampCommand
  .command('list')
  .description('List all available stamps')
  .action(
    withErrorHandler(async (_opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<Record<string, unknown>[]>('/api/stamps');

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, columns);
      }
    }),
  );

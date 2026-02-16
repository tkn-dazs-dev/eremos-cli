import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, type ColumnDef } from '../../utils/output.js';

const columns: ColumnDef[] = [
  { key: 'rank', label: '#', width: 4 },
  { key: 'name', label: 'Tag', width: 30 },
  { key: 'count', label: 'Uses', width: 8 },
];

export const tagTrendingCommand = new Command('trending')
  .description('List trending tags')
  .action(
    withErrorHandler(async (_opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<Record<string, unknown>[]>('/api/tags/trending');

      if (json) {
        printJson(result);
      } else {
        // Add rank numbers.
        const ranked = result.data.map((item, i) => ({ ...item, rank: i + 1 }));
        printTable(ranked, columns);
      }
    }),
  );

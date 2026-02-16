import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printKeyValue, printSuccess, type FieldDef } from '../../utils/output.js';

const resultFields: FieldDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
];

export const seriesCreateCommand = new Command('create')
  .description('Create a new series')
  .requiredOption('--title <title>', 'Series title (1-100 chars)')
  .option('-d, --description <description>', 'Series description (max 1000 chars)')
  .action(
    withErrorHandler(async (opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;

      const payload: Record<string, unknown> = { title: opts.title };
      if (opts.description) payload.description = opts.description;

      const result = await apiCall<Record<string, unknown>>('/api/series', {
        method: 'POST',
        idempotent: true,
        body: JSON.stringify(payload),
      });

      if (json) {
        printJson(result);
      } else {
        printSuccess('Series created');
        printKeyValue(result.data, resultFields);
      }
    }),
  );

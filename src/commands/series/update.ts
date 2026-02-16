import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printSuccess } from '../../utils/output.js';
import { safePathSegment } from '../../utils/sanitize.js';

export const seriesUpdateCommand = new Command('update')
  .description('Update a series')
  .argument('<id>', 'Series ID')
  .option('--title <title>', 'New title')
  .option('-d, --description <description>', 'New description')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;

      const payload: Record<string, unknown> = {};
      if (opts.title) payload.title = opts.title;
      if (opts.description) payload.description = opts.description;

      const result = await apiCall<Record<string, unknown>>(`/api/series/${safePathSegment(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (json) {
        printJson(result);
      } else {
        printSuccess(`Series ${id} updated`);
      }
    }),
  );

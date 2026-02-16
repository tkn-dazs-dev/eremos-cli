import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printTable, printSuccess, type ColumnDef } from '../../utils/output.js';
import { safePathSegment } from '../../utils/sanitize.js';

const stampColumns: ColumnDef[] = [
  { key: 'stamp_id', label: 'Stamp ID', width: 36 },
  { key: 'count', label: 'Count', width: 6 },
  { key: 'user_stamped', label: 'You', width: 4, transform: (v) => (v ? 'Yes' : 'No') },
];

export const contentStampsCommand = new Command('stamps')
  .description('List stamps on content')
  .argument('<id>', 'Content ID')
  .action(
    withErrorHandler(async (id: string, _opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<Record<string, unknown>[]>(`/api/contents/${safePathSegment(id)}/stamps`);

      if (json) {
        printJson(result);
      } else {
        printTable(result.data, stampColumns);
      }
    }),
  );

export const contentStampCommand = new Command('stamp')
  .description('Add a stamp to content')
  .argument('<id>', 'Content ID')
  .requiredOption('--stamp-id <stampId>', 'Stamp ID to add')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<unknown>(`/api/contents/${safePathSegment(id)}/stamps`, {
        method: 'POST',
        idempotent: true,
        body: JSON.stringify({ stamp_id: opts.stampId }),
      });

      if (json) {
        printJson(result);
      } else {
        printSuccess(`Stamped ${id}`);
      }
    }),
  );

export const contentUnstampCommand = new Command('unstamp')
  .description('Remove a stamp from content')
  .argument('<id>', 'Content ID')
  .requiredOption('--stamp-id <stampId>', 'Stamp ID to remove')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<unknown>(`/api/contents/${safePathSegment(id)}/stamps/${safePathSegment(opts.stampId, 'Stamp ID')}`, {
        method: 'DELETE',
      });

      if (json) {
        printJson(result);
      } else {
        printSuccess(`Unstamped ${id}`);
      }
    }),
  );

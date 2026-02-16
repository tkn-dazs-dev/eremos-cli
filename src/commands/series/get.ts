import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printKeyValue, type FieldDef } from '../../utils/output.js';
import { safePathSegment } from '../../utils/sanitize.js';

const fields: FieldDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'author_id', label: 'Author ID' },
  { key: 'content_count', label: 'Contents' },
  { key: 'created_at', label: 'Created' },
  { key: 'updated_at', label: 'Updated' },
];

export const seriesGetCommand = new Command('get')
  .description('Get series details')
  .argument('<id>', 'Series ID')
  .action(
    withErrorHandler(async (id: string, _opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<Record<string, unknown>>(`/api/series/${safePathSegment(id)}`);

      if (json) {
        printJson(result);
      } else {
        printKeyValue(result.data, fields);
      }
    }),
  );

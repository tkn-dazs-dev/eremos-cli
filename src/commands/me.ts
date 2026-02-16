import { Command } from 'commander';
import { apiCall, requireAuth } from '../api/client.js';
import { withErrorHandler } from '../utils/errors.js';
import { printJson, printKeyValue, type FieldDef } from '../utils/output.js';

const fields: FieldDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'handle', label: 'Handle', transform: (v) => `@${v}` },
  { key: 'display_name', label: 'Name' },
  { key: 'bio', label: 'Bio' },
  { key: 'avatar_url', label: 'Avatar' },
  { key: 'website_url', label: 'Website' },
  { key: 'is_admin', label: 'Admin', transform: (v) => (v ? 'Yes' : 'No') },
  { key: 'onboarded_at', label: 'Onboarded' },
  { key: 'created_at', label: 'Created' },
];

export const meCommand = new Command('me')
  .description('Show current user profile')
  .action(
    withErrorHandler(async (_opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.opts().json;
      const result = await apiCall<Record<string, unknown>>('/api/users/me');

      if (json) {
        printJson(result);
      } else {
        printKeyValue(result.data, fields);
      }
    }),
  );

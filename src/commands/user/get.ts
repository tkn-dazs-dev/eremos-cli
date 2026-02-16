import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printKeyValue, type FieldDef } from '../../utils/output.js';
import { safePathSegment } from '../../utils/sanitize.js';

const fields: FieldDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'handle', label: 'Handle', transform: (v) => `@${v}` },
  { key: 'display_name', label: 'Name' },
  { key: 'bio', label: 'Bio' },
  { key: 'avatar_url', label: 'Avatar' },
  { key: 'website_url', label: 'Website' },
  { key: 'follower_count', label: 'Followers' },
  { key: 'following_count', label: 'Following' },
  { key: 'content_count', label: 'Contents' },
  { key: 'created_at', label: 'Created' },
];

export const userGetCommand = new Command('get')
  .description('Get a user profile')
  .argument('<id>', 'User ID')
  .action(
    withErrorHandler(async (id: string, _opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<Record<string, unknown>>(`/api/users/${safePathSegment(id)}`);

      if (json) {
        printJson(result);
      } else {
        printKeyValue(result.data, fields);
      }
    }),
  );

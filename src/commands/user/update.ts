import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printKeyValue, printSuccess, type FieldDef } from '../../utils/output.js';

const resultFields: FieldDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'handle', label: 'Handle', transform: (v) => (v ? `@${v}` : '') },
  { key: 'display_name', label: 'Name' },
  { key: 'bio', label: 'Bio' },
  { key: 'website_url', label: 'Website' },
];

export const userUpdateCommand = new Command('update')
  .description('Update your profile')
  .option('-n, --name <name>', 'Display name')
  .option('--handle <handle>', 'Handle (3-20 chars, lowercase alphanumeric and underscore)')
  .option('--bio <bio>', 'Bio (max 160 chars)')
  .option('--website <url>', 'Website URL (empty string to clear)')
  .option('--avatar-url <url>', 'Avatar URL')
  .option('--locale <locale>', 'Locale preference (ja or en)')
  .option('--theme <theme>', 'Theme preference')
  .action(
    withErrorHandler(async (opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;

      const payload: Record<string, unknown> = {};

      if (opts.name !== undefined) payload.name = opts.name;
      if (opts.handle !== undefined) payload.handle = opts.handle;
      if (opts.bio !== undefined) payload.bio = opts.bio;
      if (opts.website !== undefined) payload.website = opts.website;
      if (opts.avatarUrl !== undefined) payload.avatar_url = opts.avatarUrl;
      if (opts.locale !== undefined) payload.locale_preference = opts.locale;
      if (opts.theme !== undefined) payload.theme_preference = opts.theme;

      if (Object.keys(payload).length === 0) {
        throw new Error('At least one option is required (--name, --handle, --bio, etc.)');
      }

      const result = await apiCall<Record<string, unknown>>('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (json) {
        printJson(result);
      } else {
        printSuccess('Profile updated');
        printKeyValue(result.data, resultFields);
      }
    }),
  );

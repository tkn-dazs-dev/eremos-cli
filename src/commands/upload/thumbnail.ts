import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { isAllowedImageMimeType } from '../../utils/mime.js';
import { printJson, printKeyValue, type FieldDef } from '../../utils/output.js';

const fields: FieldDef[] = [
  { key: 'upload_url', label: 'Upload URL' },
  { key: 'thumbnail_url', label: 'Thumbnail URL' },
  { key: 'expires_at', label: 'Expires' },
];

export const uploadThumbnailCommand = new Command('thumbnail')
  .description('Get a signed upload URL for a thumbnail')
  .requiredOption('--filename <name>', 'File name')
  .requiredOption('--content-type <type>', 'MIME content type (image only)')
  .requiredOption('--size-bytes <n>', 'File size in bytes (max 5MB)')
  .requiredOption('--content-id <id>', 'Content ID')
  .action(
    withErrorHandler(async (opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;

      if (!isAllowedImageMimeType(opts.contentType)) {
        throw new Error(`Unsupported content type for thumbnail: ${opts.contentType}. Must be an image type.`);
      }

      const payload: Record<string, unknown> = {
        filename: opts.filename,
        contentType: opts.contentType,
        sizeBytes: Number(opts.sizeBytes),
        contentId: opts.contentId,
      };

      const result = await apiCall<Record<string, unknown>>('/api/upload/thumbnail/sign', {
        method: 'POST',
        idempotent: true,
        body: JSON.stringify(payload),
      });

      if (json) {
        printJson(result);
      } else {
        printKeyValue(result.data, fields);
      }
    }),
  );

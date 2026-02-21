import { Command } from 'commander';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { isAllowedMediaMimeType } from '../../utils/mime.js';
import { printJson, printKeyValue, type FieldDef } from '../../utils/output.js';

const fields: FieldDef[] = [
  { key: 'upload_url', label: 'Upload URL' },
  { key: 'media_url', label: 'Media URL' },
  { key: 'object_key', label: 'Object Key' },
  { key: 'content_id', label: 'Content ID' },
  { key: 'expires_at', label: 'Expires' },
];

export const uploadSignCommand = new Command('sign')
  .description('Get a signed upload URL for media')
  .requiredOption('--filename <name>', 'File name')
  .requiredOption('--content-type <type>', 'MIME content type')
  .requiredOption('--size-bytes <n>', 'File size in bytes')
  .option('--content-id <id>', 'Existing content ID')
  .action(
    withErrorHandler(async (opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;

      if (!isAllowedMediaMimeType(opts.contentType)) {
        throw new Error(`Unsupported content type: ${opts.contentType}`);
      }

      const sizeBytes = Number(opts.sizeBytes);
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
        throw new Error('--size-bytes must be a positive integer');
      }

      const payload: Record<string, unknown> = {
        filename: opts.filename,
        contentType: opts.contentType,
        sizeBytes,
      };
      if (opts.contentId) payload.contentId = opts.contentId;

      const result = await apiCall<Record<string, unknown>>('/api/upload/sign', {
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

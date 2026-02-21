import { Command } from 'commander';
import { openSync, fstatSync, readFileSync, closeSync } from 'fs';
import { basename } from 'path';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { fetchWithTimeout } from '../../utils/fetch.js';
import { mimeFromExtension } from '../../utils/mime.js';
import { printJson, printKeyValue, printSuccess, type FieldDef } from '../../utils/output.js';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MiB

const resultFields: FieldDef[] = [
  { key: 'media_url', label: 'Media URL' },
  { key: 'content_id', label: 'Content ID' },
];

export const uploadFileCommand = new Command('file')
  .description('Upload a file (sign + PUT in one step)')
  .argument('<path>', 'Path to file')
  .option('--content-id <id>', 'Existing content ID')
  .action(
    withErrorHandler(async (filePath: string, opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;

      const fileName = basename(filePath);
      const contentType = mimeFromExtension(fileName);

      if (!contentType) {
        throw new Error(`Unsupported file type: ${fileName}. Run \`eremos upload sign\` manually for custom types.`);
      }

      // Read via fd to avoid TOCTOU (stat then read race).
      const fd = openSync(filePath, 'r');
      let fileContent: Uint8Array;
      let fileSize: number;
      try {
        const stat = fstatSync(fd);
        if (stat.size > MAX_UPLOAD_BYTES) {
          throw new Error(`File too large (max ${MAX_UPLOAD_BYTES} bytes)`);
        }
        fileSize = stat.size;
        fileContent = new Uint8Array(readFileSync(fd));
      } finally {
        closeSync(fd);
      }

      // Step 1: Get presigned URL.
      const signPayload: Record<string, unknown> = {
        filename: fileName,
        contentType,
        sizeBytes: fileSize,
      };
      if (opts.contentId) signPayload.contentId = opts.contentId;

      const signResult = await apiCall<{
        upload_url: string;
        media_url: string;
        content_id: string;
        required_headers: Record<string, string>;
      }>('/api/upload/sign', {
        method: 'POST',
        idempotent: true,
        body: JSON.stringify(signPayload),
      });

      const { upload_url, media_url, content_id, required_headers } = signResult.data;
      const putHeaders: Record<string, string> = {
        'Content-Type': contentType,
        ...required_headers,
      };

      const putResponse = await fetchWithTimeout(upload_url, {
        method: 'PUT',
        headers: putHeaders,
        body: fileContent,
        redirect: 'error',
        timeoutMs: 120_000, // 2 minutes for large files.
      });

      if (!putResponse.ok) {
        throw new Error(`Upload failed: HTTP ${putResponse.status} ${putResponse.statusText}`);
      }

      const output = { media_url, content_id };

      if (json) {
        printJson({ data: output });
      } else {
        printSuccess('File uploaded');
        printKeyValue(output, resultFields);
      }
    }),
  );

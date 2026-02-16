import { Command } from 'commander';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { apiRequest, requireAuth } from '../../api/client.js';
import { withErrorHandler, parseApiResponse } from '../../utils/errors.js';
import { mimeFromExtension } from '../../utils/mime.js';
import { printJson, printKeyValue, printSuccess, type FieldDef } from '../../utils/output.js';
import { sanitizeFileName } from '../../utils/sanitize.js';

const fields: FieldDef[] = [
  { key: 'file_url', label: 'File URL' },
  { key: 'file_name', label: 'File Name' },
  { key: 'file_size', label: 'Size' },
  { key: 'mime_type', label: 'MIME' },
];

export const uploadSkillCommand = new Command('skill')
  .description('Upload a skill file (md, txt, json, yaml, csv, toml)')
  .requiredOption('--file <path>', 'Path to skill file')
  .action(
    withErrorHandler(async (opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;
      const filePath = opts.file as string;

      const maxSize = 10 * 1024 * 1024; // 10MB
      const fileContent = readFileSync(filePath);
      if (fileContent.length > maxSize) {
        throw new Error(`File too large (max ${maxSize} bytes)`);
      }

      const fileName = sanitizeFileName(basename(filePath));
      const mime = mimeFromExtension(fileName);
      if (!mime) {
        throw new Error(`Unsupported file type: ${fileName}. Allowed: md, txt, json, yaml, csv, toml`);
      }

      // Build multipart/form-data manually (no external deps).
      const boundary = `----EremosUpload${Date.now()}`;
      const parts: Buffer[] = [];

      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`));
      parts.push(fileContent);
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

      const body = Buffer.concat(parts);

      const response = await apiRequest('/api/upload/skill', {
        method: 'POST',
        idempotent: true,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });

      const result = await parseApiResponse<Record<string, unknown>>(response);

      if (json) {
        printJson(result);
      } else {
        printSuccess('Skill file uploaded');
        printKeyValue(result.data, fields);
      }
    }),
  );

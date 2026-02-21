import { Command } from 'commander';
import { readFileSync } from 'fs';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printKeyValue, printSuccess, type FieldDef } from '../../utils/output.js';
import { safePathSegment } from '../../utils/sanitize.js';

const MAX_BODY_BYTES = 2 * 1024 * 1024;

const resultFields: FieldDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'content_type', label: 'Type' },
  { key: 'is_published', label: 'Published', transform: (v) => (v ? 'Yes' : 'Draft') },
];

type ContentUpdateOptions = {
  title?: string;
  body?: string;
  file?: string;
  description?: string;
  tags?: string;
  publish?: boolean;
  unpublish?: boolean;
  mediaUrl?: string;
  thumbnailUrl?: string;
  seriesId?: string;
  series?: boolean;
  noSeries?: boolean;
};

export function buildContentUpdatePayload(opts: ContentUpdateOptions): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (opts.title) payload.title = opts.title;
  if (opts.description) payload.description = opts.description;
  if (opts.mediaUrl) payload.media_url = opts.mediaUrl;
  if (opts.thumbnailUrl) payload.thumbnail_url = opts.thumbnailUrl;

  if (opts.publish) payload.is_published = true;
  if (opts.unpublish) payload.is_published = false;

  const removeSeries = opts.noSeries === true || opts.series === false;

  if (opts.seriesId) {
    payload.series_id = opts.seriesId;
  } else if (removeSeries) {
    payload.series_id = null;
  }

  if (opts.tags) {
    payload.tags = opts.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }

  return payload;
}

export const contentUpdateCommand = new Command('update')
  .description('Update existing content')
  .argument('<id>', 'Content ID')
  .option('-t, --title <title>', 'New title')
  .option('-b, --body <body>', 'New body text')
  .option('-f, --file <file>', 'Read body from file')
  .option('-d, --description <description>', 'New description')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--publish', 'Publish the content')
  .option('--unpublish', 'Unpublish the content')
  .option('--media-url <url>', 'Media URL')
  .option('--thumbnail-url <url>', 'Thumbnail URL')
  .option('--series-id <id>', 'Series ID')
  .option('--no-series', 'Remove from series')
  .action(
    withErrorHandler(async (id: string, opts, cmd) => {
      await requireAuth();
      const json = cmd.parent?.parent?.opts().json;
      const payload = buildContentUpdatePayload(opts as ContentUpdateOptions);

      let bodyText = opts.body;
      if (opts.file) {
        const content = readFileSync(opts.file);
        if (content.length > MAX_BODY_BYTES) {
          throw new Error(`File is too large (max ${MAX_BODY_BYTES} bytes)`);
        }
        bodyText = content.toString('utf-8');
      }
      if (bodyText !== undefined) payload.text_content = bodyText;

      const result = await apiCall<Record<string, unknown>>(`/api/contents/${safePathSegment(id)}`, {
        method: 'PUT',
        idempotent: true,
        body: JSON.stringify(payload),
      });

      if (json) {
        printJson(result);
      } else {
        printSuccess('Content updated');
        printKeyValue(result.data, resultFields);
      }
    }),
  );

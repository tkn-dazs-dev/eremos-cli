import { Command, InvalidArgumentError, Option } from 'commander';
import { readFileSync } from 'fs';
import { apiCall, requireAuth } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printKeyValue, printSuccess, type FieldDef } from '../../utils/output.js';

const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MiB
const MAX_METADATA_BYTES = 1 * 1024 * 1024; // 1 MiB
export const CONTENT_TYPES = ['text', 'image', 'video', 'music', 'novel', 'article', 'thread'] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

const resultFields: FieldDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'content_type', label: 'Type' },
  { key: 'is_published', label: 'Published', transform: (v) => (v ? 'Yes' : 'Draft') },
];

export interface CreateContentOptions {
  title: string;
  type?: ContentType | string;
  body?: string;
  file?: string;
  description?: string;
  tags?: string;
  draft?: boolean;
  mediaUrl?: string;
  thumbnailUrl?: string;
  aiModel?: string;
  aiTools?: string;
  aiLevel?: string;
  seriesId?: string;
  aiMetadataFile?: string;
  json?: boolean;
}

export function parseContentType(value: string): ContentType {
  const normalized = value.trim().toLowerCase();
  if ((CONTENT_TYPES as readonly string[]).includes(normalized)) {
    return normalized as ContentType;
  }
  throw new InvalidArgumentError(
    `Invalid content type: ${value}. Allowed: ${CONTENT_TYPES.join(', ')}`,
  );
}

/**
 * Shared action logic for content create (used by both `content create` and deprecated `post`).
 */
export async function createContentAction(opts: CreateContentOptions): Promise<void> {
  await requireAuth();
  const json = opts.json ?? false;
  const contentType = parseContentType(opts.type ?? 'text');

  let bodyText = opts.body ?? '';

  if (opts.file) {
    const content = readFileSync(opts.file);
    if (content.length > MAX_BODY_BYTES) {
      throw new Error(`File is too large (max ${MAX_BODY_BYTES} bytes)`);
    }
    bodyText = content.toString('utf-8');
  }

  const payload: Record<string, unknown> = {
    title: opts.title,
    content_type: contentType,
    is_published: !opts.draft,
  };

  if (opts.description) payload.description = opts.description;
  if (bodyText) payload.text_content = bodyText;
  if (opts.mediaUrl) payload.media_url = opts.mediaUrl;
  if (opts.thumbnailUrl) payload.thumbnail_url = opts.thumbnailUrl;
  if (opts.aiModel) payload.ai_model = opts.aiModel;
  if (opts.aiLevel) payload.ai_contribution_level = opts.aiLevel;
  if (opts.seriesId) payload.series_id = opts.seriesId;

  if (opts.tags) {
    payload.tags = opts.tags.split(',').map((t) => t.trim()).filter(Boolean);
  }

  if (opts.aiTools) {
    payload.ai_tools = opts.aiTools.split(',').map((t) => t.trim()).filter(Boolean);
  }

  if (opts.aiMetadataFile) {
    const raw = readFileSync(opts.aiMetadataFile);
    if (raw.length > MAX_METADATA_BYTES) {
      throw new Error(`AI metadata file too large (max 1 MiB)`);
    }
    try {
      payload.ai_metadata = JSON.parse(raw.toString('utf-8'));
    } catch {
      throw new Error('AI metadata file contains invalid JSON');
    }
  }

  const result = await apiCall<Record<string, unknown>>('/api/contents', {
    method: 'POST',
    idempotent: true,
    body: JSON.stringify(payload),
  });

  if (json) {
    printJson(result);
  } else {
    printSuccess('Content created');
    printKeyValue(result.data, resultFields);
  }
}

export const contentCreateCommand = new Command('create')
  .description('Create new content')
  .requiredOption('-t, --title <title>', 'Content title')
  .addOption(
    new Option('--type <type>', `Content type (${CONTENT_TYPES.join(', ')})`)
      .choices([...CONTENT_TYPES])
      .default('text'),
  )
  .option('-b, --body <body>', 'Text content body')
  .option('-f, --file <file>', 'Read body from file')
  .option('-d, --description <description>', 'Content description')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--draft', 'Create as draft (unpublished)')
  .option('--media-url <url>', 'Media URL (from upload)')
  .option('--thumbnail-url <url>', 'Thumbnail URL (from upload)')
  .option('--ai-model <model>', 'AI model used')
  .option('--ai-tools <tools>', 'Comma-separated AI tools')
  .option('--ai-level <level>', 'AI contribution level (all_ai, mostly_ai, half, mostly_human, all_human)')
  .option('--series-id <id>', 'Series ID to add content to')
  .option('--ai-metadata-file <path>', 'JSON file with ai_metadata')
  .action(
    withErrorHandler(async (opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json ?? false;
      await createContentAction({ ...opts, json });
    }),
  );

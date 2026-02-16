import { Command } from 'commander';
import { apiCall } from '../../api/client.js';
import { withErrorHandler } from '../../utils/errors.js';
import { printJson, printKeyValue, type FieldDef } from '../../utils/output.js';
import { safePathSegment } from '../../utils/sanitize.js';

const fields: FieldDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'content_type', label: 'Type' },
  { key: 'description', label: 'Description' },
  { key: 'text_content', label: 'Body' },
  { key: 'media_url', label: 'Media URL' },
  { key: 'thumbnail_url', label: 'Thumbnail' },
  { key: 'is_published', label: 'Published', transform: (v) => (v ? 'Yes' : 'Draft') },
  { key: 'ai_model', label: 'AI Model' },
  { key: 'ai_contribution_level', label: 'AI Level' },
  { key: 'tags', label: 'Tags', transform: (v) => (Array.isArray(v) ? v.join(', ') : String(v ?? '')) },
  { key: 'series_id', label: 'Series ID' },
  { key: 'like_count', label: 'Likes' },
  { key: 'comment_count', label: 'Comments' },
  { key: 'view_count', label: 'Views' },
  { key: 'author', label: 'Author', transform: (v) => {
    const a = v as Record<string, unknown> | null;
    return a ? `${a.display_name ?? ''} (@${a.handle ?? ''})` : '';
  }},
  { key: 'created_at', label: 'Created' },
  { key: 'updated_at', label: 'Updated' },
];

export const contentGetCommand = new Command('get')
  .description('Get content details')
  .argument('<id>', 'Content ID')
  .action(
    withErrorHandler(async (id: string, _opts, cmd) => {
      const json = cmd.parent?.parent?.opts().json;
      const result = await apiCall<Record<string, unknown>>(`/api/contents/${safePathSegment(id)}`);

      if (json) {
        printJson(result);
      } else {
        printKeyValue(result.data, fields);
      }
    }),
  );

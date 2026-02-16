/**
 * MIME type mapping for upload commands.
 * Matches the server-side ALLOWED_TYPES set.
 * No external dependencies.
 */

const EXTENSION_MAP: Record<string, string> = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',

  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',

  // Audio
  '.mp3': 'audio/mpeg',
  '.mpeg': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',

  // Skill files
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.csv': 'text/csv',
  '.toml': 'application/toml',
};

const SKILL_EXTENSIONS = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.csv', '.toml']);

const MEDIA_MIME_TYPES = new Set(
  Object.entries(EXTENSION_MAP)
    .filter(([ext]) => !SKILL_EXTENSIONS.has(ext))
    .map(([, mime]) => mime),
);

const IMAGE_MIME_TYPES = new Set(
  Object.entries(EXTENSION_MAP)
    .filter(([, mime]) => mime.startsWith('image/'))
    .map(([, mime]) => mime),
);

/**
 * Guess MIME type from file extension.
 * Returns undefined if extension is not recognized.
 */
export function mimeFromExtension(filename: string): string | undefined {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return undefined;
  const ext = filename.slice(dot).toLowerCase();
  return EXTENSION_MAP[ext];
}

/** Check if a MIME type is an allowed media type (image/video/audio). */
export function isAllowedMediaMimeType(mimeType: string): boolean {
  return MEDIA_MIME_TYPES.has(mimeType);
}

/** Check if a MIME type is an allowed image type. */
export function isAllowedImageMimeType(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.has(mimeType);
}

/**
 * Sanitize a filename for use in Content-Disposition headers.
 * Removes all control characters (NUL, CR, LF, etc.), quotes, and backslashes.
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[\x00-\x1f\x7f"\\]/g, '_');
}

/**
 * Validate and encode a value for use as a URL path segment.
 * Prevents path traversal and URL manipulation via user-controlled IDs.
 */
export function safePathSegment(value: string, name = 'ID'): string {
  if (!value || /[\/\\]|\.\./.test(value)) {
    throw new Error(`Invalid ${name}: must not contain path separators or ".."`);
  }
  return encodeURIComponent(value);
}

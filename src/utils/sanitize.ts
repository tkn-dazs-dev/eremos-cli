/**
 * Sanitize a filename for use in Content-Disposition headers.
 * Removes all control characters (NUL, CR, LF, etc.), quotes, and backslashes.
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[\x00-\x1f\x7f"\\]/g, '_');
}

/**
 * Strip ANSI escape sequences and C0/DEL control characters for safe terminal display.
 * Prevents terminal manipulation via user-generated content.
 */
export function stripTerminalEscapes(text: string): string {
  return text
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x9b[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?/g, '')
    .replace(/\x9d[^\x07\x1b\x9c]*(?:\x07|\x1b\\|\x9c)?/g, '')
    .replace(/\x1b[@-_]/g, '')
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '');
}

/** Recursively sanitize all string values in a data structure for terminal display. */
export function sanitizeValue(value: unknown): unknown {
  return sanitizeValueInner(value, new WeakSet<object>());
}

function sanitizeValueInner(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return stripTerminalEscapes(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => sanitizeValueInner(v, seen));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitizeValueInner(v, seen)]),
  );
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

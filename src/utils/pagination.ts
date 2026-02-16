/**
 * Pagination and query parameter utilities.
 */

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * Build a query string from flags, filtering out undefined/null values.
 * Clamps `limit` to [1, 50].
 */
export function buildQueryParams(flags: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(flags)) {
    if (value === undefined || value === null || value === '') continue;

    if (key === 'limit') {
      const n = Math.min(Math.max(Number(value) || DEFAULT_LIMIT, 1), MAX_LIMIT);
      params.set('limit', String(n));
    } else if (Array.isArray(value)) {
      // Arrays are comma-joined (e.g. tags).
      params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

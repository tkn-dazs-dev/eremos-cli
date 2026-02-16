/**
 * Error handling utilities for CLI commands.
 *
 * Exit codes:
 *   0 = success
 *   1 = API / network error
 *   2 = argument error (usage)
 *   4 = authentication error
 */

import { printError, printJson } from './output.js';

export class ApiError extends Error {
  constructor(
    public status: number,
    public error: { code: string; message: string; details?: unknown },
  ) {
    super(error.message);
    this.name = 'ApiError';
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

function exitCodeForError(err: unknown): number {
  if (err instanceof AuthError) return 4;
  if (err instanceof ApiError) {
    if (err.status === 401) return 4;
    return 1;
  }
  return 1;
}

/**
 * Wrap a command action with standardized error handling.
 * Catches errors and exits with the appropriate code + format.
 */
export function withErrorHandler(
  action: (...args: any[]) => Promise<void>,
): (...args: any[]) => Promise<void> {
  return async (...args: any[]) => {
    try {
      await action(...args);
    } catch (err) {
      const code = exitCodeForError(err);
      const isJson = isJsonMode();

      if (err instanceof ApiError) {
        if (isJson) {
          printJson({ error: err.error });
        } else {
          printError(err.error.message);
          if (err.error.details) {
            const details = err.error.details;
            if (Array.isArray(details)) {
              for (const d of details) {
                if (d && typeof d === 'object' && 'field' in d && 'message' in d) {
                  printError(`  ${d.field}: ${d.message}`);
                }
              }
            }
          }
        }
      } else if (err instanceof AuthError) {
        if (isJson) {
          printJson({ error: { code: 'AUTH_REQUIRED', message: err.message } });
        } else {
          printError(err.message);
        }
      } else {
        const message = err instanceof Error ? err.message : String(err);
        if (isJson) {
          printJson({ error: { code: 'UNKNOWN', message } });
        } else {
          printError(message);
        }
      }

      process.exit(code);
    }
  };
}

/** Check if --json flag is active (set on program.opts()). */
function isJsonMode(): boolean {
  // Commander stores parent options on program. We check process.argv directly
  // as a simple approach that works regardless of parse order.
  return process.argv.includes('--json');
}

/**
 * Parse an API response, throwing ApiError on non-OK status.
 */
export async function parseApiResponse<T>(response: Response): Promise<{
  data: T;
  meta?: { next_cursor?: string | null; has_more?: boolean };
  current_user_id?: string;
}> {
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(response.status, {
      code: 'PARSE_ERROR',
      message: `Failed to parse response: ${text.slice(0, 200)}`,
    });
  }

  if (!response.ok) {
    const error = body?.error ?? { code: `HTTP_${response.status}`, message: text.slice(0, 200) };
    throw new ApiError(response.status, {
      code: error.code ?? `HTTP_${response.status}`,
      message: error.message ?? `HTTP ${response.status}`,
      details: error.details,
    });
  }

  return body;
}

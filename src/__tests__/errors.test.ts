import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, AuthError, parseApiResponse, withErrorHandler } from '../utils/errors.js';

describe('errors', () => {
  describe('ApiError', () => {
    it('creates an error with status and details', () => {
      const err = new ApiError(404, { code: 'NOT_FOUND', message: 'Content not found' });
      expect(err.status).toBe(404);
      expect(err.error.code).toBe('NOT_FOUND');
      expect(err.error.message).toBe('Content not found');
      expect(err.name).toBe('ApiError');
    });

    it('supports optional details field', () => {
      const details = [{ field: 'title', message: 'required' }];
      const err = new ApiError(400, { code: 'VALIDATION_ERROR', message: 'Invalid', details });
      expect(err.error.details).toEqual(details);
    });
  });

  describe('AuthError', () => {
    it('creates an auth error', () => {
      const err = new AuthError('Not logged in');
      expect(err.message).toBe('Not logged in');
      expect(err.name).toBe('AuthError');
    });
  });

  describe('parseApiResponse', () => {
    it('parses successful JSON response', async () => {
      const response = new Response(JSON.stringify({ data: { id: '123' } }), { status: 200 });
      const result = await parseApiResponse<{ id: string }>(response);
      expect(result.data.id).toBe('123');
    });

    it('throws ApiError on non-OK response', async () => {
      const body = { error: { code: 'NOT_FOUND', message: 'Not found' } };
      const response = new Response(JSON.stringify(body), { status: 404 });
      await expect(parseApiResponse(response)).rejects.toThrow(ApiError);
    });

    it('throws ApiError with parsed error details', async () => {
      const body = { error: { code: 'BAD_REQUEST', message: 'Invalid', details: [{ field: 'x', message: 'bad' }] } };
      const response = new Response(JSON.stringify(body), { status: 400 });
      try {
        await parseApiResponse(response);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(400);
        expect(apiErr.error.details).toEqual([{ field: 'x', message: 'bad' }]);
      }
    });

    it('throws on invalid JSON', async () => {
      const response = new Response('not json', { status: 200 });
      await expect(parseApiResponse(response)).rejects.toThrow('Failed to parse response');
    });

    it('handles error response without error field', async () => {
      const response = new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
      try {
        await parseApiResponse(response);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(500);
      }
    });
  });

  describe('withErrorHandler', () => {
    let exitSpy: ReturnType<typeof vi.spyOn>;
    let stderrSpy: ReturnType<typeof vi.spyOn>;
    let stdoutSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
      stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    });

    afterEach(() => {
      exitSpy.mockRestore();
      stderrSpy.mockRestore();
      stdoutSpy.mockRestore();
    });

    it('exits with code 4 for AuthError', async () => {
      const action = withErrorHandler(async () => {
        throw new AuthError('Not logged in');
      });
      await action();
      expect(exitSpy).toHaveBeenCalledWith(4);
    });

    it('exits with code 4 for 401 ApiError', async () => {
      const action = withErrorHandler(async () => {
        throw new ApiError(401, { code: 'UNAUTHORIZED', message: 'Unauthorized' });
      });
      await action();
      expect(exitSpy).toHaveBeenCalledWith(4);
    });

    it('exits with code 1 for other ApiErrors', async () => {
      const action = withErrorHandler(async () => {
        throw new ApiError(404, { code: 'NOT_FOUND', message: 'Not found' });
      });
      await action();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits with code 1 for generic errors', async () => {
      const action = withErrorHandler(async () => {
        throw new Error('Network error');
      });
      await action();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('does not exit on success', async () => {
      const action = withErrorHandler(async () => {
        // success
      });
      await action();
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });
});

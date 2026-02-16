export type FetchWithTimeoutOptions = RequestInit & { timeoutMs?: number };

export async function fetchWithTimeout(url: string, opts: FetchWithTimeoutOptions = {}): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } catch (err) {
    const e = err as Error;
    if (e?.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

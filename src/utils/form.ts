export function toFormUrlEncoded(data: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) {
    params.set(k, v);
  }
  return params.toString();
}

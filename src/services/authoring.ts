export class ProductError extends Error { constructor(readonly code: string) { super(code); } }
export async function productRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), ...(signal ? { signal } : {}) });
  const result = await response.json();
  if (!response.ok) throw new ProductError(typeof result.code === 'string' ? result.code : 'request_failed');
  return result as T;
}

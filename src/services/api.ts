import type { BootstrapSnapshot } from '../../shared/types.js';
import { API_PATHS } from '../../shared/types.js';

export async function fetchBootstrap(signal?: AbortSignal): Promise<BootstrapSnapshot> {
  const response = await fetch(API_PATHS.bootstrap, signal ? { signal } : {});
  if (!response.ok) throw new Error('bootstrap_unavailable');
  return response.json() as Promise<BootstrapSnapshot>;
}
export async function resetDemo(): Promise<void> {
  const response = await fetch(API_PATHS.reset, { method: 'POST' });
  if (!response.ok) throw new Error('reset_failed');
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('ok' in body) || body.ok !== true) throw new Error('invalid_reset_acknowledgement');
}

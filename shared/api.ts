import type { BootstrapSnapshot } from './bootstrap.js';
import type { ExecutionMode } from './execution.js';
export interface ResetAcknowledgement { ok: true }
export interface HealthSnapshot { status: 'ok'; service: string; mode?: ExecutionMode; executionError?: string }
export interface ReadinessSnapshot {
  status: 'ok' | 'degraded';
  db: boolean;
  missions: number;
  executionMode?: ExecutionMode;
  executionError?: string;
  runDispatchMode: 'inline' | 'queue';
  workerReady: boolean;
  llmConfigured: boolean;
  langfuseEnabled: boolean;
}
export interface FoundationApi {
  bootstrap: { method: 'GET'; path: '/api/bootstrap'; response: BootstrapSnapshot };
  reset: { method: 'POST'; path: '/api/demo/reset'; response: ResetAcknowledgement };
  health: { method: 'GET'; path: '/healthz'; response: HealthSnapshot };
  readiness: { method: 'GET'; path: '/readyz'; response: ReadinessSnapshot };
}
export const API_PATHS = {
  bootstrap: '/api/bootstrap', reset: '/api/demo/reset', health: '/healthz', readiness: '/readyz',
} as const satisfies { [Key in keyof FoundationApi]: FoundationApi[Key]['path'] };

import { Router } from 'express';
import type { RouteModule } from './types.js';
import { API_PATHS } from '../../shared/types.js';
import type { HealthSnapshot, ReadinessSnapshot } from '../../shared/types.js';

export const operationsRoutes: RouteModule = context => {
  const router = Router();
  router.get<Record<string, never>, HealthSnapshot>(API_PATHS.health, (_request, response) => response.json({
    status: 'ok', service: 'nxtcommit',
    ...(context.execution.resolved ? { mode: context.execution.resolved } : { executionError: context.execution.error }),
  }));
  router.get<Record<string, never>, ReadinessSnapshot>(API_PATHS.readiness, (_request, response) => {
    let db = false;
    let missions = 0;
    let workerReady = false;
    const runDispatchMode = context.operations?.runDispatchMode ?? 'inline';
    try { missions = context.operations?.missionCount?.() ?? context.authoring?.repository.count() ?? 0; db = context.store.db.prepare('SELECT 1 AS ok').get()?.ok === 1; } catch { /* Safe readiness failure. */ }
    try { workerReady = runDispatchMode === 'inline' || context.operations?.workerReady() === true; } catch { /* Worker probe failure degrades readiness. */ }
    response.status(db && workerReady ? 200 : 503).json({
      status: db && workerReady ? 'ok' : 'degraded', db, missions,
      runDispatchMode, workerReady,
      llmConfigured: Boolean(context.authoring?.assistance.configuration), langfuseEnabled: context.authoring?.assistance.tracingConfigured ?? false,
      ...(context.execution.resolved ? { executionMode: context.execution.resolved } : { executionError: context.execution.error }),
    });
  });
  router.get('/metrics', (_request, response) => {
    const counts = context.authoring?.assistance.counts;
    const bounded = (value: string | undefined) => value && /^[A-Za-z0-9_.-]{1,80}$/.test(value) ? value : 'unknown';
    response.type('text/plain; version=0.0.4').send([
      '# HELP commoncommit_build_info Serving process build identity; not rollout proof.',
      '# TYPE commoncommit_build_info gauge',
      `commoncommit_build_info{version="${bounded(process.env.APP_VERSION)}",commit="${bounded(process.env.APP_COMMIT)}"} 1`,
      '# TYPE commoncommit_process_uptime_seconds gauge', `commoncommit_process_uptime_seconds ${Math.floor(process.uptime())}`,
      '# TYPE commoncommit_llm_calls_total counter', `commoncommit_llm_calls_total ${counts?.calls ?? 0}`,
      '# TYPE commoncommit_llm_fallbacks_total counter', `commoncommit_llm_fallbacks_total ${counts?.fallback ?? 0}`,
      '# TYPE commoncommit_langfuse_exports_total counter', `commoncommit_langfuse_exports_total{outcome="success"} ${counts?.exportSuccess ?? 0}`, `commoncommit_langfuse_exports_total{outcome="failure"} ${counts?.exportFailure ?? 0}`, '',
    ].join('\n'));
  });
  return router;
};

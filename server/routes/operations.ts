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
    try { db = context.store.db.prepare('SELECT 1 AS ok').get()?.ok === 1; } catch { /* Safe readiness failure. */ }
    response.status(db ? 200 : 503).json({
      status: db ? 'ok' : 'degraded', db, missions: 0,
      runDispatchMode: 'inline', workerReady: true,
      llmConfigured: false, langfuseEnabled: false,
      ...(context.execution.resolved ? { executionMode: context.execution.resolved } : { executionError: context.execution.error }),
    });
  });
  return router;
};

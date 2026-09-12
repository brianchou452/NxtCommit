import { Router } from 'express';
import type { RouteModule } from './types.js';
import { API_PATHS } from '../../shared/types.js';
import type { BootstrapSnapshot, ResetAcknowledgement } from '../../shared/types.js';

export const homeRoutes: RouteModule = context => {
  const router = Router();
  router.get<Record<string, never>, BootstrapSnapshot>(API_PATHS.bootstrap, (_request, response) => response.json(context.bootstrap()));
  router.post<Record<string, never>, ResetAcknowledgement>(API_PATHS.reset, async (_request, response) => {
    await context.reset();
    response.json({ ok: true });
  });
  router.get('/api/impact', (_request, response) => response.json(context.home.impact()));
  router.get('/api/marketplace', (_request, response) => response.json(context.home.marketplace()));
  router.get('/api/stream', (_request, response) => context.events.connect(response));
  return router;
};

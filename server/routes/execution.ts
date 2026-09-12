import { Router } from 'express';
import type { RouteModule } from './types.js';
import { installMissionServices } from '../services/mission-services.js';
import { missionHandler } from './missions.js';
import { MissionError } from '../domain/mission.js';
import type { RunSummary } from '../../shared/execution.js';
export const executionRoutes: RouteModule = context => {
  const router = Router(); const service = installMissionServices(context);
  router.get('/runs/:id', missionHandler((req, res) => {
    const evidence = service.getRunEvidence(String(req.params.id)); if (!evidence) throw new MissionError('not_found', 'Run not found.', 404); res.json(evidence);
  }));
  router.get('/run-requests/:id', missionHandler((req, res) => res.json({ request: service.publicRequest(service.request(String(req.params.id))) })));
  router.get('/live', (_req, res) => {
    const activities = service.store.list<RunSummary>('run').filter(run => run.status === 'running').flatMap(run => {
      const event = service.store.events(run.id).at(-1); return event ? [event] : [];
    }); res.json({ activities });
  });
  return Router().use('/api', router);
};

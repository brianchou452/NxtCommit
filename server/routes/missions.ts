import { Router } from 'express';
import type { RouteModule } from './types.js';
import { installMissionServices } from '../services/mission-services.js';
import { MissionError } from '../domain/mission.js';
import type { Request, Response, NextFunction } from 'express';
import { campaignDetail } from '../services/slice-integration.js';

export const missionHandler = (handler: (request: Request, response: Response) => unknown) => (request: Request, response: Response, next: NextFunction) => {
  try { handler(request, response); } catch (error) {
    if (error instanceof MissionError) response.status(error.status).json({ error: error.message, code: error.code }); else next(error);
  }
};
export const missionsRoutes: RouteModule = context => {
  const router = Router(); const service = installMissionServices(context);
  router.get('/missions/:id', (req, res, next) => {
    const mission = service.store.detail(req.params.id);
    if (mission) { res.json(mission); return; }
    const campaign = context.home.mission(req.params.id);
    if (campaign) { res.json(campaignDetail(campaign)); return; }
    next();
  });
  router.post('/missions/:id/pledge', missionHandler((req, res) => res.json(service.pledge(String(req.params.id), req.body?.amount, req.header('Idempotency-Key')))));
  router.post('/missions/:id/execute', missionHandler((req, res) => { const result = service.dispatch(String(req.params.id), req.body?.feedback); res.status(result.dispatch === 'queue' ? 202 : 200).json(result); }));
  router.post('/missions/:id/cancel', (_req, res) => res.status(403).json({ error: 'Authenticated mission authorization is required.', code: 'auth_required' }));
  router.get('/missions/:id/events', missionHandler((req, res) => {
    const mission = service.getMission(String(req.params.id)); const selected = req.query.runId;
    if (selected !== undefined && typeof selected !== 'string') throw new MissionError('not_found', 'Owned run not found.', 404);
    const runId = selected ?? mission.latestRunId;
    if (!runId) { res.json({ events: [] }); return; }
    const evidence = service.getRunEvidence(runId);
    if (!evidence || evidence.run.missionId !== mission.id) throw new MissionError('not_found', 'Owned run not found.', 404);
    res.json({ runId, events: evidence.events });
  }));
  router.get('/missions/:id/run-request', missionHandler((req, res) => {
    service.getMission(String(req.params.id)); const request = service.store.latestRequest(String(req.params.id)); res.json({ request: request ? service.publicRequest(request) : null });
  }));
  router.get('/missions/:id/stream', (req, res, next) => {
    const id = String(req.params.id); if (!service.store.detail(id)) { next(); return; }
    res.set({ 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'Cache-Control': 'no-cache' }); res.flushHeaders(); res.write(': connected; revalidate REST snapshots\n\n');
    const listener = (envelope: { kind: string }) => res.write(`event: ${envelope.kind}\ndata: ${JSON.stringify(envelope)}\n\n`);
    service.events.on(id, listener);
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 10000);
    req.on('close', () => { clearInterval(heartbeat); service.events.off(id, listener); });
  });
  return Router().use('/api', router);
};

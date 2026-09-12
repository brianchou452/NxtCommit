import { Router } from 'express';
import { resolve } from 'node:path';
import { createApplication } from '../server/app.js';
import { routeModules } from '../server/routes/index.js';
import { installMissionServices } from '../server/services/mission-services.js';
import type { RouteModule } from '../server/routes/types.js';
import { seedRunningDemo } from '../server/persistence/mission-visual-fixture.js';

/** Disposable server-owned fault fixtures; UI still submits every funding/execution mutation. */
const faults: RouteModule = context => {
  const router = Router();
  let lostPledge = false;
  let disconnects = 0;
  const reset = context.reset;
  context.reset = async () => { lostPledge = false; disconnects = 0; await reset(); seedRunningDemo(installMissionServices(context)); };
  seedRunningDemo(installMissionServices(context));
  router.post('/api/missions/mission-fixture/pledge', (request, response, next) => {
    if (lostPledge) { next(); return; }
    lostPledge = true;
    try {
      installMissionServices(context).pledge('mission-fixture', request.body.amount, request.header('Idempotency-Key'));
      response.status(503).json({ error: 'Controlled lost response after accepted pledge.' });
    } catch (error) { next(error); }
  });
  router.post('/api/missions/mission-ready/execute', (_request, response, next) => {
    try {
      const result = installMissionServices(context).dispatch('mission-ready');
      setTimeout(() => response.status(result.dispatch === 'queue' ? 202 : 200).json(result), 1500);
    } catch (error) { next(error); }
  });
  router.get(['/api/projects/:id/explain', '/api/missions/:id/wall'], (_request, response) => {
    setTimeout(() => response.status(503).json({ error: 'Controlled delayed optional-region failure.' }), 800);
  });
  router.get('/api/missions/:id/stream', (_request, response, next) => {
    if (_request.params.id === 'mission-running') { next(); return; }
    if (disconnects >= 3) { next(); return; }
    disconnects++;
    response.setHeader('Content-Type', 'text/event-stream');
    response.flushHeaders();
    setTimeout(() => response.end(), 80);
  });
  return router;
};
/** Transport-only adversary: delayed frames never enter the persistence store. */
const delayedRunFrames: RouteModule = context => {
  const router = Router();
  const service = installMissionServices(context);
  let injected = 0;
  const reset = context.reset;
  context.reset = async () => { injected = 0; await reset(); };
  router.get('/api/e2e/transport-faults', (_request, response) => response.json({ injected }));
  router.get('/api/missions/:id/stream', (request, response) => {
    const id = String(request.params.id);
    let observedRun: string | undefined;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    response.setHeader('Content-Type', 'text/event-stream'); response.flushHeaders();
    const listener = (envelope: { kind: string; mission?: { latestRunId?: string }; run?: { id: string } }) => {
      response.write(`event: ${envelope.kind}\ndata: ${JSON.stringify(envelope)}\n\n`);
      const nextRun = envelope.run?.id ?? envelope.mission?.latestRunId;
      if (!nextRun || nextRun === observedRun) return;
      const oldRun = observedRun; observedRun = nextRun;
      if (!oldRun) return;
      const timer = setTimeout(() => {
        timers.delete(timer);
        for (const missionId of [id, 'foreign-mission']) {
          const event = { id: `stale-frame-${missionId}`, missionId, runId: oldRun, seq: 9999, ts: new Date().toISOString(), type: 'test-result', source: 'engine', verified: true, computeDelta: 0, payload: { title: 'STALE_TRANSPORT_MARKER', passed: 9999, files: ['stale-file.ts'] } };
          response.write(`event: exec_event\ndata: ${JSON.stringify({ kind: 'exec_event', event })}\n\n`);
        }
        injected++;
      }, 250);
      timers.add(timer);
    };
    service.events.on(id, listener);
    request.on('close', () => { service.events.off(id, listener); timers.forEach(clearTimeout); });
  });
  return router;
};
const applications = [
  createApplication({ configuredMode: 'demo', staticDirectory: resolve('dist'), modules: [faults, ...routeModules] }),
  createApplication({ configuredMode: 'demo', staticDirectory: resolve('dist'), dispatchMode: 'queue', autoWorker: false }),
  createApplication({ configuredMode: 'demo', staticDirectory: resolve('dist'), executionTimeoutMs: 1, modules: [delayedRunFrames, ...routeModules] }),
  createApplication({ configuredMode: 'demo', staticDirectory: resolve('dist'), dispatchMode: 'queue', autoWorker: true }),
];
const servers = applications.map((application, index) => application.app.listen(4191 + index, '127.0.0.1'));
async function shutdown() { servers.forEach(server => { server.close(); server.closeAllConnections(); }); await Promise.all(applications.map(application => application.close())); }
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());

import express from 'express';
import { HomeStore, seedHome, clearHome } from './persistence/home.js';
import { GlobalStream } from './services/global-stream.js';
import type { ErrorRequestHandler } from 'express';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { openDatabase, migrations, createResetHarness } from './persistence/index.js';
import type { ResetParticipant } from './persistence/index.js';
import { readCurrentPersona, seedFoundation } from './persistence/seed.js';
import { foundationCapability } from './services/context.js';
import type { ServiceContext } from './services/context.js';
import { registerRoutes, routeModules } from './routes/index.js';
import type { RouteModule } from './routes/types.js';
import { installMissionServices } from './services/mission-services.js';
import type { MissionOptions } from './services/mission-services.js';
import { missionsRoutes } from './routes/missions.js';
import { executionRoutes } from './routes/execution.js';
import { AuthoringServices } from './authoring/services.js';
import type { AuthoringOptions } from './authoring/services.js';
import { missionPort, syncMissionProjection } from './services/slice-integration.js';

export interface AppOptions {
  databasePath?: string;
  configuredMode?: string;
  staticDirectory?: string;
  modules?: readonly RouteModule[];
  resetParticipants?: readonly ResetParticipant[];
  installMissions?: boolean;
  dispatchMode?: 'inline' | 'queue';
  autoWorker?: boolean;
  executionTimeoutMs?: number;
  missionOptions?: MissionOptions;
  authoring?: AuthoringOptions;
  /** Isolated slice harnesses may omit projections; production always integrates. */
  integrateSlices?: boolean;
  operations?: ServiceContext['operations'];
}

export function createApplication(options: AppOptions = {}) {
  const execution = foundationCapability(options.configuredMode);
  const store = openDatabase(options.databasePath ?? ':memory:');
  try {
    store.migrate(migrations);
    if (!store.db.prepare('SELECT 1 FROM local_personas WHERE current = 1').get()) store.transaction(seedFoundation);
    if (!store.db.prepare('SELECT 1 FROM home_projects LIMIT 1').get()) store.transaction(seedHome);
  } catch (error) { store.close(); throw error; }
  const home = new HomeStore(store);
  const events = new GlobalStream();
  const context: ServiceContext = {
    store, execution, home, events,
    bootstrap: () => {
      const persona = readCurrentPersona(store.db);
      const currentUser = { ...persona, totalPledged: home.profile(persona.id)!.totalPledged };
      return { currentUser, personas: { contributor: currentUser, maintainers: [] }, execution };
    },
    reset: async () => { await reset.reset().finally(() => { authoring.endReset(); missions?.resume(); }); events.publish('mission_update', home.campaigns()[0]); },
  };
  const missions = options.installMissions === false ? undefined : installMissionServices(context, {
    ...options.missionOptions,
    ...(options.dispatchMode !== undefined ? { dispatchMode: options.dispatchMode } : {}),
    ...(options.autoWorker !== undefined ? { autoWorker: options.autoWorker } : {}),
    ...(options.executionTimeoutMs !== undefined ? { executionTimeoutMs: options.executionTimeoutMs } : {}),
  });
  const integrated = options.integrateSlices !== false && missions;
  const authoring = new AuthoringServices(store, {
    ...(integrated ? { missions: missionPort(missions), reviewabilityForRun: (id: string) => missions.reviewabilityForRun(id) } : {}),
    ...options.authoring,
    ...((options.authoring?.evidence ?? context.evidence) ? { evidence: (options.authoring?.evidence ?? context.evidence)! } : {}),
  });
  context.authoring = authoring; context.evidence = authoring.evidence;
  if (options.operations) context.operations = options.operations;
  else if (missions) context.operations = { runDispatchMode: missions.dispatchMode, workerReady: () => missions.workerReady(), missionCount: () => new Set([...home.campaigns().map(m => m.id), ...authoring.repository.all().map(m => m.id)]).size };
  const reset = createResetHarness(store, [{
    id: 'foundation-persona', quiesce: async () => {},
    clear: db => { db.exec('DELETE FROM local_personas'); }, seed: seedFoundation,
  }, { id: 'home-community', quiesce: async () => {}, clear: clearHome, seed: seedHome }, ...(missions ? [missions.resetParticipant] : []), { id: 'authoring-review', quiesce: async () => { authoring.beginReset(); }, clear: () => authoring.repository.clear(), seed: () => authoring.seed() }, ...options.resetParticipants ?? []]);
  // A queue worker runs in another process. Bridge persisted changes to the web
  // process's SSE subscribers, using REST snapshots as the evidence authority.
  let revision = '';
  const workerUpdates = integrated && missions.dispatchMode === 'queue' ? setInterval(() => {
    if (reset.pending) return;
    const current = missions.store.list<{ id: string }>('mission');
    const value = JSON.stringify(current);
    if (revision && revision !== value) for (const mission of current) missions.notifyMission(mission.id);
    revision = value;
  }, 500) : undefined;
  workerUpdates?.unref();
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  app.use((_request, _response, next) => { if (integrated && !reset.pending) syncMissionProjection(context, missions); next(); });
  app.use((request, response, next) => {
    if (reset.pending && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.path !== '/api/demo/reset') { response.status(503).json({ error: 'Demo reset is in progress.', code: 'reset_in_progress' }); return; }
    next();
  });
  const selectedModules = options.modules ?? routeModules;
  registerRoutes(app, context, options.installMissions === false
    ? selectedModules.filter(module => module !== missionsRoutes && module !== executionRoutes)
    : selectedModules);
  app.use('/api', (_request, response) => response.status(404).json({ error: 'Route is not implemented.', code: 'not_found' }));
  if (options.staticDirectory) {
    const directory = resolve(options.staticDirectory);
    app.use(express.static(directory));
    app.get('/{*path}', (request, response, next) => {
      if (!request.accepts('html') || !existsSync(resolve(directory, 'index.html'))) return next();
      response.sendFile(resolve(directory, 'index.html'));
    });
  }
  app.use((_request, response) => response.status(404).json({ error: 'Not found.', code: 'not_found' }));
  const errors: ErrorRequestHandler = (error, _request, response, _next) => {
    if (response.headersSent) { response.end(); return; }
    if (error?.type === 'entity.parse.failed') {
      response.status(400).json({ error: 'Invalid JSON.', code: 'invalid_json' });
    } else if (error?.type === 'entity.too.large') {
      response.status(413).json({ error: 'Request too large.', code: 'request_too_large' });
    } else {
      response.status(500).json({ error: 'The operation could not be completed.', code: 'internal_error' });
    }
  };
  app.use(errors);
  return { app, context, close: async () => { clearInterval(workerUpdates); await missions?.quiesce(); events.close(); store.close(); } };
}

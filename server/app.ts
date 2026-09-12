import { AssuranceController } from './agents/assurance.js';
import type { AssuranceOptions } from './agents/assurance.js';
import express from 'express';
import { installDemoProtection } from './services/demo-protection.js';

import { githubRoutes, type GithubOptions } from './github/workspaces.js';
import { campaignDraft, bilingual } from './authoring/campaign.js';
import type { RepoAnalysis } from '../shared/authoring.js';
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
import { missionPort, createProjectionSynchronizer } from './services/slice-integration.js';

export interface AppOptions {
  assurance?: AssuranceOptions;
  demoProtection?: {token?: string | undefined};
  databasePath?: string;
  configuredMode?: string;
  staticDirectory?: string;
  staticRelease?: () => string;
  modules?: readonly RouteModule[];
  resetParticipants?: readonly ResetParticipant[];
  installMissions?: boolean;
  dispatchMode?: 'inline' | 'queue';
  autoWorker?: boolean;
  executionTimeoutMs?: number;
  missionOptions?: MissionOptions;
  authoring?: AuthoringOptions;
  github?: GithubOptions;
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
      return { ...(options.demoProtection ? {demoProtected: true} : {}), currentUser, personas: { contributor: currentUser, maintainers: [] }, execution };
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
  const syncProjection = integrated ? createProjectionSynchronizer(context, missions) : undefined;
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  if (options.demoProtection) installDemoProtection(app, context, options.demoProtection.token);
  app.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  app.use((_request, _response, next) => { if (integrated && !reset.pending) syncProjection?.(); next(); });
  app.use((request, response, next) => {
    if (reset.pending && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.path !== '/api/demo/reset') { response.status(503).json({ error: 'Demo reset is in progress.', code: 'reset_in_progress' }); return; }
    next();
  });
  const github = githubRoutes(store.db, {
    ...options.github,
    ...(missions ? { missions: {
      create(workspace, title, credits) {
        const issue = { id: workspace.id, title, body: title, labels: [], feasibility: { executable: false, basis: 'Separate authenticated GitHub workspace runner.' } };
        const analysis: RepoAnalysis = { source: 'github', repoUrl: `https://github.com/${workspace.repository}`, name: workspace.repository.split('/')[1]!, description: title, commitSha: workspace.commit, files: workspace.files.length, issues: [issue], measured: { metadata: true, filesystem: false, fullTree: true, testsExecuted: false }, serverToken: '' };
        const draft = campaignDraft(analysis, issue, { summary: bilingual(title, title), affectedGate: false, evidence: { generator: 'static', promptVersion: 'github-task-v1' } });
        draft.estimate = { total: credits, low: credits, high: credits, confidence: 'low', basis: 'User-selected prototype allocation; not a provider-token price or settlement.', breakdown: [{ label: 'committed_prototype_credits', credits }] };
        const id = authoring.repository.create(analysis, { ...draft, serverToken: '' }).id;
        const mission = missions.getMission(id); mission.project.workspace.path = workspace.id;
        missions.store.put('mission', id, mission.projectId, mission);
        return id;
      },
      pledge: (id, amount, key) => missions.pledge(id, amount, key),
    } } : {}),
  });
  app.use('/api/github', github.router);
  app.post('/api/demo/reset', (_req, res, next) => {
    if (store.db.prepare("SELECT 1 FROM github_workspaces WHERE json_extract(data, '$.missionId') IS NOT NULL LIMIT 1").get()) { res.status(409).json({ code: 'github_funding_records_present', error: 'Demo reset cannot erase GitHub funding provenance.' }); return; }
    next();
  });
  const selectedModules = options.modules ?? routeModules;
  registerRoutes(app, context, options.installMissions === false
    ? selectedModules.filter(module => module !== missionsRoutes && module !== executionRoutes)
    : selectedModules);
  const assurance = options.assurance ? new AssuranceController(options.assurance) : undefined;
  assurance?.install(app);
  app.use('/api', (_request, response) => response.status(404).json({ error: 'Route is not implemented.', code: 'not_found' }));
  if (options.staticDirectory) {
    const directory = resolve(options.staticDirectory);
    if (options.staticRelease) app.use((_request, response, next) => { response.setHeader('X-NxtCommit-Static-Release', options.staticRelease!()); next(); });
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
  return { app, context, close: async () => { clearInterval(workerUpdates); await assurance?.close(); await github.close(); await missions?.quiesce(); events.close(); store.close(); } };
}

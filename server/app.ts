import express from 'express';
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
}

export function createApplication(options: AppOptions = {}) {
  const execution = foundationCapability(options.configuredMode);
  const store = openDatabase(options.databasePath ?? ':memory:');
  try {
    store.migrate(migrations);
    if (!store.db.prepare('SELECT 1 FROM local_personas WHERE current = 1').get()) store.transaction(seedFoundation);
  } catch (error) { store.close(); throw error; }
  const context: ServiceContext = {
    store, execution,
    bootstrap: () => {
      const currentUser = readCurrentPersona(store.db);
      return { currentUser, personas: { contributor: currentUser, maintainers: [] }, execution };
    },
    reset: () => reset.reset(),
  };
  const missions = options.installMissions === false ? undefined : installMissionServices(context, {
    ...options.missionOptions,
    ...(options.dispatchMode !== undefined ? { dispatchMode: options.dispatchMode } : {}),
    ...(options.autoWorker !== undefined ? { autoWorker: options.autoWorker } : {}),
    ...(options.executionTimeoutMs !== undefined ? { executionTimeoutMs: options.executionTimeoutMs } : {}),
  });
  const reset = createResetHarness(store, [{
    id: 'foundation-persona', quiesce: async () => {},
    clear: db => { db.exec('DELETE FROM local_personas'); }, seed: seedFoundation,
  }, ...(missions ? [missions.resetParticipant] : []), ...options.resetParticipants ?? []]);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
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
  return { app, context, close: async () => { await missions?.quiesce(); store.close(); } };
}

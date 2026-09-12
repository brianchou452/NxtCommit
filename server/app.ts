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

export interface AppOptions {
  databasePath?: string;
  configuredMode?: string;
  staticDirectory?: string;
  modules?: readonly RouteModule[];
  resetParticipants?: readonly ResetParticipant[];
}

export function createApplication(options: AppOptions = {}) {
  const execution = foundationCapability(options.configuredMode);
  const store = openDatabase(options.databasePath ?? ':memory:');
  try {
    store.migrate(migrations);
    if (!store.db.prepare('SELECT 1 FROM local_personas WHERE current = 1').get()) store.transaction(seedFoundation);
  } catch (error) { store.close(); throw error; }
  const reset = createResetHarness(store, [{
    id: 'foundation-persona', quiesce: async () => {},
    clear: db => { db.exec('DELETE FROM local_personas'); }, seed: seedFoundation,
  }, ...options.resetParticipants ?? []]);
  const context: ServiceContext = {
    store, execution,
    bootstrap: () => {
      const currentUser = readCurrentPersona(store.db);
      return { currentUser, personas: { contributor: currentUser, maintainers: [] }, execution };
    },
    reset: () => reset.reset(),
  };
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  registerRoutes(app, context, options.modules ?? routeModules);
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
  return { app, context, close: () => store.close() };
}

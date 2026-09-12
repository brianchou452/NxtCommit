import { resolve } from 'node:path';
import { Router } from 'express';
import { createApplication } from '../server/app.js';
import { routeModules } from '../server/routes/index.js';
import type { RouteModule } from '../server/routes/types.js';

// Deterministic fault/metadata fixtures exist only in this test process. UI journeys
// still perform real analysis/capability/draft/SQLite operations over HTTP.
let analyzeCalls = 0; let missingCalls = 0; let streamCalls = 0;
const faults: RouteModule = () => {
  const router = Router();
  router.post('/api/analyze', async (_request, response, next) => {
    await new Promise(resolve => setTimeout(resolve, 250));
    if (++analyzeCalls === 1) { response.status(400).json({ error: 'Synthetic first analysis failure', code: 'retry_analysis' }); return; }
    next();
  });
  router.get('/api/missions/review-demo', (_request, response, next) => { if (++missingCalls === 1) { response.status(503).json({ error: 'Synthetic initial read failure' }); return; } next(); });
  router.get('/api/missions/review-demo/stream', (_request, response, next) => { if (++streamCalls === 1) { response.status(503).json({ error: 'Synthetic stream unavailable' }); return; } next(); });
  return router;
};
const application = createApplication({ staticDirectory: resolve('dist'), modules: [faults, ...routeModules], authoring: {
  fetcher: async input => Response.json(String(input).includes('/issues?') ? [{ number: 1, title: 'Observed public issue fixture', body: 'A bounded public issue excerpt.', labels: [] }] : { name: 'prime-agent', private: false, description: 'Server-owned public metadata test fixture' }),
  observations: { trace: async () => true, score: async () => true },
} });
const server = application.app.listen(4201, '127.0.0.1');
function shutdown() { server.close(() => application.close()); server.closeAllConnections(); }
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);

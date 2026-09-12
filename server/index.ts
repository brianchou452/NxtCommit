import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createApplication } from './app.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const port = Number(process.env.PORT ?? 4177);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
if (process.env.RUN_DISPATCH_MODE && process.env.RUN_DISPATCH_MODE !== 'inline') {
  throw new Error('Queue dispatch is not installed in the Phase 1 foundation');
}
const application = createApplication({
  databasePath: resolve(process.env.VAR_DIR ?? 'var', 'nxtcommit.sqlite'),
  configuredMode: process.env.EXECUTION_MODE ?? 'auto',
  staticDirectory: resolve('dist'),
});
const server = application.app.listen(port, process.env.HOST ?? '127.0.0.1', () => {
  console.log(`NxtCommit foundation listening on port ${(server.address() as { port: number }).port}`);
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close(() => { application.close(); });
  server.closeAllConnections();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

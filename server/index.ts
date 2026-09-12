import { resolve } from 'node:path';
import { existsSync, readlinkSync } from 'node:fs';
import { createApplication } from './app.js';
import { authoringConfiguration } from './authoring/configuration.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const port = Number(process.env.PORT ?? 4177);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
if (process.env.RUN_DISPATCH_MODE && !['inline', 'queue'].includes(process.env.RUN_DISPATCH_MODE)) {
  throw new Error('Invalid RUN_DISPATCH_MODE');
}
const application = createApplication({
  ...(process.env.AGENT_ASSURANCE_ENABLED === '1' ? {assurance: {directory: resolve(process.env.VAR_DIR ?? 'var', 'assurance'), enabled: true, token: process.env.OPENAI_CHECK_TOKEN, commit: process.env.COMMIT_SHA ?? 'local', authoring: authoringConfiguration(process.env)}} : {}),
  databasePath: resolve(process.env.VAR_DIR ?? 'var', 'nxtcommit.sqlite'),
  configuredMode: process.env.EXECUTION_MODE ?? 'auto',
  staticDirectory: process.env.SELF_UPDATE_ROOT ? resolve(process.env.SELF_UPDATE_ROOT, 'current/dist') : resolve('dist'),
  ...(process.env.SELF_UPDATE_ROOT ? { staticRelease: () => readlinkSync(resolve(process.env.SELF_UPDATE_ROOT!, 'current')).split('/').at(-1)! } : {}),
  authoring: authoringConfiguration(process.env),
  ...(process.env.DEMO_PROTECTED === '1' ? {demoProtection: {token: process.env.OPENAI_CHECK_TOKEN}} : {}),
});
const server = application.app.listen(port, process.env.HOST ?? '127.0.0.1', () => {
  console.log(`NxtCommit listening on port ${(server.address() as { port: number }).port}`);
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close(() => { void application.close(); });
  server.closeAllConnections();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

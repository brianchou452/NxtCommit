import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createApplication } from '../server/app.js';

/** Server-owned, isolated foundation error/reset fixture; never part of production startup. */
const directory = mkdtempSync(join(tmpdir(), 'nxtcommit-shell-fixture-'));
const application = createApplication({ databasePath: join(directory, 'state.sqlite'), staticDirectory: resolve('dist'), installMissions: false });
application.context.store.db.prepare("UPDATE local_personas SET snapshot = json_set(snapshot, '$.walletBalance', 7)").run();
const bootstrap = application.context.bootstrap;
let bootstrapRequests = 0;
application.context.bootstrap = () => {
  if (++bootstrapRequests === 1) throw new Error('Synthetic initial bootstrap failure');
  return bootstrap();
};
const reset = application.context.reset;
let resetRequests = 0;
application.context.reset = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (++resetRequests === 1) throw new Error('Synthetic first reset failure');
  await reset();
};
const server = application.app.listen(4178, '127.0.0.1');
function shutdown() {
  server.close(() => { void application.close().then(() => rmSync(directory, { recursive: true, force: true })); });
  server.closeAllConnections();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

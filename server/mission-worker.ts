import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createApplication } from './app.js';
import { installMissionServices } from './services/mission-services.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const application = createApplication({
  databasePath: process.env.DATABASE_PATH ?? resolve(process.env.VAR_DIR ?? 'var', 'nxtcommit.sqlite'),
  configuredMode: process.env.EXECUTION_MODE ?? 'auto',
  missionOptions: { dispatchMode: 'queue', autoWorker: false },
});
const services = installMissionServices(application.context);
const owner = `worker-${randomUUID()}`;
let stopping = false;
process.once('SIGTERM', () => { stopping = true; });
process.once('SIGINT', () => { stopping = true; });
const heartbeat = setInterval(() => services.workerHeartbeat(owner), 5000);
heartbeat.unref();
try {
  do { services.workerHeartbeat(owner); const worked = await services.workOnce(owner); if (process.env.WORKER_ONCE === '1') break; if (!worked) await delay(250); } while (!stopping);
} finally { clearInterval(heartbeat); await services.quiesce(); services.workerStopped(owner); await application.close(); }

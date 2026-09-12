import {SHUTDOWN_AT, hasExpired} from './shutdown-policy.mjs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { createApplication } from './dist-server/server/app.js';
if (hasExpired()) process.exit(0);
const application = createApplication({databasePath: resolve(process.env.VAR_DIR, 'nxtcommit.sqlite'), configuredMode: 'demo', staticDirectory: resolve('dist')});
const startedAt = new Date().toISOString();
const server = createServer((request, response) => {
  if (request.url?.split('?')[0] === '/__deployment') {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, {Allow: 'GET, HEAD'}); response.end(); return;
    }
    const body = {service: 'nxtcommit', stage: 'phase1-foundation', commit: process.env.COMMIT_SHA, runUrl: process.env.GITHUB_RUN_URL, startedAt, storage: 'ephemeral-sqlite', executionAvailable: false};
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body)); return;
  }
  application.app(request, response);
});
server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
// Bounded operational telemetry. No URLs, request bodies, user data or secrets.
let previousCpu = process.cpuUsage();
const telemetry = setInterval(() => {
  const cpu = process.cpuUsage();
  console.log(JSON.stringify({event: 'resource_sample', rssBytes: process.memoryUsage().rss, cpuSeconds: (cpu.user - previousCpu.user + cpu.system - previousCpu.system) / 1e6, intervalSeconds: 60, uptimeSeconds: Math.round(process.uptime())}));
  previousCpu = cpu;
}, 60000).unref();
function shutdown() { clearInterval(telemetry); server.close(() => { application.close(); process.exit(0); }); setTimeout(() => {server.closeAllConnections(); process.exit(1);}, 10000).unref(); }
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);

// Stop the Node process at the cutoff even if traffic or monitoring keeps it busy.
setTimeout(shutdown, Math.max(0, SHUTDOWN_AT - Date.now())).unref();

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { missionServer } from './spec-tests/mission-test-support.js';
import { startTestServer } from './test-support/http.js';
import { installMissionServices } from './services/mission-services.js';
import { seedRunningDemo } from './persistence/mission-visual-fixture.js';

for (const workerMode of ['demo', 'llm'] as const) test(`actual web and worker entrypoints share VAR_DIR and respect ${workerMode} execution mode`, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nxtcommit-entrypoint-test-'));
  const environment = { PATH: process.env.PATH!, VAR_DIR: directory, RUN_DISPATCH_MODE: 'queue', EXECUTION_MODE: 'demo', PORT: '0', HOST: '127.0.0.1' };
  const web = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], { env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  let errors = ''; web.stderr.on('data', chunk => { errors += String(chunk); });
  const watchdog = setTimeout(() => web.kill('SIGTERM'), 15000);
  try {
    const port = await new Promise<number>((resolvePort, reject) => {
      let output = ''; web.stdout.on('data', chunk => { output += String(chunk); const match = /listening on port (\d+)/.exec(output); if (match) resolvePort(Number(match[1])); });
      web.once('error', reject); web.once('exit', () => reject(new Error('Web entrypoint exited before listening: ' + errors)));
    });
    const base = `http://127.0.0.1:${port}/api`;
    const response = await fetch(base + '/missions/mission-ready/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 202); const dispatch = await response.json() as any;
    const worker = spawn(process.execPath, ['--import', 'tsx', 'server/mission-worker.ts'], { env: { ...environment, EXECUTION_MODE: workerMode, WORKER_ONCE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let workerErrors = ''; worker.stderr.on('data', chunk => { workerErrors += String(chunk); });
    const workerWatchdog = setTimeout(() => worker.kill('SIGTERM'), 12000);
    try { const [code] = await once(worker, 'exit'); assert.equal(code, 0, workerErrors); } finally { clearTimeout(workerWatchdog); }
    const request = await (await fetch(base + '/run-requests/' + dispatch.request.id)).json() as any;
    if (workerMode === 'demo') {
      assert.equal(request.request.status, 'completed');
      const evidence = await (await fetch(base + '/runs/' + request.request.resultRunId)).json() as any;
      assert.equal(evidence.run.status, 'succeeded'); assert.ok(evidence.run.endedAt); assert.equal(evidence.artifact.testEvidenceSource, 'engine');
    } else { assert.equal(request.request.status, 'failed'); assert.equal(request.request.resultRunId, undefined); }
  } finally {
    clearTimeout(watchdog);
    if (web.exitCode === null) { const exited = once(web, 'exit'); web.kill('SIGTERM'); await exited; }
  }
});

test('queue HTTP dispatch remains idle until a separate worker process produces terminal evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nxtcommit-queue-test-')); const databasePath = join(directory, 'demo.sqlite');
  const app = await startTestServer({ databasePath, configuredMode: 'demo', missionOptions: { dispatchMode: 'queue', autoWorker: false } });
  try {
    const response = await fetch(app.url + '/api/missions/mission-ready/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 202); const dispatch = await response.json() as any;
    assert.equal(dispatch.request.status, 'queued');
    const mission = await (await fetch(app.url + '/api/missions/mission-ready')).json() as any; assert.equal(mission.latestRun, undefined);
    const worker = spawn(process.execPath, ['--import', 'tsx', 'server/mission-worker.ts'], { env: { PATH: process.env.PATH!, DATABASE_PATH: databasePath, RUN_DISPATCH_MODE: 'queue', WORKER_ONCE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; worker.stderr.on('data', chunk => { output += String(chunk); });
    const [code] = await once(worker, 'exit'); assert.equal(code, 0, output);
    const request = await (await fetch(app.url + '/api/run-requests/' + dispatch.request.id)).json() as any;
    assert.equal(request.request.status, 'completed'); assert.equal(request.request.leaseOwner, undefined); assert.ok(request.request.resultRunId);
    const evidence = await (await fetch(app.url + '/api/runs/' + request.request.resultRunId)).json() as any;
    assert.equal(evidence.run.status, 'succeeded'); assert.ok(evidence.run.endedAt); assert.equal(evidence.artifact.testEvidenceSource, 'engine'); assert.equal(evidence.artifact.dossier.experiments[0].passed, 3);
  } finally { await app.stop(); }
});

test('transactional claims heartbeat expiry retry and stale completion reject old owners', async () => {
  const app = await missionServer({ dispatchMode: 'queue', autoWorker: false });
  try {
    const dispatch = app.service.dispatch('mission-ready'); assert.equal(dispatch.dispatch, 'queue');
    if (dispatch.dispatch !== 'queue') return;
    const now = Date.now(); const claim = app.service.claim('first', now, 5)!; assert.equal(claim.attempt, 1);
    assert.equal(app.service.claim('other', now), undefined);
    assert.throws(() => app.service.heartbeat(claim.id, 'other', now));
    app.service.recover(now + 6); assert.equal(app.service.request(claim.id).status, 'queued');
    assert.throws(() => app.service.heartbeat(claim.id, 'first', now + 7));
    const second = app.service.claim('second', now + 8)!; assert.equal(second.attempt, 2);
    assert.throws(() => app.service.complete(claim.id, 'first', 'forged-run'));
    app.service.heartbeat(claim.id, 'second', now + 9);
    await app.service.quiesce(true); assert.equal(app.service.request(claim.id).status, 'cancelled');
  } finally { await app.stop(); }
});

test('reset drains queued and running work and restores the complete B fixture graph', async () => {
  const app = await missionServer();
  try {
    const dispatch = app.service.dispatch('mission-ready'); assert.equal(dispatch.dispatch, 'inline');
    await Promise.all([app.context.reset(), app.context.reset()]);
    assert.equal(app.service.getMission('mission-ready').status, 'funded'); assert.equal(app.service.getMission('mission-fixture').computePledged, 0);
    assert.equal(app.service.getMission('mission-terminal').artifact?.testEvidenceSource, 'demo');
    if (dispatch.dispatch === 'inline') assert.equal(app.service.getRunEvidence(dispatch.run.id), undefined);
    const again = app.service.dispatch('mission-ready'); if (again.dispatch === 'inline') assert.equal((await app.terminal(again.run.id)).run.status, 'succeeded');
  } finally { await app.stop(); }
});

test('process restart settles an orphaned inline run without inventing successful evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nxtcommit-restart-test-')); const databasePath = join(directory, 'demo.sqlite');
  const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', "import {createApplication} from './server/app.ts'; import {installMissionServices} from './server/services/mission-services.ts'; const app=createApplication({databasePath:process.env.DATABASE_PATH,configuredMode:'demo'}); const dispatch=installMissionServices(app.context).dispatch('mission-ready'); console.log(dispatch.run.id); process.exit(0);"], { env: { PATH: process.env.PATH!, DATABASE_PATH: databasePath }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; let errors = ''; child.stdout.on('data', data => { output += String(data); }); child.stderr.on('data', data => { errors += String(data); });
  const [code] = await once(child, 'exit'); assert.equal(code, 0, errors); const runId = output.trim(); assert.match(runId, /^[a-f0-9-]{36}$/);
  const app = await startTestServer({ databasePath, configuredMode: 'demo' });
  try {
    const service = installMissionServices(app.context); const evidence = service.getRunEvidence(runId)!;
    assert.equal(evidence.run.status, 'cancelled'); assert.ok(evidence.run.endedAt); assert.equal(evidence.artifact, undefined); assert.equal(service.getMission('mission-ready').status, 'stalled');
    const ledger = service.getMission('mission-ready').ledger; service.recover(); assert.deepEqual(service.getMission('mission-ready').ledger, ledger);
  } finally { await app.stop(); }
});

for (const phase of ['before-engine', 'before-terminal'] as const) test(`stale worker ${phase} cannot write terminal state artifact events or ledger`, async () => {
  const app = await missionServer({ dispatchMode: 'queue', autoWorker: false });
  try {
    const dispatch = app.service.dispatch('mission-ready'); if (dispatch.dispatch !== 'queue') assert.fail();
    const expire = () => { const row = app.service.request(dispatch.request.id); row.leaseExpiresAt = new Date(0).toISOString(); app.service.store.put('request', row.id, row.missionId, row); };
    if (phase === 'before-terminal') app.service.events.on('mission-ready', frame => { if (frame.kind === 'exec_event' && frame.event.type === 'guard') expire(); });
    const work = app.service.workOnce('original-worker');
    if (phase === 'before-engine') expire();
    await work;
    const request = app.service.request(dispatch.request.id); assert.equal(request.status, 'leased');
    const run = app.service.getRunEvidence(request.resultRunId!)!;
    assert.equal(run.run.status, 'running'); assert.equal(run.artifact, undefined); assert.ok(!run.events.some(event => ['terminal', 'accounting'].includes(event.type)));
    const mission = app.service.getMission('mission-ready'); assert.equal(mission.status, 'executing'); assert.equal(mission.computeConsumed, 0); assert.equal(mission.ledger.filter(row => row.type === 'consume' || row.type === 'refund_unused').length, 0);
    app.service.recover(); assert.equal(app.service.getRunEvidence(run.run.id)?.run.status, 'cancelled'); assert.equal(app.service.request(request.id).status, 'failed');
    const ledger = app.service.getMission('mission-ready').ledger; app.service.recover(); assert.deepEqual(app.service.getMission('mission-ready').ledger, ledger);
  } finally { await app.stop(); }
});

for (const phase of ['catch-guard', 'budget-guard'] as const) test(`reentrant expiry during ${phase} is fenced by settlement transaction`, async () => {
  const app = await missionServer({ dispatchMode: 'queue', autoWorker: false, executionTimeoutMs: phase === 'catch-guard' ? 1 : 15000 });
  try {
    if (phase === 'budget-guard') { const mission = app.service.getMission('mission-ready'); app.service.store.put('mission', mission.id, mission.projectId, { ...mission, computePledged: 2 }); }
    const dispatch = app.service.dispatch('mission-ready'); if (dispatch.dispatch !== 'queue') assert.fail();
    let expired = false;
    app.service.events.on('mission-ready', frame => {
      if (frame.kind !== 'exec_event' || frame.event.type !== 'guard') return;
      const row = app.service.request(dispatch.request.id); row.leaseExpiresAt = new Date(0).toISOString(); app.service.store.put('request', row.id, row.missionId, row); expired = true;
    });
    await app.service.workOnce('original-worker'); assert.equal(expired, true);
    const request = app.service.request(dispatch.request.id); const evidence = app.service.getRunEvidence(request.resultRunId!)!;
    assert.equal(request.status, 'leased'); assert.equal(evidence.run.status, 'running'); assert.equal(evidence.artifact, undefined);
    const mission = app.service.getMission('mission-ready'); assert.equal(mission.status, 'executing'); assert.equal(mission.computeConsumed, 0);
    assert.equal(mission.ledger.filter(row => ['consume', 'refund_unused'].includes(row.type)).length, 0); assert.ok(!evidence.events.some(event => event.type === 'terminal' || event.type === 'accounting'));
    app.service.recover(); assert.equal(app.service.getRunEvidence(evidence.run.id)?.run.status, 'cancelled');
  } finally { await app.stop(); }
});

test('settlement observers see committed run request and accounting together', async () => {
  const app = await missionServer({ dispatchMode: 'queue', autoWorker: false });
  try {
    const dispatch = app.service.dispatch('mission-ready'); if (dispatch.dispatch !== 'queue') assert.fail();
    let observed = false;
    app.service.events.on('mission-ready', frame => {
      if (frame.kind !== 'exec_event' || frame.event.type !== 'accounting') return;
      assert.equal(app.context.store.db.isTransaction, false); const request = app.service.request(dispatch.request.id);
      assert.equal(request.status, 'completed'); assert.equal(app.service.getRunEvidence(request.resultRunId!)?.run.status, 'succeeded'); assert.equal(app.service.getMission('mission-ready').status, 'needs_review'); observed = true;
    });
    await app.service.workOnce('atomic-worker'); assert.equal(observed, true);
  } finally { await app.stop(); }
});

test('authored running visual fixture resets without manufacturing accounting funds', async () => {
  const app = await missionServer();
  try {
    seedRunningDemo(app.service); assert.equal(app.service.getMission('mission-running').computeReserved, 0);
    await app.context.reset(); assert.equal(app.service.store.get('mission', 'mission-running'), undefined);
    seedRunningDemo(app.service); await app.context.reset();
    const dispatch = app.service.dispatch('mission-ready'); if (dispatch.dispatch !== 'inline') assert.fail();
    assert.equal((await app.terminal(dispatch.run.id)).run.status, 'succeeded');
  } finally { await app.stop(); }
});

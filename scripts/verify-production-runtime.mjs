import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

// Run inside the disposable production image with --network=none and no secrets.
// This verifies packaging and the real entrypoint; Docker browser journeys remain separate.
const child = spawn(process.execPath, ['entry.mjs'], { stdio: 'ignore' });
const exited = once(child, 'exit');
const base = 'http://127.0.0.1:8080';
async function call(path, body) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(10000), ...(body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }) });
  assert.equal(response.status, 200, `${path} status`);
  return response.json();
}
async function terminal(id) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const mission = await call(`/api/missions/${id}`);
    if (mission.latestRun && mission.latestRun.status !== 'running') return mission;
    await delay(50);
  }
  throw new Error('Production fixture did not reach terminal evidence in 20 s');
}
try {
  const deadline = Date.now() + 10000;
  while (true) {
    try { await call('/healthz'); break; }
    catch { if (Date.now() >= deadline || child.exitCode !== null) throw new Error('Production entrypoint did not become ready'); await delay(50); }
  }
  const receipt = await call('/__deployment');
  assert.equal(receipt.stage, 'phase3-integrated');
  assert.equal(receipt.executionAvailable, true);
  assert.equal(receipt.executionScope, 'bundled-fixtures-only');
  assert.equal((await call('/readyz')).db, true);
  const { analysis } = await call('/api/analyze', { source: 'fixture' });
  const { draft } = await call('/api/campaigns/generate', { analysis, issueId: analysis.issues[0].id, mode: 'demo' });
  const { mission } = await call('/api/missions', { analysis, draft });
  await call(`/api/missions/${mission.id}/pledge`, { amount: mission.computeGoal });
  const duration = await terminal(mission.id);
  assert.equal(duration.latestRun.status, 'succeeded');
  assert.equal(duration.artifact.testEvidenceSource, 'engine');
  assert.equal(duration.artifact.dossier.experiments.at(-1).passed, 5);
  await call(`/api/runs/${duration.latestRun.id}/review`, { decision: 'approve' });
  assert.equal((await call(`/api/missions/${mission.id}`)).status, 'approved');
  await call('/api/missions/mission-ready/execute', {});
  const retry = await terminal('mission-ready');
  assert.equal(retry.latestRun.status, 'succeeded');
  assert.equal(retry.artifact.dossier.experiments.at(-1).passed, 3);
  await call('/api/demo/reset', {});
  assert.equal((await fetch(`${base}/api/missions/${mission.id}`)).status, 404);
  console.log(JSON.stringify({ productionEntrypoint: 'passed', duration: '5/5, approved', retry: '3/3, needs_review', reset: 'passed', externalNetwork: false }));
} finally {
  child.kill('SIGTERM');
  const watchdog = setTimeout(() => child.kill('SIGKILL'), 10000);
  try { await exited; } finally { clearTimeout(watchdog); }
}

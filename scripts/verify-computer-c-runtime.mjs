import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createApplication } from '../dist-server/server/app.js';

// Real built-server HTTP/persistence smoke. This never substitutes for Docker UI tests.
const directory = mkdtempSync(join(tmpdir(), 'nxtcommit-c-runtime-'));
const application = createApplication({ databasePath: join(directory, 'state.sqlite') });
const server = application.app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
async function call(path, body) {
  const response = await fetch(`${base}${path}`, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(response.status, 200); return response.json();
}
try {
  const { analysis } = await call('/api/analyze', { source: 'fixture' });
  const { draft } = await call('/api/campaigns/generate', { analysis, issueId: analysis.issues[0].id, mode: 'demo' });
  const created = await call('/api/missions', { analysis, draft });
  const loaded = await call(`/api/missions/${created.mission.id}`);
  assert.equal(loaded.status, 'funding'); assert.equal(loaded.project.workspace.kind, 'fixture');
  assert.equal(loaded.project.workspace.path, 'duration-demo');
  const observed = await call('/api/missions/review-demo'); assert.equal(observed.evidence.artifact.testEvidenceSource, 'demo');
  const reviewed = await call('/api/runs/review-demo-run/review', { decision: 'request_changes', comment: 'Add more verification.' }); assert.equal(reviewed.mission.status, 'changes_requested');
  await call('/api/demo/reset', {});
  assert.equal((await call('/api/missions/review-demo')).mission.status, 'needs_review');
  console.log(JSON.stringify({ builtRuntime: 'passed', authoring: 'persisted funding mission', review: 'persisted local request_changes on authored seed', reset: 'restored seed', browserVerified: false }));
} finally {
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await application.close(); rmSync(directory, { recursive: true, force: true });
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionServer } from './spec-tests/mission-test-support.js';
import { assertContainedWorkspacePath } from './services/mission-engine.js';
import { mkdtemp, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Spec: api.mission-stream
 * Scenario: mission-stream-redacts-before-persist-and-publish
 * Given Repository or runner output contains credential-shaped text.
 * When An execution event is persisted and streamed.
 * Then Stored and SSE payloads contain the same redacted bounded evidence and never expose the secret.
 */
test('api.mission-stream / mission-stream-redacts-before-persist-and-publish', async () => {
  const app = await missionServer(); const controller = new AbortController();
  try {
    const stream = await fetch(app.url + '/api/missions/mission-ready/stream', { signal: controller.signal }); const reader = stream.body!.getReader(); await reader.read();
    const received: string[] = []; const collect = (async () => { try { while (true) { const result = await reader.read(); if (result.done) break; received.push(new TextDecoder().decode(result.value)); } } catch {} })();
    const dispatch = app.service.dispatch('mission-ready'); assert.equal(dispatch.dispatch, 'inline'); if (dispatch.dispatch !== 'inline') return;
    const secret = 'sk-' + 'synthetic'.repeat(4); app.service.emit(dispatch.run.id, 'analysis', 'demo', { detail: secret, nested: { output: 'Bearer ' + 'fake'.repeat(8) }, note: 'x'.repeat(50000) });
    const stored = app.service.getRunEvidence(dispatch.run.id)!.events.find(event => event.type === 'analysis')!;
    assert.ok(JSON.stringify(stored).includes('[REDACTED]')); assert.ok(!JSON.stringify(stored).includes(secret));
    await app.terminal(dispatch.run.id); controller.abort(); await collect;
    const frame = received.join('').split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6))).find(frame => frame.event?.id === stored.id);
    assert.deepEqual(frame.event, stored); assert.ok(!received.join('').includes(secret));
  } finally { controller.abort(); await app.stop(); }
});

test('workspace containment refuses traversal absolute paths protected roots and symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nxtcommit-containment-'));
  for (const path of ['../escape', '/tmp/escape', '.git/config', 'node_modules/x']) await assert.rejects(assertContainedWorkspacePath(root, path));
  await symlink('/tmp', join(root, 'escape'));
  await assert.rejects(assertContainedWorkspacePath(root, 'escape/file'));
  await assert.rejects(assertContainedWorkspacePath(root, 'escape'));
  assert.ok((await assertContainedWorkspacePath(root, 'allowed.mjs')).endsWith('allowed.mjs'));
});

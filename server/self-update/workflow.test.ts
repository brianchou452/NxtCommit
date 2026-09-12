import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { UpdateControl, atomicJson } from './control.js';
import { editableFiles } from './proposal.js';
import { iterate } from './runner.js';

async function setup() {
  const root = mkdtempSync(join(tmpdir(), 'update-graph-')),
    control = new UpdateControl(root),
    base = randomUUID();
  for (const file of editableFiles) {
    const path = join(root, 'releases', base, 'source', file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, 'export const value = 1;');
  }
  const dist = join(root, 'releases', base, 'dist');
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, 'index.html'), 'baseline');
  control.switchTo(base);
  await control.change({ enabled: true, demoLocked: false });
  atomicJson(join(root, 'runtime.json'), {
    docker: '/unused/docker',
    context: 'test',
    image: 'sha256:' + '0'.repeat(64),
    applicationUrl: 'http://127.0.0.1:4188/',
  });
  return { root, base, control };
}
const config = { model: 'controlled-test', apiKey: 'synthetic', baseUrl: 'https://api.openai.com/v1' };
test('full update graph reuses proposal, retries verification, promotes once and refuses epoch changes', async () => {
  const s = await setup();
  let calls = 0,
    verifications = 0,
    smokes = 0;
  const operations = {
    propose: async () => {
      calls++;
      return {
        proposal: {
          summary: { en: 'Improve recovery.', 'zh-TW': '改善復原。' },
          edits: [{ path: editableFiles[0], before: '1', after: '2' }],
        },
        evidence: {
          generator: 'openai',
          model: 'controlled-test',
          promptVersion: 'controlled-v1',
          latencyMs: 1,
        },
      };
    },
    verifyCandidate: async (_control: UpdateControl, _source: string, output: string) => {
      if (++verifications === 1) throw Error('controlled_failure');
      mkdirSync(join(output, 'dist'), { recursive: true });
      writeFileSync(join(output, 'dist/index.html'), 'candidate');
    },
    smoke: async () => {
      smokes++;
      return true;
    },
  };
  try {
    const first = await iterate(s.control, config, 'Improve recovery.', undefined, operations);
    assert.equal(first.status, 'failed');
    assert.ok('id' in first);
    assert.equal(s.control.active(), s.base);
    const resumed = await iterate(s.control, config, 'Improve recovery.', first.id!, operations);
    assert.equal(resumed.status, 'promoted');
    assert.equal(s.control.active(), first.id);
    assert.equal(readFileSync(join(s.root, 'current/dist/index.html'), 'utf8'), 'candidate');
    const again = await iterate(s.control, config, 'Improve recovery.', first.id!, operations);
    assert.equal(again.status, 'promoted');
    assert.deepEqual([calls, verifications, smokes], [1, 2, 1]);
    await s.control.change({ enabled: false });
    await s.control.change({ enabled: true });
    const stale = await iterate(s.control, config, 'Improve recovery.', first.id!, operations);
    assert.equal(stale.status, 'failed');
    assert.ok('failureReason' in stale);
    assert.equal(stale.failureReason, 'checkpoint_identity_mismatch');
    assert.equal(calls, 1);
  } finally {
    rmSync(s.root, { recursive: true, force: true });
  }
});
test('demo lock during a model stage cancels before verification and activation', async () => {
  const s = await setup();
  let verifies = 0;
  try {
    const result = await iterate(s.control, config, 'Improve recovery.', undefined, {
      propose: async () => {
        await s.control.change({ demoLocked: true });
        return {
          proposal: {
            summary: { en: 'Improve recovery.', 'zh-TW': '改善復原。' },
            edits: [{ path: editableFiles[0], before: '1', after: '2' }],
          },
          evidence: {
            generator: 'openai',
            model: 'controlled',
            promptVersion: 'controlled-v1',
            latencyMs: 1,
          },
        };
      },
      verifyCandidate: async () => {
        verifies++;
      },
      smoke: async () => true,
    });
    assert.equal(result.status, 'cancelled');
    assert.equal(verifies, 0);
    assert.equal(s.control.active(), s.base);
  } finally {
    rmSync(s.root, { recursive: true, force: true });
  }
});

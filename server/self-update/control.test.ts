import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { UpdateControl } from './control.js';
import { editableFiles, validateProposal } from './proposal.js';
import type { SourceFiles } from './proposal.js';

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'nxtcommit-update-test-')); const control = new UpdateControl(root);
  const base = randomUUID(), candidate = randomUUID();
  for (const id of [base, candidate]) { mkdirSync(join(root, 'releases', id, 'dist'), { recursive: true }); writeFileSync(join(root, 'releases', id, 'dist/index.html'), id); }
  control.switchTo(base);
  return { root, control, base, candidate, close: () => rmSync(root, { recursive: true, force: true }) };
}
test('self-update starts disabled and demo-locked; enabling alone cannot update', async () => {
  const s = setup(); try {
    assert.equal(s.control.read().enabled, false); assert.equal(s.control.read().demoLocked, true);
    const settings = await s.control.change({ enabled: true }); assert.equal(s.control.allowed(settings.epoch), false);
    assert.equal(await s.control.promote(settings.epoch, s.base, s.candidate, async () => true), 'cancelled');
    assert.equal(s.control.active(), s.base);
  } finally { s.close(); }
});
test('demo-on and off/on both revoke an in-flight update epoch', async () => {
  const s = setup(); try {
    const old = await s.control.change({ enabled: true, demoLocked: false });
    await s.control.change({ demoLocked: true });
    assert.equal(await s.control.promote(old.epoch, s.base, s.candidate, async () => true), 'cancelled');
    await s.control.change({ enabled: false, demoLocked: false }); await s.control.change({ enabled: true });
    assert.equal(await s.control.promote(old.epoch, s.base, s.candidate, async () => true), 'cancelled');
    assert.equal(s.control.active(), s.base);
  } finally { s.close(); }
});
test('failed post-switch smoke rolls back to exactly the previous release', async () => {
  const s = setup(); try {
    const settings = await s.control.change({ enabled: true, demoLocked: false });
    assert.equal(await s.control.promote(settings.epoch, s.base, s.candidate, async () => false), 'rolled-back');
    assert.equal(s.control.active(), s.base);
    assert.equal(await s.control.promote(settings.epoch, s.base, s.candidate, async () => { throw new Error('offline'); }), 'rolled-back');
    assert.equal(s.control.active(), s.base);
  } finally { s.close(); }
});
test('successful promotion cannot be repeated against an obsolete baseline', async () => {
  const s = setup(); try {
    const settings = await s.control.change({ enabled: true, demoLocked: false });
    assert.equal(await s.control.promote(settings.epoch, s.base, s.candidate, async () => true), 'promoted');
    assert.equal(s.control.active(), s.candidate);
    assert.equal(await s.control.promote(settings.epoch, s.base, s.candidate, async () => true), 'cancelled');
  } finally { s.close(); }
});
test('acknowledged demo lock serializes against activation and blocks subsequent switches', async () => {
  const s = setup(); try {
    const settings = await s.control.change({ enabled: true, demoLocked: false });
    let release!: () => void;
    const pending = s.control.promote(settings.epoch, s.base, s.candidate, () => new Promise<boolean>(resolve => { release = () => resolve(true); }));
    await new Promise(resolve => setTimeout(resolve, 5));
    const freeze = s.control.change({ demoLocked: true }); release(); await pending; await freeze;
    assert.equal(s.control.read().demoLocked, true);
    assert.equal(await s.control.promote(settings.epoch, s.candidate, s.base, async () => true), 'cancelled');
    assert.equal(s.control.active(), s.candidate);
  } finally { s.close(); }
});
test('corrupt settings fail closed and cannot promote', async () => {
  const s = setup(); try {
    writeFileSync(join(s.root, 'settings.json'), '{');
    assert.equal(s.control.allowed('x'), false);
    assert.equal(await s.control.promote('x', s.base, s.candidate, async () => true), 'cancelled');
  } finally { s.close(); }
});
const sources = Object.fromEntries(editableFiles.map(path => [path, 'export const value = 1;'])) as SourceFiles;
const proposal = (path: string, before = '1', after = '2') => ({ summary: { en: 'Improve recovery.', 'zh-TW': '改善復原。' }, edits: [{ path, before, after }] });
test('proposal accepts a bounded exact edit but rejects protected files and traversal', () => {
  assert.equal(validateProposal(proposal(editableFiles[0]), sources).edits.length, 1);
  for (const path of ['../../.env', '/tmp/code.ts', 'server/self-update/control.ts', 'server/authoring/assistance.ts', 'package.json', 'server/self-update/control.test.ts']) assert.throws(() => validateProposal(proposal(path), sources));
});
test('proposal rejects ambiguous edits, remote URLs, secrets, blank replacements and new imports', () => {
  assert.throws(() => validateProposal(proposal(editableFiles[0], 'absent'), sources));
  for (const after of ['', ' ', 'fetch("https://example.com")', 'sk-SYNTHETIC_NOT_A_REAL_SECRET_000000', 'eval("x")', '1;\nimport x from "somewhere";']) assert.throws(() => validateProposal(proposal(editableFiles[0], '1', after), sources));
  const duplicate = proposal(editableFiles[0]); duplicate.edits.push(duplicate.edits[0]!); assert.throws(() => validateProposal(duplicate, sources));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { AssuranceController } from './assurance.js';
import { createApplication } from '../app.js';

const token = 'test-operator-token-0000000000000000';
test('authenticated cycle reaches real checks, visible stages, cooldown and persisted history without changing demo data', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'assurance-test-'));
  const application = createApplication({assurance: {directory, token, enabled: true, commit: 'test'}});
  const server = application.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const before = await (await fetch(base + '/api/bootstrap')).json();
    const denied = await fetch(base + '/api/assurance/run', {method: 'POST'}); assert.equal(denied.status, 403);
    assert.equal((await (await fetch(base + '/api/assurance')).json()).runs.length, 0);
    const request = () => fetch(base + '/api/assurance/run', {method: 'POST', headers: {Authorization: `Bearer ${token}`}});
    const [a, b] = await Promise.all([request(), request()]);
    const run = await a.json(); assert.equal((await b.json()).id, run.id);
    assert.equal(run.status, 'passed'); assert.equal(run.report.summary.total, 38); assert.equal(run.report.summary.failed, 0);
    assert.deepEqual(run.stages.map((s: {status: string}) => s.status), Array(6).fill('completed'));
    assert.deepEqual(run.stages.map((s: {startedAt: string}) => s.startedAt), [...run.stages.map((s: {startedAt: string}) => s.startedAt)].sort());
    assert.equal(run.modelCalls, 0); assert.equal(run.advice.plan.evidence.generator, 'static');
    assert.equal((await (await request()).json()).id, run.id);
    assert.deepEqual(await (await fetch(base + '/api/bootstrap')).json(), before);
    assert.equal(JSON.stringify(run).includes(token), false);
    const publicView = await (await fetch(base + '/api/assurance')).json(); assert.equal(publicView.runs.length, 1);
  } finally {server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); await application.close();}
  const reopened = new AssuranceController({directory, token, enabled: true, commit: 'test'});
  assert.equal(reopened.snapshot().runs[0]?.status, 'passed'); await reopened.close(); rmSync(directory, {recursive: true, force: true});
});

test('failures are terminal and cannot expose private exceptions or green checks', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'assurance-failed-'));
  const controller = new AssuranceController({directory, enabled: true, commit: 'test', experiment: {run: async () => {throw Error(token);}} as never});
  try {
    const run = await controller.start('operator'); assert.equal(run?.status, 'failed');
    assert.equal(run?.report, undefined); assert.equal(JSON.stringify(controller.snapshot()).includes(token), false);
  } finally {await controller.close(); rmSync(directory, {recursive: true, force: true});}
});

test('disabled scheduling never starts work', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'assurance-off-'));
  const controller = new AssuranceController({directory, enabled: false, commit: 'test'});
  try {assert.equal(await controller.start('scheduled'), null); assert.equal(controller.snapshot().runs.length, 0);}
  finally {await controller.close(); rmSync(directory, {recursive: true, force: true});}
});

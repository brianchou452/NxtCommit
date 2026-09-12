import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Router } from 'express';
import { openDatabase, migrations, createResetHarness } from './persistence/index.js';
import { seedFoundation, readCurrentPersona } from './persistence/seed.js';
import { startTestServer } from './test-support/http.js';
import { assertProvenance, assertRunSummary, RUN_STATUSES } from '../shared/types.js';
import type { RunSummary } from '../shared/types.js';

test('foundation migrations are durable, idempotent and enforce one current persona', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nxtcommit-foundation-'));
  const path = join(directory, 'state.sqlite');
  try {
    let store = openDatabase(path);
    store.migrate(migrations);
    store.transaction(seedFoundation);
    store.close();
    store = openDatabase(path);
    try {
      store.migrate(migrations);
      assert.equal(store.db.prepare('SELECT count(*) AS count FROM schema_migrations').get()?.count, migrations.length);
      assert.equal(readCurrentPersona(store.db).id, 'demo-contributor');
      assert.throws(() => store.db.prepare('INSERT INTO local_personas VALUES (?, ?, 1)').run('another', '{}'));
    } finally { store.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('failed migrations roll back schema and registry together', () => {
  const store = openDatabase(':memory:');
  try {
    assert.throws(() => store.migrate([{ id: 1, name: 'broken', up(db) {
      db.exec('CREATE TABLE incomplete (id TEXT)'); throw new Error('failure');
    } }]));
    assert.equal(store.db.prepare("SELECT name FROM sqlite_master WHERE name = 'incomplete'").get(), undefined);
    assert.equal(store.db.prepare('SELECT count(*) AS count FROM schema_migrations').get()?.count, 0);
    store.migrate(migrations);
    assert.throws(() => store.migrate([{ ...migrations[0]!, name: 'changed' }]));
    assert.throws(() => store.migrate([migrations[0]!, migrations[0]!]));
  } finally { store.close(); }
});

test('transactions roll back failed writes and support nested savepoints', () => {
  const store = openDatabase(':memory:');
  try {
    store.db.exec('CREATE TABLE values_table (value INTEGER)');
    assert.throws(() => store.transaction(db => { db.exec('INSERT INTO values_table VALUES (1)'); throw new Error('failure'); }));
    store.transaction(db => {
      db.exec('INSERT INTO values_table VALUES (2)');
      assert.throws(() => store.transaction(nested => { nested.exec('INSERT INTO values_table VALUES (3)'); throw new Error('nested'); }));
      db.exec('INSERT INTO values_table VALUES (4)');
    });
    assert.deepEqual(store.db.prepare('SELECT value FROM values_table').all().map(row => row.value), [2, 4]);
  } finally { store.close(); }
});

test('reset quiesces before deletion, clears child-first, seeds parent-first and coalesces requests', async () => {
  const store = openDatabase(':memory:');
  const order: string[] = [];
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  store.db.exec('CREATE TABLE parent(id INTEGER PRIMARY KEY); CREATE TABLE child(parent_id INTEGER REFERENCES parent(id))');
  store.db.exec('INSERT INTO parent VALUES (9); INSERT INTO child VALUES (9)');
  const reset = createResetHarness(store, [
    { id: 'parent', quiesce: async () => { await barrier; order.push('parent stopped'); },
      clear: db => { order.push('clear parent'); db.exec('DELETE FROM parent'); },
      seed: db => { order.push('seed parent'); db.exec('INSERT INTO parent VALUES (1)'); } },
    { id: 'child', quiesce: async () => { order.push('child stopped'); },
      clear: db => { order.push('clear child'); db.exec('DELETE FROM child'); },
      seed: db => { order.push('seed child'); db.exec('INSERT INTO child VALUES (1)'); } },
  ]);
  try {
    const first = reset.reset();
    assert.equal(first, reset.reset());
    assert.equal(reset.pending, true);
    assert.equal(store.db.prepare('SELECT id FROM parent').get()?.id, 9);
    release(); await first;
    assert.deepEqual(order, ['child stopped', 'parent stopped', 'clear child', 'clear parent', 'seed parent', 'seed child']);
    assert.equal(reset.pending, false);
    assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { store.close(); }
});

test('failed reset restores the previous state and permits retry', async () => {
  const store = openDatabase(':memory:');
  store.migrate(migrations); store.transaction(seedFoundation);
  let fail = true;
  const reset = createResetHarness(store, [{ id: 'persona', quiesce: async () => {},
    clear: db => { db.exec('DELETE FROM local_personas'); }, seed: db => {
      if (fail) throw new Error('seed failure'); seedFoundation(db);
    } }]);
  try {
    const before = readCurrentPersona(store.db);
    await assert.rejects(reset.reset());
    assert.deepEqual(readCurrentPersona(store.db), before);
    fail = false; await reset.reset();
    assert.deepEqual(readCurrentPersona(store.db), before);
  } finally { store.close(); }
});

test('quiesce failure never deletes persisted data', async () => {
  const store = openDatabase(':memory:');
  store.migrate(migrations); store.transaction(seedFoundation);
  const reset = createResetHarness(store, [{ id: 'fail', quiesce: async () => { throw new Error('not stopped'); },
    clear: () => assert.fail('must not clear'), seed: () => assert.fail('must not seed') }]);
  try { await assert.rejects(reset.reset()); assert.equal(readCurrentPersona(store.db).id, 'demo-contributor'); }
  finally { store.close(); }
});

test('foundation reset HTTP restores persona, repeated requests remain deterministic', async () => {
  const server = await startTestServer();
  try {
    const before = await (await fetch(`${server.url}/api/bootstrap`)).json();
    server.context.store.db.prepare("UPDATE local_personas SET snapshot = json_set(snapshot, '$.walletBalance', 3)").run();
    const responses = await Promise.all([1, 2].map(() => fetch(`${server.url}/api/demo/reset`, { method: 'POST' })));
    for (const response of responses) assert.deepEqual(await response.json(), { ok: true });
    assert.deepEqual(await (await fetch(`${server.url}/api/bootstrap`)).json(), before);
  } finally { await server.stop(); }
});

test('health is liveness only and readiness follows database availability despite execution refusal', async () => {
  const server = await startTestServer({ installMissions: false });
  try {
    const health = await (await fetch(`${server.url}/healthz`)).json();
    assert.equal(health.status, 'ok'); assert.equal(health.mode, undefined);
    const ready = await fetch(`${server.url}/readyz`);
    assert.equal(ready.status, 200);
    const body = await ready.json();
    assert.equal(body.db, true); assert.equal(body.executionMode, undefined);
    assert.match(body.executionError, /no runner/);
  } finally { await server.stop(); }
});

test('unimplemented APIs are 404 and internal error details never reach HTTP responses', async () => {
  const server = await startTestServer({ modules: [() => {
    const router = Router();
    router.get('/api/failure', () => { throw new Error('private-internal-marker'); });
    return router;
  }] });
  try {
    assert.equal((await fetch(`${server.url}/api/missions`)).status, 404);
    const error = await fetch(`${server.url}/api/failure`);
    assert.equal(error.status, 500); assert.doesNotMatch(await error.text(), /private-internal-marker/);
    assert.equal((await fetch(`${server.url}/api/demo/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  } finally { await server.stop(); }
});

test('terminal contract accepts all canonical outcomes and rejects missing or stale completion fields', () => {
  const run: RunSummary = { id: 'run', missionId: 'mission', mode: 'demo', status: 'running', computeBudget: 10, computeUsed: 0, startedAt: '2026-09-12T00:00:00.000Z' };
  assertRunSummary(run);
  for (const status of RUN_STATUSES.filter(status => status !== 'running')) {
    assertRunSummary({ ...run, status, endedAt: '2026-09-12T00:01:00.000Z' });
    assert.throws(() => assertRunSummary({ ...run, status } as RunSummary));
  }
  assert.throws(() => assertRunSummary({ ...run, status: 'stalled' } as unknown as RunSummary));
  assert.throws(() => assertRunSummary({ ...run, completedAt: '2026-09-12T00:01:00.000Z' } as unknown as RunSummary));
  assert.throws(() => assertRunSummary({ ...run, status: 'succeeded', endedAt: '2025-01-01' }));
});

test('non-engine provenance cannot be promoted to verified', () => {
  for (const source of ['demo', 'llm', 'codex', 'maintainer', 'system']) {
    assertProvenance({ source, verified: false });
    assert.throws(() => assertProvenance({ source, verified: true }));
  }
  assertProvenance({ source: 'engine', verified: true });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from './app.js';
import { githubTransport, FIXED } from './test-support/github.js';
import { runGithubImplementation, validateChanges } from './github/runner.js';
import type { GithubWorkspace } from '../shared/github.js';

test('authenticated ownership, CSRF, immutable source, lost PR response recovery and exact-head CI gate', async () => {
  const remote = githubTransport(); remote.state.losePrResponse = true; remote.state.failChecks = true;
  let runs = 0;
  const application = createApplication({ github: { enabled: true, requiredChecks: ['test'], fetcher: remote.fetcher, runner: async w => { runs++; return runGithubImplementation(w, { model: async () => ({ text: JSON.stringify({ changes: [{ path: 'math.mjs', content: FIXED }] }), provenance: { generator: 'openai', model: 'controlled-model', promptVersion: 'github-implementation-v1', fallback: false, responseId: 'test-response', latencyMs: 1, usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 } } }), verify: async (_w, changes) => ({ exitCode: Object.keys(changes).length ? 0 : 1, tests: 1, output: 'controlled verifier', isolation: 'docker', command: 'controlled' }) }); } } });
  const server = application.app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
  const root = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/github`;
  const call = async (path: string, cookie = '', body?: unknown, extra: Record<string, string> = {}) => fetch(root + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try {
    assert.equal((await call('/workspaces')).status, 401);
    const session = await call('/session', '', { token: 'fixture-auth-token' }); const cookie = session.headers.get('set-cookie')!.split(';')[0]!;
    assert.match(session.headers.get('set-cookie')!, /HttpOnly/); assert.match(session.headers.get('set-cookie')!, /SameSite=Strict/);
    assert.equal((await call('/workspaces', cookie, {}, { Origin: 'https://attacker.test' })).status, 403);
    const result = await (await call('/workspaces', cookie, { url: 'https://github.com/PrimeIntellect-ai/prime-agent' })).json();
    const w = result.workspace as GithubWorkspace;
    assert.equal(w.files[0]!.content, remote.files[0]!.content); assert.equal(w.commit, 'a'.repeat(40));
    assert.throws(() => validateChanges(w, [{ path: 'math.test.mjs', content: 'weaken tests' }]));
    assert.throws(() => validateChanges(w, [{ path: '../outside', content: 'escape' }]));
    const other = await call('/session', '', { token: 'second-user-token' }); const otherCookie = other.headers.get('set-cookie')!.split(';')[0]!;
    assert.equal((await call(`/workspaces/${w.id}`, otherCookie)).status, 404);
    const path = `/workspaces/${w.id}/pledge`; const pledge = { title: 'Fix addition', amount: 100 };
    assert.equal((await call(path, cookie, pledge)).status, 502);
    assert.equal((await call(path, cookie, pledge)).status, 200);
    let current: GithubWorkspace = w;
    for (let i = 0; i < 100; i++) { current = (await (await call(`/workspaces/${w.id}`, cookie)).json()).workspace; if (current.phase === 'awaiting_ci') break; await new Promise(r => setTimeout(r, 10)); }
    assert.equal(current.phase, 'awaiting_ci'); assert.equal(remote.snapshot().draft, true);
    assert.equal(application.context.store.db.prepare("SELECT count(*) AS n FROM b_records WHERE kind='pledge' AND owner=?").get(current.missionId!)!.n, 1);
    remote.state.failChecks = false; remote.state.wrongHead = true;
    await call(`/workspaces/${w.id}/resume`, cookie, {});
    for (let i = 0; i < 100; i++) { current = (await (await call(`/workspaces/${w.id}`, cookie)).json()).workspace; if (current.error === 'branch_conflict') break; await new Promise(r => setTimeout(r, 10)); }
    assert.equal(current.error, 'branch_conflict'); assert.equal(remote.snapshot().draft, true);
    remote.state.wrongHead = false; await call(`/workspaces/${w.id}/resume`, cookie, {});
    for (let i = 0; i < 100; i++) { current = (await (await call(`/workspaces/${w.id}`, cookie)).json()).workspace; if (current.ready) break; await new Promise(r => setTimeout(r, 10)); }
    assert.equal(current.ready, true); assert.equal(runs, 1); assert.equal(remote.snapshot().commits, 2);
    assert.equal(remote.calls.filter(c => c.path.endsWith('/pulls') && c.method === 'POST').length, 1);
    const row = application.context.store.db.prepare('SELECT data FROM github_workspaces WHERE id=?').get(w.id)!;
    assert.equal(String(row.data).includes('fixture-auth-token'), false);
  } finally { server.close(); server.closeAllConnections(); await application.close(); }
});

test('restart requires reauthentication and preserves interrupted source workspaces', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises'); const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
  const directory = await mkdtemp(join(tmpdir(), 'nxt-github-recovery-')); const path = join(directory, 'state.sqlite');
  let app = createApplication({ databasePath: path });
  const w = { id: 'persisted', ownerId: 1, repository: 'PrimeIntellect-ai/prime-agent', commit: 'a'.repeat(40), files: [], phase: 'running' };
  app.context.store.db.prepare('INSERT INTO github_workspaces VALUES (?,?,?)').run(w.id, 1, JSON.stringify(w)); await app.close();
  app = createApplication({ databasePath: path });
  try { const saved = JSON.parse(String(app.context.store.db.prepare('SELECT data FROM github_workspaces WHERE id=?').get(w.id)!.data)); assert.equal(saved.phase, 'failed'); assert.equal(saved.error, 'execution_interrupted'); assert.equal(saved.commit, w.commit); }
  finally { await app.close(); await rm(directory, { recursive: true, force: true }); }
});

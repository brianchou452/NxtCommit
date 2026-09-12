import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startTestServer } from './test-support/http.js';
import { draftFixture, request } from './test-support/authoring.js';
import { analyzeRepository, publicRepository } from './authoring/analyzer.js';
import { Assistance } from './authoring/assistance.js';
import { LangfuseObservations } from './authoring/observations.js';
import type { AuthoredMission } from '../shared/authoring.js';
import type { ExecutionEvidence } from '../shared/types.js';

test('authoring persists through restart while process capabilities expire', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'nxtcommit-authoring-')); const databasePath = join(directory, 'state.sqlite');
  let server = await startTestServer({ installMissions: false, databasePath });
  try {
    const pair = await draftFixture(server.url);
    const created = await request<{ mission: AuthoredMission }>(server.url, '/api/missions', pair);
    await server.stop(); server = await startTestServer({ installMissions: false, databasePath });
    const loaded = await request<{ mission: AuthoredMission }>(server.url, `/api/missions/${created.mission.id}`);
    assert.deepEqual(loaded.mission, created.mission);
    await request(server.url, '/api/missions', pair, 400);
  } finally { await server.stop(); rmSync(directory, { recursive: true, force: true }); }
});

test('public analyzer fetches bounded metadata only and rejects URL escape attempts before networking', async () => {
  const urls: string[] = [];
  const fetcher: typeof fetch = async input => {
    urls.push(String(input));
    return Response.json(String(input).includes('/issues?') ? [{ number: 42, title: 'Example', body: 'token=synthetic-secret', labels: [{ name: 'bug' }] }] : String(input).includes('/commits/') ? { sha: 'a'.repeat(40) } : { name: 'prime-agent', description: 'Public metadata fixture', private: false, default_branch: 'main', stargazers_count: 12 });
  };
  const result = await analyzeRepository('github', 'https://github.com/PrimeIntellect-ai/prime-agent', fetcher);
  assert.equal(urls.length, 3); assert.ok(urls.every(url => url.startsWith('https://api.github.com/repos/PrimeIntellect-ai/prime-agent')));
  assert.equal(result.measured.filesystem, false); assert.equal('files' in result, false); assert.equal(result.issues[0]?.feasibility.executable, false); assert.doesNotMatch(JSON.stringify(result), /synthetic-secret/);
  for (const url of ['https://github.com@localhost/repo/name', 'https://github.com/repo/name?token=x', 'https://github.com/repo/name/tree/main', 'file:///etc/passwd', 'https://github.com:444/repo/name']) assert.throws(() => publicRepository(url));
});

test('model generation validates bilingual output, redacts prompt evidence and falls back without false provenance', async () => {
  const calls: string[] = []; let invalid = false;
  const service = new Assistance({ baseUrl: 'https://model.example/v1', apiKey: 'test-credential', model: 'test-model' }, undefined, async (_url, init) => {
    calls.push(String(init?.body)); return Response.json({ choices: [{ message: { content: invalid ? '{"en":"tests passed","zh-TW":"測試已通過"}' : '{"en":"Inspect the issue scope.","zh-TW":"檢視議題範圍。"}' } }] });
  });
  const fallback = { en: 'Static advice', 'zh-TW': '靜態建議' };
  const good = await service.explain('issue-triage', { text: 'api_key=synthetic-canary', nested: [{ password: 'nested-canary', authorization: 'header-canary' }] }, fallback);
  assert.equal(good.evidence.generator, 'openai'); assert.equal(good.evidence.model, 'test-model'); assert.doesNotMatch(calls[0]!, /synthetic-canary|test-credential|nested-canary|header-canary/);
  invalid = true;
  const bad = await service.explain('issue-triage', {}, fallback);
  assert.equal(bad.evidence.generator, 'static'); assert.deepEqual(bad.summary, fallback); assert.equal('model' in bad.evidence, false);
});

test('trace export contains only bounded metadata; score is feature-bound and sink failure is nonfatal', async () => {
  const exports: Array<{ url: string; body: string }> = [];
  const sink = new LangfuseObservations({ baseUrl: 'https://trace.example', publicKey: 'synthetic-public', secretKey: 'synthetic-secret' }, async (url, init) => {
    exports.push({ url: String(url), body: String(init?.body) }); return Response.json({});
  });
  const service = new Assistance(undefined, sink);
  const result = await service.explain('issue-triage', { repository: 'forbidden-free-text', secret: 'canary' }, { en: 'fallback', 'zh-TW': '備援' });
  assert.ok(result.evidence.traceId); assert.equal(exports.length, 1); assert.match(exports[0]!.url, /otel\/v1\/traces$/);
  assert.doesNotMatch(exports[0]!.body, /forbidden-free-text|canary|synthetic-secret|fallback/);
  const wrong = await service.feedback({ traceId: result.evidence.traceId, feature: 'shadow-review', helpful: true }); assert.equal(wrong.recorded, false); assert.equal(exports.length, 1);
  const score = await service.feedback({ traceId: result.evidence.traceId, feature: 'issue-triage', helpful: true }); assert.equal(score.recorded, true); assert.match(exports[1]!.body, /local-demo-user/);
  const broken = new Assistance(undefined, { trace: async () => { throw new Error('private'); }, score: async () => false });
  const fallback = await broken.explain('shadow-review', {}, { en: 'safe', 'zh-TW': '安全' }); assert.equal('traceId' in fallback.evidence, false); assert.equal(broken.counts.exportFailure, 1);
});

test('in-flight analysis cannot issue a new capability after reset', async () => {
  let release!: () => void; const barrier = new Promise<void>(resolve => { release = resolve; }); let entered!: () => void; const started = new Promise<void>(resolve => { entered = resolve; });
  const server = await startTestServer({ installMissions: false, authoring: { fetcher: async url => { entered(); await barrier; return Response.json(String(url).includes('/issues?') ? [] : { name: 'prime-agent', private: false }); } } });
  try {
    const analysis = request(server.url, '/api/analyze', { source: 'github', url: 'https://github.com/PrimeIntellect-ai/prime-agent' }, 400);
    await started; await request(server.url, '/api/demo/reset', {}); release(); await analysis;
  } finally { release(); await server.stop(); }
});

test('live review consumes trusted evidence and integrity port, rejects failed gate and persists one decision', async () => {
  let evidence: ExecutionEvidence | undefined;
  let unchanged = false;
  const server = await startTestServer({ installMissions: false, authoring: { evidence: { getRunEvidence: id => evidence?.run.id === id ? evidence : undefined, getLatestRunEvidence: id => evidence?.run.missionId === id ? evidence : undefined }, integrityForRun: () => ({ protectedInputsUnchanged: unchanged, promptInjectionDetected: false, documentationOnly: false, newTestFileObserved: true }) } });
  try {
    const created = await request<{ mission: AuthoredMission }>(server.url, '/api/missions', await draftFixture(server.url));
    const mission = created.mission; mission.status = 'needs_review'; mission.latestRunId = 'test-engine-port'; server.context.authoring!.repository.save(mission);
    evidence = { run: { id: 'test-engine-port', missionId: mission.id, status: 'succeeded', mode: 'demo', startedAt: '2026-09-12T00:00:00Z', endedAt: '2026-09-12T00:00:01Z', computeBudget: 1, computeUsed: 0 }, events: [], artifact: {
      runId: 'test-engine-port', testEvidenceSource: 'engine', files: [{ path: 'parser.js', diff: '+ bounded change', added: 1, deleted: 0 }],
      dossier: { baseline: { command: 'node --test', total: 1 }, experiments: [{ command: 'node --test', total: 2, passed: 2, failed: 0, exitCode: 0 }], qualityGates: [{ id: 'integrity', status: 'passed', reason: 'Test fixture observation' }], criterionEvidence: [] }, review: { source: 'static', summary: 'Advice', affectedGate: false },
    } };
    await request(server.url, '/api/runs/test-engine-port/review', { decision: 'approve' }, 400);
    unchanged = true;
    const result = await request<{ mission: AuthoredMission }>(server.url, '/api/runs/test-engine-port/review', { decision: 'approve' }); assert.equal(result.mission.status, 'approved');
    await request(server.url, '/api/runs/test-engine-port/review', { decision: 'approve' }, 400);
  } finally { await server.stop(); }
});

test('mission SSE observes local decision and comments are redacted before storage', async () => {
  const server = await startTestServer({ installMissions: false }); const controller = new AbortController();
  try {
    const response = await fetch(`${server.url}/api/missions/review-demo/stream`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(4000)]) });
    assert.equal(response.status, 200); const reader = response.body!.getReader(); const decoder = new TextDecoder();
    assert.match(decoder.decode((await reader.read()).value), /needs_review/);
    await request(server.url, '/api/runs/review-demo-run/review', { decision: 'request_changes', comment: 'Check api_key=synthetic-canary before continuing.' });
    let events = '';
    while (!events.includes('changes_requested')) { const chunk = await reader.read(); assert.equal(chunk.done, false); events += decoder.decode(chunk.value); }
    assert.doesNotMatch(events, /synthetic-canary|api_key/);
    const row = server.context.store.db.prepare('SELECT snapshot FROM authored_review_decisions').get();
    assert.doesNotMatch(String(row?.snapshot), /synthetic-canary/); assert.match(String(row?.snapshot), /REDACTED/);
    await reader.cancel();
  } finally { controller.abort(); await server.stop(); }
});

test('queue readiness follows the injected worker heartbeat independently of execution consent', async () => {
  let heartbeatFresh = false;
  const server = await startTestServer({ installMissions: false, operations: { runDispatchMode: 'queue', workerReady: () => heartbeatFresh } });
  try {
    const degraded = await request<{ db: boolean; workerReady: boolean }>(server.url, '/readyz', undefined, 503); assert.equal(degraded.db, true); assert.equal(degraded.workerReady, false);
    heartbeatFresh = true;
    const ready = await request<{ workerReady: boolean; executionError: string }>(server.url, '/readyz'); assert.equal(ready.workerReady, true); assert.ok(ready.executionError);
    await request(server.url, '/healthz');
  } finally { await server.stop(); }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Assistance } from './authoring/assistance.js';
import { startTestServer } from './test-support/http.js';
import { draftFixture, request } from './test-support/authoring.js';

const configuration = {apiKey: 'sk-synthetic-test-only', model: 'gpt-5-mini', baseUrl: 'https://api.openai.com/v1', api: 'responses' as const};
const fallback = {en: 'Static', 'zh-TW': '靜態'};
const providerResponse = () => Response.json({id: 'resp_test', model: 'gpt-5-mini', status: 'completed', usage: {input_tokens: 21, output_tokens: 12, total_tokens: 33}, output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify({en: 'Inspect the selected issue.', 'zh-TW': '檢視所選議題。'})}]}]});
test('real product endpoint uses Responses, measured usage and concurrent request deduplication', async () => {
  let calls = 0;
  const s = await startTestServer({authoring: {model: configuration, fetcher: async (url, init) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(String(init?.body)); assert.equal(body.store, false); assert.equal(body.text.format.strict, true); assert.equal(body.max_output_tokens, 1024);
    assert.doesNotMatch(body.input, /sk-synthetic/);
    await new Promise(resolve => setTimeout(resolve, 10)); return providerResponse();
  }}});
  try {
    const {analysis} = await draftFixture(s.url);
    const payload = {analysis, issueId: analysis.issues[0]!.id};
    const results = await Promise.all([request<any>(s.url, '/api/campaigns/generate', payload), request<any>(s.url, '/api/campaigns/generate', payload)]);
    assert.equal(calls, 1);
    for (const {draft} of results) { assert.equal(draft.generator, 'openai'); assert.equal(draft.evidence.responseId, 'resp_test'); assert.equal(draft.evidence.usage.totalTokens, 33); }
    assert.equal(s.context.authoring!.assistance.counts.inputTokens, 21);
  } finally { await s.stop(); }
});
test('provider failure is labelled, negative cached, and reset permits recovery', async () => {
  let calls = 0, broken = true;
  const service = new Assistance(configuration, undefined, async () => { calls++; return broken ? new Response('sensitive provider body', {status: 429}) : providerResponse(); });
  const first = await service.explain('issue-triage', {}, fallback);
  assert.equal(first.evidence.generator, 'static'); assert.equal(first.evidence.fallbackReason, 'model_unavailable_or_invalid');
  await service.explain('issue-triage', {}, fallback); assert.equal(calls, 1);
  broken = false; service.clearCache();
  assert.equal((await service.explain('issue-triage', {}, fallback)).evidence.generator, 'openai');
});
test('two active requests cap and hourly budget refuse extra provider work', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const service = new Assistance(configuration, undefined, async () => { await gate; return providerResponse(); });
  const one = service.explain('issue-triage', {id: 1}, fallback);
  const two = service.explain('issue-triage', {id: 2}, fallback);
  assert.equal((await service.explain('issue-triage', {id: 3}, fallback)).evidence.fallbackReason, 'model_budget_limited');
  release(); await Promise.all([one, two]);
  for (let i = 0; i < 118; i++) await service.explain('issue-triage', {unique: i}, fallback);
  assert.equal(service.counts.calls, 120);
  assert.equal((await service.explain('issue-triage', {unique: 999}, fallback)).evidence.fallbackReason, 'model_budget_limited');
});
test('unchanged HTTP reads cause zero projection writes; authoring and external writes invalidate', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nxtcommit-projection-test-'));
  const path = join(dir, 'state.sqlite'); const s = await startTestServer({databasePath: path});
  try {
    await request(s.url, '/api/marketplace');
    const changes = () => Number(s.context.store.db.prepare('SELECT total_changes() AS n').get()!.n);
    const before = changes();
    for (let i = 0; i < 10; i++) await request(s.url, '/api/marketplace');
    assert.equal(changes(), before);
    const pair = await draftFixture(s.url); const {mission} = await request<any>(s.url, '/api/missions', pair);
    assert.match(JSON.stringify(await request(s.url, '/api/marketplace')), new RegExp(mission.id));
    const external = new DatabaseSync(path);
    const row = external.prepare("SELECT snapshot FROM b_records WHERE kind='mission' AND id=?").get(mission.id)!;
    const record = JSON.parse(String(row.snapshot)); record.title.en = 'External worker update';
    external.prepare("UPDATE b_records SET snapshot=? WHERE kind='mission' AND id=?").run(JSON.stringify(record), mission.id); external.close();
    assert.match(JSON.stringify(await request(s.url, '/api/marketplace')), /External worker update/);
    const after = changes(); await request(s.url, '/api/marketplace'); assert.equal(changes(), after);
  } finally { await s.stop(); await rm(dir, {recursive: true, force: true}); }
});
test('protected demo refuses visitor reset and exports consistent operator-only SQLite backup', async () => {
  const token = 'synthetic-operator-token-at-least-24';
  const s = await startTestServer({demoProtection: {token}});
  const dir = await mkdtemp(join(tmpdir(), 'nxtcommit-backup-test-'));
  try {
    const pair = await draftFixture(s.url); const {mission} = await request<any>(s.url, '/api/missions', pair);
    await request(s.url, '/api/demo/reset', {}, 403);
    assert.equal((await fetch(s.url+'/api/demo/backup')).status, 404);
    assert.equal((await request<any>(s.url, '/api/bootstrap')).demoProtected, true);
    const result = await fetch(s.url+'/api/demo/backup', {headers: {Authorization: `Bearer ${token}`}}); assert.equal(result.status, 200);
    const path = join(dir, 'backup.sqlite'); await writeFile(path, Buffer.from(await result.arrayBuffer()));
    const db = new DatabaseSync(path); assert.equal(db.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
    assert.ok(db.prepare("SELECT 1 FROM b_records WHERE kind='mission' AND id=?").get(mission.id)); db.close();
    assert.equal((await fetch(s.url+'/api/demo/reset', {method: 'POST', headers: {Authorization: `Bearer ${token}`}})).status, 200);
    assert.doesNotMatch(JSON.stringify(await request(s.url, '/api/marketplace')), new RegExp(mission.id));
  } finally { await s.stop(); await rm(dir, {recursive: true, force: true}); }
});

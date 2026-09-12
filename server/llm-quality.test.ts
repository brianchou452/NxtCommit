import test from 'node:test';
import assert from 'node:assert/strict';
import { compactFacts, validAdvice } from './authoring/prompts.js';
import { Assistance } from './authoring/assistance.js';
const good = {en: 'Check the selected issue scope.', 'zh-TW': '請確認所選議題的範圍。'};
const config = {apiKey: 'sk-synthetic-test', model: 'gpt-5-mini', baseUrl: 'https://api.openai.com/v1', api: 'responses' as const};
const response = (output: unknown) => Response.json({id: 'resp_quality', model: 'gpt-5-mini', status: 'completed', usage: {input_tokens: 20, output_tokens: 10, total_tokens: 30}, output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(output)}]}]});

test('large evidence retains source and unknown criterion status as valid JSON', () => {
  const result = compactFacts({body: 'x'.repeat(30000), source: 'authored-demo', criteria: [{status: 'unknown', measured: false}], password: 'secret-canary'}) as any;
  assert.equal(result.source, 'authored-demo');
  assert.equal(result.criteria[0].status, 'unknown');
  assert.equal(result.criteria[0].measured, false);
  assert.doesNotMatch(JSON.stringify(result), /secret-canary/);
  assert.ok(JSON.stringify(result).length < 10000);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});
test('invalid bilingual advice is rejected, briefly cached and recovers after expiry', async t => {
  for (const output of [{en: ' ', 'zh-TW': ' '}, {en: 'English', 'zh-TW': 'English'}, {en: 'Tests passed.', 'zh-TW': '測試已通過。'}]) assert.equal(validAdvice(output), false);
  assert.equal(validAdvice(good), true);
  t.mock.timers.enable({apis: ['Date'], now: 100000});
  let calls = 0;
  const service = new Assistance(config, undefined, async () => response(++calls === 1 ? {en: ' ', 'zh-TW': ' '} : good));
  assert.equal((await service.explain('issue-triage', {}, good)).evidence.generator, 'static');
  await service.explain('issue-triage', {}, good); assert.equal(calls, 1);
  t.mock.timers.tick(10001);
  assert.equal((await service.explain('issue-triage', {}, good)).evidence.generator, 'openai');
  assert.equal(calls, 2);
});
test('concurrent and later cache hits retain one trace and accept feedback on the original', async () => {
  let calls = 0, exports = 0, scores = 0;
  const service = new Assistance(config, {trace: async () => {exports++; await new Promise(resolve => setTimeout(resolve, 5)); return true;}, score: async () => {scores++; return true;}}, async () => {calls++; return response(good);});
  const results = await Promise.all([1, 2].map(() => service.explain('issue-triage', {source: 'fixture'}, good)));
  results.push(await service.explain('issue-triage', {source: 'fixture'}, good));
  assert.equal(calls, 1); assert.equal(exports, 1);
  for (const result of results) assert.equal(result.evidence.traceId, results[0]!.evidence.traceId);
  assert.ok(results[0]!.evidence.traceId);
  assert.equal((await service.feedback({traceId: results[2]!.evidence.traceId, feature: 'issue-triage', helpful: true})).recorded, true);
  assert.equal(scores, 1);
});

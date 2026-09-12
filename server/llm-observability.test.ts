import test from 'node:test';
import assert from 'node:assert/strict';
import { authoringConfiguration } from './authoring/configuration.js';
import { Assistance } from './authoring/assistance.js';
import { LangfuseObservations } from './authoring/observations.js';

test('official product configuration uses restricted Responses key and exports measured metadata', async () => {
  const configuration = authoringConfiguration({ OPENAI_API_KEY: 'sk-synthetic-canary' });
  assert.equal(configuration.model?.api, 'responses');
  assert.equal(configuration.model?.model, 'gpt-5-mini');
  const exports: any[] = [];
  const sink = new LangfuseObservations({ baseUrl: 'https://cloud.langfuse.com', publicKey: 'pk-test', secretKey: 'sk-trace-canary' }, async (_url, init) => {
    exports.push(JSON.parse(String(init?.body))); return Response.json({});
  });
  const service = new Assistance(configuration.model, sink, async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.store, false); assert.equal(body.reasoning.effort, 'minimal');
    assert.equal(body.text.format.strict, true); assert.equal(body.temperature, undefined);
    assert.doesNotMatch(body.input, /private-evidence-canary/);
    await new Promise(resolve => setTimeout(resolve, 5));
    return Response.json({ id: 'resp_test', status: 'completed', model: 'gpt-5-mini', usage: { input_tokens: 25, output_tokens: 10, total_tokens: 35 }, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ en: 'Inspect the scope.', 'zh-TW': '檢視範圍。' }) }] }] });
  });
  const result = await service.explain('issue-triage', { password: 'private-evidence-canary' }, { en: 'Static', 'zh-TW': '靜態' });
  assert.equal(result.evidence.generator, 'openai'); assert.equal(result.evidence.responseId, 'resp_test');
  assert.equal(result.evidence.usage?.totalTokens, 35); assert.ok(result.evidence.traceId);
  const span = exports[0].resourceSpans[0].scopeSpans[0].spans[0];
  assert.ok(BigInt(span.endTimeUnixNano) > BigInt(span.startTimeUnixNano));
  const attributes = Object.fromEntries(span.attributes.map((a: any) => [a.key, a.value.stringValue]));
  assert.deepEqual(JSON.parse(attributes['langfuse.observation.usage_details']), { input: 25, output: 10, total: 35 });
  assert.equal(attributes['langfuse.observation.model.name'], 'gpt-5-mini');
  assert.doesNotMatch(JSON.stringify(exports), /private-evidence-canary|sk-synthetic-canary|sk-trace-canary|Inspect the scope/);
});

test('Responses refusal stays labelled fallback and trace failure cannot break advice', async () => {
  const configuration = authoringConfiguration({ OPENAI_API_KEY: 'sk-test' });
  const service = new Assistance(configuration.model, { trace: async () => false, score: async () => false }, async () => Response.json({ id: 'resp_refusal', status: 'completed', output: [] }));
  const result = await service.explain('shadow-review', {}, { en: 'Static', 'zh-TW': '靜態' });
  assert.equal(result.evidence.generator, 'static'); assert.equal(result.affectedGate, false);
  assert.equal(result.evidence.usage, undefined); assert.equal(service.counts.exportFailure, 1);
});

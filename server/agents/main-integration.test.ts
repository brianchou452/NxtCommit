import test from 'node:test';
import assert from 'node:assert/strict';
import { Assistance } from '../authoring/assistance.js';

const configuration = {
  apiKey: 'sk-synthetic-merge-test',
  model: 'gpt-5-mini',
  baseUrl: 'https://api.openai.com/v1',
  api: 'responses' as const,
};
const fallback = { en: 'Inspect the evidence.', 'zh-TW': '檢視證據。' };
const response = (usage: unknown, status = 'completed') =>
  Response.json({
    id: 'resp_integration',
    status,
    model: configuration.model,
    usage,
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(fallback) }] }],
  });

test('agent cancellation interrupts a deduplicated Responses request without fallback or export', async () => {
  const abort = new AbortController();
  let calls = 0,
    exports = 0;
  const assistance = new Assistance(
    configuration,
    {
      async trace() {
        exports++;
        return true;
      },
      async score() {
        return false;
      },
    },
    async (_url, init) => {
      calls++;
      return new Promise<Response>((_resolve, reject) => {
        init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true });
      });
    },
    abort.signal,
  );
  const one = assistance.explain('chaos-planner', {}, fallback);
  const two = assistance.explain('chaos-planner', {}, fallback);
  const results = Promise.allSettled([one, two]);
  abort.abort();
  for (const result of await results) {
    assert.equal(result.status, 'rejected');
    if (result.status === 'rejected') assert.equal(result.reason.name, 'AbortError');
  }
  assert.equal(calls, 1);
  assert.equal(assistance.counts.fallback, 0);
  assert.equal(exports, 0);
  await assert.rejects(assistance.explain('experiment-review', {}, fallback), { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('Responses invalid usage stays unknown and incomplete advice cannot become model evidence', async () => {
  for (const usage of [
    undefined,
    { input_tokens: -1, output_tokens: 2, total_tokens: 1 },
    { input_tokens: 1.5, output_tokens: 2, total_tokens: 3.5 },
  ]) {
    const assistance = new Assistance(configuration, undefined, async () => response(usage));
    const result = await assistance.explain('experiment-review', {}, fallback);
    assert.equal(result.evidence.generator, 'openai');
    assert.equal(result.evidence.usage, null);
    assert.equal(assistance.counts.unknownUsage, 1);
    assert.equal(assistance.counts.inputTokens, 0);
  }
  const assistance = new Assistance(configuration, undefined, async () => response(undefined, 'incomplete'));
  assert.equal((await assistance.explain('chaos-planner', {}, fallback)).evidence.generator, 'static');
});

test('Responses error and oversized streams are released at the merged agent boundary', async () => {
  for (const status of [429, 200]) {
    let cancelled = false;
    const assistance = new Assistance(
      configuration,
      undefined,
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              if (status === 200) controller.enqueue(new TextEncoder().encode('x'.repeat(33_000)));
            },
            cancel() {
              cancelled = true;
            },
          }),
          { status },
        ),
    );
    const result = await assistance.explain('chaos-planner', {}, fallback);
    assert.equal(result.evidence.fallbackReason, 'model_unavailable_or_invalid');
    assert.equal(cancelled, true);
  }
});

test('chat-completions deduplication counts measured tokens and exports once', async () => {
  let calls = 0,
    exports = 0;
  const assistance = new Assistance(
    { ...configuration, api: 'chat-completions' },
    {
      async trace(record) {
        exports++;
        assert.equal(record.usage?.totalTokens, 11);
        return true;
      },
      async score() {
        return false;
      },
    },
    async () => {
      calls++;
      return Response.json({
        choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(fallback) } }],
        usage: { prompt_tokens: 5, completion_tokens: 6, total_tokens: 11 },
      });
    },
  );
  const results = await Promise.all([
    assistance.explain('issue-triage', {}, fallback),
    assistance.explain('issue-triage', {}, fallback),
  ]);
  assert.equal(calls, 1);
  assert.equal(exports, 1);
  assert.equal(assistance.counts.inputTokens, 5);
  assert.equal(assistance.counts.outputTokens, 6);
  assert.equal(assistance.counts.unknownUsage, 0);
  assert.equal(results.filter((result) => result.evidence.cached).length, 1);
});

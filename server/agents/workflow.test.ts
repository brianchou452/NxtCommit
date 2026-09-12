import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { workflow } from './workflow.js';
import { AgentTrace } from './telemetry.js';

test('SQLite checkpoints resume failed stages across saver reopen, without repeating completed work', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'agent-graph-'));
  let proposals = 0,
    checks = 0,
    promotions = 0;
  const config = {
    database: join(directory, 'checkpoint.sqlite'),
    runId: 'recovery',
    identity: 'source-v1',
    trace: new AgentTrace('self-update', 'recovery'),
    stages: [
      {
        name: 'propose',
        run: async () => {
          proposals++;
        },
      },
      {
        name: 'verify',
        run: async () => {
          if (++checks === 1) throw Error('sk-SYNTHETIC_DO_NOT_PERSIST_123456789');
        },
      },
      {
        name: 'promote',
        run: async () => {
          promotions++;
          return 'promoted';
        },
      },
    ],
  };
  try {
    await assert.rejects(workflow(config), /stage_failed/);
    assert.equal(readFileSync(config.database).includes(Buffer.from('sk-SYNTHETIC')), false);
    await assert.rejects(
      workflow({ ...config, resume: true, identity: 'source-v2' }),
      /checkpoint_identity_mismatch/,
    );
    assert.equal(await workflow({ ...config, resume: true }), 'promoted');
    assert.deepEqual([proposals, checks, promotions], [1, 2, 1]);
    assert.equal(await workflow({ ...config, resume: true }), 'promoted');
    assert.deepEqual([proposals, checks, promotions], [1, 2, 1]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test('a revoked epoch cancels a resumed graph before its next side effect', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'agent-freeze-'));
  let allowed = true,
    calls = 0;
  const config = {
    database: join(directory, 'checkpoint.sqlite'),
    runId: 'freeze',
    identity: 'v1',
    trace: new AgentTrace('self-update', 'freeze'),
    allowed: () => allowed,
    stages: [
      {
        name: 'model',
        run: async () => {
          calls++;
          throw Error('offline');
        },
      },
    ],
  };
  try {
    await assert.rejects(workflow(config));
    allowed = false;
    assert.equal(await workflow({ ...config, resume: true }), 'cancelled');
    assert.equal(calls, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('actual trace envelopes exclude raw source, errors, keys and unmeasured usage; unavailable exporter is advisory', async () => {
  const previous = { ...process.env };
  const bodies: string[] = [];
  process.env.AGENT_TRACING_ENABLED = 'true';
  process.env.LANGFUSE_BASE_URL = 'http://127.0.0.1:4310';
  process.env.LANGFUSE_PUBLIC_KEY = 'synthetic-public';
  process.env.LANGFUSE_SECRET_KEY = 'synthetic-secret';
  const trace = new AgentTrace('self-update', 'synthetic-run', async (_url, init) => {
    bodies.push(String(init?.body));
    return new Response('{}', { status: 200 });
  });
  try {
    await trace.stage(
      'proposal',
      async () => ({ raw: 'sk-SYNTHETIC_SECRET_123456789', source: 'private source' }),
      () => ({ generator: 'openai', model: 'gpt-5-mini', inputTokens: 12, outputTokens: 3 }),
    );
    await assert.rejects(
      trace.stage('verify', async () => {
        throw Error('private error');
      }),
    );
    assert.equal(await trace.flush('failed'), true);
    assert.doesNotMatch(bodies[0]!, /SYNTHETIC_SECRET|private source|private error|synthetic-secret/);
    const spans = JSON.parse(bodies[0]!).resourceSpans[0].scopeSpans[0].spans;
    assert.equal(spans.length, 3);
    assert.equal(spans[1].parentSpanId, spans[0].spanId);
    assert.ok(
      spans[1].attributes.some((a: { key: string }) => a.key === 'langfuse.observation.usage_details'),
    );
    assert.ok(
      !spans[2].attributes.some((a: { key: string }) => a.key === 'langfuse.observation.usage_details'),
    );
    const unavailable = new AgentTrace('experiment', 'failure', async () => {
      throw Error('network');
    });
    assert.equal(await unavailable.stage('gate', async () => 42), 42);
    assert.equal(await unavailable.flush('completed'), false);
    const rejected = new AgentTrace(
      'experiment',
      'partial',
      async () => new Response('{"partialSuccess":{"rejectedSpans":1}}'),
    );
    assert.equal(await rejected.flush('completed'), false);
  } finally {
    for (const key of [
      'AGENT_TRACING_ENABLED',
      'LANGFUSE_BASE_URL',
      'LANGFUSE_PUBLIC_KEY',
      'LANGFUSE_SECRET_KEY',
    ]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('provider usage is preserved only when complete and nonnegative', async () => {
  const { Assistance } = await import('../authoring/assistance.js');
  const fallback = { en: 'Consider recovery.', 'zh-TW': '考慮復原方式。' };
  for (const usage of [
    { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 },
    { prompt_tokens: -1, completion_tokens: 7, total_tokens: 6 },
    undefined,
  ]) {
    const agent = new Assistance(
      { model: 'controlled', apiKey: 'synthetic', baseUrl: 'https://api.openai.com/v1' },
      undefined,
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify(fallback) } }], usage }),
        ),
    );
    const result = await agent.explain('chaos-planner', {}, fallback);
    assert.equal(result.evidence.generator, 'openai');
    assert.deepEqual(
      result.evidence.usage,
      usage?.prompt_tokens === 5 ? { inputTokens: 5, outputTokens: 7, totalTokens: 12 } : undefined,
    );
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { ChaosAgent, scenarioIds } from './chaos.js';
import { ExperimentAgent, assess } from './experiment.js';
import { Assistance } from '../authoring/assistance.js';

for (const scenario of scenarioIds) {
  test(`chaos: ${scenario} reaches a measured safe outcome`, async () => {
    const result = await new ChaosAgent().execute(scenario, 0);
    assert.equal(result.passed, true, JSON.stringify(result));
    assert.ok(Object.keys(result.checks).length > 0);
  });
}
test('experiment records all repetitions, preserves reproducibility, and refuses automatic promotion', async () => {
  const agent = new ExperimentAgent();
  const first = await agent.run({ seed: 10, repetitions: 1 });
  const second = await agent.run({ seed: 10, repetitions: 1, baseline: first });
  assert.equal(second.summary.total, scenarioIds.length);
  assert.equal(second.summary.failed, 0);
  assert.equal(second.promotionApproved, false);
  assert.equal(second.comparison.comparable, true);
  assert.deepEqual(
    first.measurements.map((r) => r.scenario),
    second.measurements.map((r) => r.scenario),
  );
  const failure = structuredClone(first.measurements);
  failure[0]!.passed = false;
  failure[0]!.checks['controlledFailure'] = false;
  const comparison = assess(failure, first);
  assert.deepEqual(comparison.regressions, [failure[0]!.scenario]);
  assert.equal(assess(failure, { ...first, catalogVersion: 'other' }).comparable, false);
  assert.equal(assess(failure, { ...first, repetitions: 2 }).comparable, false);
});
test('a broken scenario blocks the experiment and creates an actionable backlog', async () => {
  const broken = new ChaosAgent();
  broken.execute = async (scenario, repetition) => ({
    scenario,
    repetition,
    passed: false,
    durationMs: 0,
    checks: { invariant: false },
  });
  const result = await new ExperimentAgent(broken).run({ repetitions: 1 });
  assert.equal(result.decision, 'blocked');
  assert.equal(result.backlog.length, scenarioIds.length);
  assert.deepEqual(result.backlog[0]!.failedChecks, ['invariant']);
});
test('model advice is a bounded two-role handoff and cannot override a deterministic failure', async () => {
  let calls = 0;
  const assistance = new Assistance(
    { baseUrl: 'https://model.invalid/v1', apiKey: 'synthetic', model: 'controlled' },
    undefined,
    async () => {
      calls++;
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                en: 'Recommend investigating the next case.',
                'zh-TW': '建議調查下一個案例。',
              }),
            },
          },
        ],
      });
    },
  );
  const broken = new ChaosAgent();
  broken.execute = async (scenario, repetition) => ({
    scenario,
    repetition,
    passed: false,
    durationMs: 0,
    checks: { invariant: false },
  });
  const result = await new ExperimentAgent(broken).run({ assistance, repetitions: 1 });
  assert.equal(calls, 2);
  assert.equal(result.decision, 'blocked');
  assert.equal(result.promotionApproved, false);
  assert.equal(result.advice?.chaos.affectedGate, false);
  assert.equal(result.advice?.experiment.affectedGate, false);
  assert.equal(result.roles.chaos, 'model-assisted');
  assert.equal(result.roles.experiment, 'model-assisted');
});
test('unavailable AI preserves deterministic experiments with explicit fallback', async () => {
  const assistance = new Assistance(
    { baseUrl: 'https://model.invalid/v1', apiKey: 'synthetic', model: 'controlled' },
    undefined,
    async () => {
      throw new Error('unavailable');
    },
  );
  const result = await new ExperimentAgent().run({ assistance, repetitions: 1 });
  assert.equal(result.decision, 'checks-passed');
  assert.equal(result.roles.chaos, 'deterministic');
  assert.equal(result.advice?.experiment.evidence.fallbackReason, 'model_unavailable_or_invalid');
});
test('invalid experiment budgets fail before work starts', async () => {
  for (const repetitions of [0, 11, NaN, 1.5])
    await assert.rejects(new ExperimentAgent().run({ repetitions }));
  for (const seed of [-1, Infinity, 1.5]) await assert.rejects(new ExperimentAgent().run({ seed }));
});
test('GPT-5 mini uses compatible bounded completion parameters without temperature', async () => {
  let payload: Record<string, unknown> = {};
  const assistance = new Assistance(
    { baseUrl: 'https://model.invalid/v1', apiKey: 'synthetic', model: 'gpt-5-mini' },
    undefined,
    async (_url, init) => {
      payload = JSON.parse(String(init?.body));
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({ en: 'Consider failure recovery.', 'zh-TW': '請考量失敗復原。' }),
            },
          },
        ],
      });
    },
  );
  const result = await assistance.validate();
  assert.equal(result.ok, true);
  assert.equal(payload.max_completion_tokens, 2400);
  assert.equal(payload.reasoning_effort, 'low');
  assert.equal(payload.store, false);
  assert.equal('temperature' in payload, false);
  assert.equal('max_tokens' in payload, false);
});

test('an unknown chaos scenario or invalid repetition is refused before any fault', async () => {
  await assert.rejects(new ChaosAgent().execute('unknown' as never, 0), /invalid_scenario/);
  await assert.rejects(new ChaosAgent().execute('healthy-model', -1), /invalid_scenario/);
});
test('duplicate, empty or inconsistent measurement coverage cannot be compared', async () => {
  const report = await new ExperimentAgent().run({ repetitions: 2 });
  const duplicate = structuredClone(report.measurements);
  duplicate[duplicate.length - 1] = duplicate[0]!;
  assert.equal(assess(duplicate, report).comparable, false);
  const forged = structuredClone(report.measurements);
  forged[0]!.checks = {};
  assert.equal(assess(forged, report).comparable, false);
});
test('caller cancellation reaches model transport without producing advisory fallback', async () => {
  const abort = new AbortController();
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const agent = new Assistance(
    { baseUrl: 'https://model.invalid/v1', apiKey: 'synthetic', model: 'controlled' },
    undefined,
    async (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        started();
        init!.signal!.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')), {
          once: true,
        });
      }),
    abort.signal,
  );
  const result = agent.explain('chaos-planner', {}, { en: 'Inspect evidence.', 'zh-TW': '檢查證據。' });
  await ready;
  abort.abort();
  await assert.rejects(result, { name: 'AbortError' });
  assert.equal(agent.counts.fallback, 0);
});
test('experiment resumes persisted cases and does not rerun its completed prefix', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { randomUUID } = await import('node:crypto');
  const root = mkdtempSync(join(tmpdir(), 'experiment-resume-')),
    runId = randomUUID(),
    abort = new AbortController();
  const calls: string[] = [];
  const interrupted = new ChaosAgent();
  interrupted.execute = async (scenario, repetition) => {
    if (calls.length === 2) {
      abort.abort();
      throw new DOMException('cancelled', 'AbortError');
    }
    calls.push(scenario);
    return { scenario, repetition, passed: true, checks: { observed: true }, durationMs: 1 };
  };
  const runtime = { directory: root, identity: 'controlled-source', runId };
  try {
    await assert.rejects(
      new ExperimentAgent(interrupted).run({ runtime, signal: abort.signal, repetitions: 1 }),
    );
    const continuation = new ChaosAgent();
    continuation.execute = async (scenario, repetition) => {
      calls.push(scenario);
      return { scenario, repetition, passed: true, checks: { observed: true }, durationMs: 1 };
    };
    const report = await new ExperimentAgent(continuation).run({
      runtime: { ...runtime, resume: true },
      repetitions: 1,
    });
    assert.equal(report.decision, 'checks-passed');
    assert.equal(calls.length, scenarioIds.length);
    assert.equal(new Set(calls).size, scenarioIds.length);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

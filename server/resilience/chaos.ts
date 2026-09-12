import { Assistance } from '../authoring/assistance.js';
import type { ModelConfiguration, ObservationSink } from '../authoring/assistance.js';
import { createApplication } from '../app.js';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

export const catalogVersion = 'nxtcommit-chaos-v1';
export const fallback = { en: 'Inspect the observed evidence; unresolved questions remain open.', 'zh-TW': '請檢視觀察到的證據；未解問題仍需確認。' };
const canary = 'sk-SYNTHETIC_CHAOS_CANARY_000000000';
const configuration: ModelConfiguration = { baseUrl: 'https://model.invalid/v1', apiKey: canary, model: 'controlled-fixture' };
export const scenarioIds = ['healthy-model', 'rate-limit', 'provider-unavailable', 'timeout', 'invalid-json', 'oversized-response', 'wrong-schema', 'blank-advice', 'secret-output', 'unsupported-claim', 'trace-unavailable', 'trace-containment', 'malformed-request', 'oversized-request', 'reset-revokes-capability', 'database-unavailable', 'worker-recovery'] as const;
export type ScenarioId = typeof scenarioIds[number];
export interface Measurement { scenario: ScenarioId; repetition: number; passed: boolean; durationMs: number; checks: Record<string, boolean>; error?: 'scenario_exception' }

async function modelScenario(id: ScenarioId): Promise<Record<string, boolean>> {
  let cancelled = false;
  let boundedInput = false;
  let traceClean = false;
  let traceSeen = false;
  let calls = 0;
  const transport: typeof fetch = async (_url, init) => {
    calls++;
    boundedInput = !String(init?.body).includes(canary) && init?.redirect === 'error' && Boolean(init.signal);
    if (id === 'timeout') throw new DOMException('Synthetic timeout', 'TimeoutError');
    if (id === 'rate-limit' || id === 'provider-unavailable') {
      return new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: id === 'rate-limit' ? 429 : 503 });
    }
    if (id === 'invalid-json') return new Response('{');
    if (id === 'oversized-response') return new Response('x'.repeat(33_000));
    const answer = id === 'wrong-schema' ? { en: 'Only one language' } :
      id === 'blank-advice' ? { en: '  ', 'zh-TW': '\n' } :
      id === 'secret-output' ? { en: canary, 'zh-TW': canary } :
      id === 'unsupported-claim' ? { en: 'All tests passed and merged.', 'zh-TW': '測試已通過，已合併。' } : fallback;
    return Response.json({ choices: [{ message: { content: JSON.stringify(answer) } }], usage: { prompt_tokens: 5, completion_tokens: 6, total_tokens: 11 } });
  };
  const sink: ObservationSink = {
    async trace(record) {
      traceSeen = true;
      traceClean = !JSON.stringify(record).includes(canary) && !JSON.stringify(record).includes('PRIVATE_EVIDENCE');
      if (id === 'trace-unavailable') throw new Error('Synthetic sink failure');
      return true;
    },
    async score() { return false; },
  };
  const assistance = new Assistance(configuration, sink, transport);
  const facts = { note: 'PRIVATE_EVIDENCE', apiKey: canary, evidence: canary, affectedGate: false };
  const before = JSON.stringify(facts);
  const result = await assistance.explain('issue-triage', facts, fallback);
  const expectModel = ['healthy-model', 'trace-unavailable', 'trace-containment'].includes(id);
  return {
    expectedGenerator: result.evidence.generator === (expectModel ? 'openai' : 'static'),
    labelledFallback: expectModel || result.evidence.fallbackReason === 'model_unavailable_or_invalid',
    unchangedEvidence: JSON.stringify(facts) === before && result.affectedGate === false,
    boundedCallCount: calls === 1,
    inputRedacted: boundedInput,
    outputRedacted: !JSON.stringify(result).includes(canary),
    traceContained: traceSeen && traceClean,
    exportFailureVisible: id !== 'trace-unavailable' || assistance.counts.exportFailure === 1,
    responseReleased: !['rate-limit', 'provider-unavailable'].includes(id) || cancelled,
  };
}

async function applicationScenario(id: ScenarioId): Promise<Record<string, boolean>> {
  let workerReady = false;
  const application = createApplication({ configuredMode: 'demo', operations: { runDispatchMode: 'queue', workerReady: () => workerReady } });
  const server = application.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown) => fetch(`${url}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(3000) });
  try {
    if (id === 'malformed-request' || id === 'oversized-request') {
      const response = await fetch(`${url}/api/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: id === 'malformed-request' ? '{' : JSON.stringify({ data: 'x'.repeat(40_000) }), signal: AbortSignal.timeout(3000) });
      const body = await response.json() as { code: string };
      return { rejected: response.status === (id === 'malformed-request' ? 400 : 413), stableError: body.code === (id === 'malformed-request' ? 'invalid_json' : 'request_too_large') };
    }
    if (id === 'reset-revokes-capability') {
      const { analysis } = await (await post('/api/analyze', { source: 'fixture' })).json() as { analysis: { serverToken: string; issues: Array<{ id: string }> } };
      const response = await post('/api/demo/reset', {}); await response.arrayBuffer();
      const stale = await post('/api/analysis/assist', { analysis, issueId: analysis.issues[0]!.id }); await stale.arrayBuffer();
      const fresh = await post('/api/analyze', { source: 'fixture' }); await fresh.arrayBuffer();
      return { resetCompleted: response.ok, staleRejected: stale.status === 400, recovered: fresh.ok };
    }
    if (id === 'database-unavailable') {
      workerReady = true;
      application.context.store.db.exec('DROP TABLE authored_demo_evidence; DROP TABLE authored_review_decisions; DROP TABLE authored_missions');
    }
    const degraded = await fetch(`${url}/readyz`, { signal: AbortSignal.timeout(3000) });
    const readiness = await degraded.json() as { db: boolean; workerReady: boolean };
    const health = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(3000) }); await health.arrayBuffer();
    if (id === 'worker-recovery') {
      workerReady = true;
      const recovered = await fetch(`${url}/readyz`, { signal: AbortSignal.timeout(3000) }); await recovered.arrayBuffer();
      return { degraded: degraded.status === 503, livenessIndependent: health.ok, recovered: recovered.ok };
    }
    return { degraded: degraded.status === 503, databaseFailureObserved: readiness.db === false, workerStillReady: readiness.workerReady === true, livenessIndependent: health.ok };
  } finally {
    const closed = new Promise<void>(resolve => server.close(() => resolve())); server.closeAllConnections(); await closed; application.close();
  }
}

/** Faults are capabilities of private transports/databases, never production routes. */
export class ChaosAgent {
  async execute(scenario: ScenarioId, repetition: number): Promise<Measurement> {
    const start = performance.now();
    try {
      const checks = scenarioIds.indexOf(scenario) < 12 ? await modelScenario(scenario) : await applicationScenario(scenario);
      return { scenario, repetition, passed: Object.values(checks).every(Boolean), checks, durationMs: Math.round(performance.now() - start) };
    } catch {
      return { scenario, repetition, passed: false, checks: {}, durationMs: Math.round(performance.now() - start), error: 'scenario_exception' };
    }
  }
}

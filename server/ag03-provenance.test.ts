import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { ExecutionActivity } from '../src/components/ExecutionActivity.js';
import { MissionOverview } from '../src/components/MissionOverview.js';
import { renderMissionComponent } from './spec-tests/mission-ui.js';
import { createApplication } from './app.js';
import { installMissionServices } from './services/mission-services.js';
import type { ExecutionEvent, RunSummary } from '../shared/execution.js';
import { redactEvidence } from './domain/mission.js';
import type { JsonValue } from '../shared/primitives.js';

/**
 * Spec: component.execution-activity
 * Scenario: activity-renders-event-payload-union
 * Given Environment file-change test-result diff guard budget and terminal events exist for one run.
 * When Their details are expanded.
 * Then Each bounded payload renders its typed facts while source verified state secrets and unknown fields retain their boundaries.
 */
test('component.execution-activity / activity-renders-event-payload-union', () => {
  const run: RunSummary = { id: 'run', missionId: 'mission', mode: 'demo', status: 'succeeded', computeBudget: 100, computeUsed: 5, startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T00:00:01Z' };
  const facts: Record<string, JsonValue> = {
    environment: { runtime: 'node', osIsolated: false },
    'file-change': { path: 'src/retry.ts', added: 4, deleted: 1 },
    'test-result': { command: 'node --test', passed: 3, failed: 0, total: 3, exitCode: 0 },
    diff: { diff: '+ bounded change', output: redactEvidence('token=fixture-only-sensitive <script>untrusted</script>') },
    guard: { status: 'unknown', reason: 'No measured OS isolation' },
    accounting: { consumed: 5, refunded: 95 }, terminal: { status: 'succeeded', endedAt: run.endedAt },
  };
  const events: ExecutionEvent[] = Object.entries(facts).map(([type, facts], seq) => ({ id: String(seq), missionId: 'mission', runId: 'run', type, seq, ts: run.endedAt, source: 'engine', verified: true, computeDelta: 0, payload: { detail: `bounded-${type}`, facts } }));
  const html = renderMissionComponent(createElement(ExecutionActivity, { run, events }));
  for (const event of events) assert.ok(html.includes(`bounded-${event.type}`));
  assert.ok(html.includes('Engine verified')); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('running-pulse'));
  for (const value of ['src/retry.ts', 'node --test', 'No measured OS isolation', 'unknown', '[REDACTED]', 'refunded']) assert.ok(html.includes(value));
  assert.ok(!html.includes('fixture-only-sensitive'));
});

/**
 * Spec: component.mission-overview
 * Scenario: overview-keeps-unknown-measurements-absent
 * Given Project popularity adoption or impact was not measured.
 * When Overview and explanation render.
 * Then Unknown values remain absent or explicitly unknown and demo literals never appear as observed facts.
 */
test('component.mission-overview / overview-keeps-unknown-measurements-absent', async () => {
  const app = createApplication();
  try {
    const mission = installMissionServices(app.context).getMission('mission-fixture');
    const html = renderMissionComponent(createElement(MissionOverview, { mission }));
    assert.ok(html.includes('Generator: demo')); assert.ok(html.includes('Data: demo'));
    assert.ok(!html.includes('weekly downloads')); assert.ok(!html.includes('health score')); assert.ok(html.includes('not money'));
  } finally { await app.close(); }
});

/**
 * Spec: page.mission-detail
 * Scenario: mission-detail-refuses-metadata-only-execution
 * Given A fully funded mission was created from public GitHub metadata without a bundled fixture workspace.
 * When Its campaign detail renders.
 * Then It explains the execution boundary and exposes no execute action regardless of credentials or client-supplied mode.
 */
// Docker UI acceptance: e2e/mission-execution.e2e.spec.ts,
// "metadata refuses execution and missing route cannot retain campaign".

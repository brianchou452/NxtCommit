import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionServer } from './mission-test-support.js';

/**
 * Spec: api.live-activity
 * Scenario: live-activity-route
 * Given Zero or more runs may be active.
 * When The snapshot is requested.
 * Then Only current run evidence is returned and empty means idle.
 */
test('api.live-activity / live-activity-route', async () => { const app = await missionServer(); try { assert.deepEqual((await app.json('/live')).body.activities, []); } finally { await app.stop(); } });

/**
 * Spec: api.mission-cancel
 * Scenario: public-cancel-refused
 * Given No authentication or mission-scoped RBAC exists.
 * When Any caller posts cancellation.
 * Then The response is 403 auth_required and no client identity bypass is accepted.
 */
test('api.mission-cancel / public-cancel-refused', async () => { const app = await missionServer(); try { const result = await app.json('/missions/mission-ready/cancel', { role: 'maintainer' }); assert.equal(result.status, 403); assert.equal(result.body.code, 'auth_required'); } finally { await app.stop(); } });

/**
 * Spec: api.mission-detail
 * Scenario: mission-detail-route
 * Given A caller has a mission id.
 * When GET mission detail is requested.
 * Then The route returns the matching aggregate or 404 without inventing optional evidence.
 */
test('api.mission-detail / mission-detail-route', async () => { const app = await missionServer(); try { const result = await app.json('/missions/mission-fixture'); assert.equal(result.body.id, 'mission-fixture'); assert.equal(result.body.artifact, undefined); assert.equal((await app.json('/missions/missing')).status, 404); } finally { await app.stop(); } });

/**
 * Spec: api.mission-events
 * Scenario: mission-events-route
 * Given A mission may have zero or more runs.
 * When Stored events are requested.
 * Then Only events for its latest or explicitly owned run are returned.
 */
test('api.mission-events / mission-events-route', async () => { const app = await missionServer(); try { assert.deepEqual((await app.json('/missions/mission-fixture/events')).body.events, []); assert.equal((await app.json('/missions/mission-fixture/events?runId=seed-terminal-run')).status, 404); } finally { await app.stop(); } });

/**
 * Spec: api.mission-execute
 * Scenario: execute-dispatch-union
 * Given An eligible bundled fixture mission is ready.
 * When Execution is requested.
 * Then Inline returns 200 with a run while queue returns 202 with a request and neither path executes imported GitHub code.
 */
test('api.mission-execute / execute-dispatch-union', async () => { for (const dispatchMode of ['inline', 'queue'] as const) { const app = await missionServer({ dispatchMode, autoWorker: false }); try { const result = await app.json('/missions/mission-ready/execute', {}); assert.equal(result.body.dispatch, dispatchMode); assert.equal(result.status, dispatchMode === 'inline' ? 200 : 202); assert.equal((await app.json('/missions/mission-metadata/execute', {})).status, 400); if (dispatchMode === 'inline') assert.equal((await app.terminal(result.body.run.id)).run.status, 'succeeded'); else { await app.service.workOnce('scenario-worker'); const request = app.service.request(result.body.request.id); assert.equal(request.status, 'completed'); assert.ok(request.resultRunId); } } finally { await app.stop(); } } });

/**
 * Spec: api.mission-pledge
 * Scenario: pledge-intent-is-atomic
 * Given A local persona has sufficient credits and a retry-stable key.
 * When The same pledge intent is submitted more than once.
 * Then Wallet, pledge and ledger effects occur once and a conflicting body is rejected.
 */
test('api.mission-pledge / pledge-intent-is-atomic', async () => { const app = await missionServer(); try { const key = { 'Idempotency-Key': 'bdd-intent' }; const first = await app.json('/missions/mission-fixture/pledge', { amount: 5 }, key); assert.deepEqual((await app.json('/missions/mission-fixture/pledge', { amount: 5 }, key)).body, first.body); assert.equal((await app.json('/missions/mission-fixture/pledge', { amount: 6 }, key)).status, 409); assert.equal(app.service.getMission('mission-fixture').pledges.length, 1); } finally { await app.stop(); } });

/**
 * Spec: api.mission-run-request
 * Scenario: latest-mission-request-route
 * Given A valid mission may not have queued work.
 * When Its latest request is fetched.
 * Then The response distinguishes null from a missing mission.
 */
test('api.mission-run-request / latest-mission-request-route', async () => { const app = await missionServer(); try { assert.equal((await app.json('/missions/mission-fixture/run-request')).body.request, null); assert.equal((await app.json('/missions/missing/run-request')).status, 404); } finally { await app.stop(); } });

/**
 * Spec: api.mission-stream
 * Scenario: mission-stream-route
 * Given A mission view needs current updates.
 * When It opens the scoped SSE endpoint.
 * Then The server exposes the mission stream and clients revalidate after reconnect.
 */
test('api.mission-stream / mission-stream-route', async () => { const app = await missionServer(); const controller = new AbortController(); try { const response = await fetch(app.url + '/api/missions/mission-fixture/stream', { signal: controller.signal }); assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/); const frame = await response.body!.getReader().read(); assert.match(new TextDecoder().decode(frame.value), /revalidate REST/); } finally { controller.abort(); await app.stop(); } });

/**
 * Spec: api.run-detail
 * Scenario: run-detail-route
 * Given A run may be active, terminal or absent.
 * When Its detail is requested.
 * Then Matching ordered evidence is returned without manufacturing an artifact.
 */
test('api.run-detail / run-detail-route', async () => { const app = await missionServer(); try { const result = await app.json('/runs/seed-terminal-run'); assert.equal(result.body.run.id, 'seed-terminal-run'); assert.equal(result.body.events[0].source, 'demo'); assert.equal(result.body.events[0].verified, false); assert.equal((await app.json('/runs/missing')).status, 404); } finally { await app.stop(); } });

/**
 * Spec: api.run-request
 * Scenario: run-request-route
 * Given Queue dispatch may have created a request.
 * When Its public status is fetched.
 * Then The route returns sanitized status or 404.
 */
test('api.run-request / run-request-route', async () => { const app = await missionServer({ dispatchMode: 'queue', autoWorker: false }); try { const dispatch = await app.json('/missions/mission-ready/execute', {}); const request = (await app.json('/run-requests/' + dispatch.body.request.id)).body.request; assert.equal(request.status, 'queued'); assert.equal(request.leaseOwner, undefined); assert.equal((await app.json('/run-requests/missing')).status, 404); } finally { await app.stop(); } });

/**
 * Spec: component.execution-activity
 * Scenario: activity-never-invents-work
 * Given REST history and SSE may overlap or be empty.
 * When Events are merged.
 * Then IDs deduplicate order remains stable and empty state shows no fabricated activity.
 */
// Executable component merge regression: server/ui01-controls.test.ts.
// Docker idle/queue journeys: e2e/mission-execution.e2e.spec.ts.

/**
 * Spec: component.mission-overview
 * Scenario: overview-keeps-provenance-with-claims
 * Given Mission and optional generated explanation are available.
 * When Overview renders.
 * Then Status generator dataMode and missing measurements remain distinguishable.
 */
// Executable component rendering: server/ag03-provenance.test.ts.

/**
 * Spec: component.pledge-dialog
 * Scenario: retry-preserves-pledge-intent
 * Given A pledge request may fail after submission.
 * When User retries without changing intent.
 * Then The same idempotency key and amount are reused and credits remain labelled prototype units.
 */
// Docker UI test: e2e/mission-execution.e2e.spec.ts — lost-response retry uses identical key/body.

/**
 * Spec: page.execution-room
 * Scenario: execution-room-preserves-event-authority
 * Given A run may be idle queued running or terminal.
 * When REST and SSE evidence are combined.
 * Then Events remain ordered and source-labelled while empty state stays honest.
 */
// Docker UI tests: e2e/mission-execution.e2e.spec.ts — terminal/reload, queue, and failed-run retry.

/**
 * Spec: page.mission-detail
 * Scenario: mission-detail-actions-follow-state
 * Given A mission can be funding executing reviewable or released.
 * When Its detail renders and updates arrive.
 * Then Only lifecycle-valid actions appear and every generated or demo fact retains provenance.
 */
// Docker UI test: e2e/mission-execution.e2e.spec.ts — funding → engine terminal → review navigation.

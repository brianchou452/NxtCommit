import assert from 'node:assert/strict';
import { startTestServer } from './http.js';
import type { RepoAnalysis, CampaignDraft, AuthoredMission } from '../../shared/authoring.js';
export async function request<T>(url: string, path: string, body?: unknown, status = 200): Promise<T> {
  const response = await fetch(`${url}${path}`, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(response.status, status, `${path} HTTP status`);
  return response.json() as Promise<T>;
}
export async function draftFixture(url: string) {
  const { analysis } = await request<{ analysis: RepoAnalysis }>(url, '/api/analyze', { source: 'fixture' });
  const { draft } = await request<{ draft: CampaignDraft }>(url, '/api/campaigns/generate', { analysis, issueId: analysis.issues[0]!.id, mode: 'demo' });
  return { analysis, draft };
}
export async function withAuthoring(run: (server: Awaited<ReturnType<typeof startTestServer>>) => Promise<void>) {
  const server = await startTestServer({ installMissions: false }); try { await run(server); } finally { await server.stop(); }
}
export const authoringCases: Record<string, () => Promise<void>> = {
  'analysis-preserves-observation-boundary': () => withAuthoring(async ({ url }) => {
    const { analysis } = await request<{ analysis: RepoAnalysis }>(url, '/api/analyze', { source: 'fixture' });
    assert.equal(analysis.measured.filesystem, true); assert.equal(analysis.measured.testsExecuted, false); assert.ok(analysis.files! > 0); assert.match(analysis.serverToken, /^[a-f0-9]{64}$/);
    assert.equal('stars' in analysis, false); await request(url, '/api/analyze', { source: 'invalid' }, 400);
    await request(url, '/api/analyze', { source: 'github', url: 'http://127.0.0.1/private' }, 400);
  }),
  'campaign-mode-is-explicitly-labelled': () => withAuthoring(async ({ url }) => {
    const pair = await draftFixture(url); assert.equal(pair.draft.generator, 'demo'); assert.equal(pair.draft.evidence.generator, 'demo'); assert.equal('model' in pair.draft.evidence, false);
    await request(url, '/api/campaigns/generate', { analysis: pair.analysis, issueId: pair.draft.issueId, mode: 'invalid' }, 400);
    assert.equal(pair.draft.estimate.confidence, 'high');
  }),
  'assistant-stays-issue-bound': () => withAuthoring(async ({ url }) => {
    const { analysis, draft } = await draftFixture(url);
    const result = await request<{ assistant: { issueId: string; evidence: { generator: string } } }>(url, '/api/analysis/assist', { analysis: { ...analysis, name: 'forged' }, issueId: draft.issueId });
    assert.equal(result.assistant.issueId, draft.issueId); assert.equal(result.assistant.evidence.generator, 'static');
    await request(url, '/api/analysis/assist', { analysis, issueId: 'invented' }, 400);
  }),
  'critic-is-advisory': () => withAuthoring(async ({ url, context }) => {
    const pair = await draftFixture(url); const before = context.authoring!.capabilities.campaign(pair.analysis.serverToken, pair.draft.serverToken);
    const result = await request<{ critique: { affectedGate: boolean; evidence: { generator: string } } }>(url, '/api/campaigns/critique', pair);
    assert.equal(result.critique.affectedGate, false); assert.equal(result.critique.evidence.generator, 'static');
    assert.deepEqual(context.authoring!.capabilities.campaign(pair.analysis.serverToken, pair.draft.serverToken), before);
  }),
  'mission-creation-trusts-server-snapshots': () => withAuthoring(async ({ url }) => {
    const pair = await draftFixture(url);
    const tampered = { analysis: { ...pair.analysis, repoUrl: 'file:///etc/passwd' }, draft: { ...pair.draft, title: { en: 'forged' }, estimate: { total: 1 } } };
    const first = await request<{ mission: AuthoredMission }>(url, '/api/missions', tampered);
    const second = await request<{ mission: AuthoredMission }>(url, '/api/missions', pair);
    assert.equal(first.mission.id, second.mission.id); assert.deepEqual(first.mission.title, pair.draft.title); assert.equal(first.mission.computeGoal, pair.draft.estimate.total);
    assert.equal(first.mission.project.executable, false); assert.equal(first.mission.project.repoUrl, pair.analysis.repoUrl);
    await request(url, '/api/demo/reset', {}); await request(url, '/api/missions', pair, 400);
  }),
  'validation-is-nonsecret-and-nonauthorizing': () => withAuthoring(async ({ url, context }) => {
    const before = structuredClone(context.execution);
    const result = await request<{ ok: boolean; codexAvailable: boolean }>(url, '/api/llm/validate');
    assert.equal(result.ok, false); assert.equal(typeof result.codexAvailable, 'boolean'); assert.deepEqual(context.execution, before); assert.doesNotMatch(JSON.stringify(result), /apiKey|Authorization|sk-/);
  }),
  'feedback-is-bounded': () => withAuthoring(async ({ url }) => {
    await request(url, '/api/ai/feedback', { traceId: 'invalid', feature: 'issue-triage', helpful: true }, 400);
    await request(url, '/api/ai/feedback', { traceId: '0'.repeat(32), feature: 'mission-gate', helpful: true }, 400);
    assert.deepEqual(await request(url, '/api/ai/feedback', { traceId: '0'.repeat(32), feature: 'issue-triage', helpful: true, actor: 'maintainer' }), { recorded: false, actor: 'local-demo-user' });
  }),
  'project-explanation-route': () => withAuthoring(async ({ url }) => {
    const result = await request<{ plain: { generator: string }; impact: { dataMode: string }; timeline: Array<{ kind: string }> }>(url, '/api/projects/review-demo-project/explain');
    assert.equal(result.plain.generator, 'static'); assert.equal(result.impact.dataMode, 'demo'); assert.deepEqual(result.timeline.map(frame => frame.kind), ['past', 'present', 'future']);
    await request(url, '/api/projects/missing/explain', undefined, 404);
  }),
};

export const reviewCases: Record<string, () => Promise<void>> = {
  'review-keeps-human-boundary': () => withAuthoring(async ({ url, context }) => {
    await request(url, '/api/runs/review-demo-run/review', { decision: 'request_changes', comment: '  ' }, 400);
    const result = await request<{ mission: AuthoredMission }>(url, '/api/runs/review-demo-run/review', { decision: 'request_changes', comment: 'Please add coverage.', reviewerId: 'forged' });
    assert.equal(result.mission.status, 'changes_requested');
    const row = context.store.db.prepare('SELECT snapshot FROM authored_review_decisions WHERE run_id=?').get('review-demo-run');
    assert.equal(JSON.parse(String(row?.snapshot)).reviewerId, 'demo-contributor');
    await request(url, '/api/runs/review-demo-run/review', { decision: 'approve' }, 400);
    await request(url, '/api/demo/reset', {});
    const approval = await request<{ mission: AuthoredMission }>(url, '/api/runs/review-demo-run/review', { decision: 'approve' }); assert.equal(approval.mission.status, 'approved');
    await request(url, '/api/runs/missing/review', { decision: 'approve' }, 400);
  }),
  'shadow-review-has-no-authority': () => withAuthoring(async ({ url, context }) => {
    const before = context.evidence!.getRunEvidence('review-demo-run');
    const result = await request<{ shadow: { affectedGate: boolean; evidence: { generator: string } } }>(url, '/api/runs/review-demo-run/shadow-review');
    assert.equal(result.shadow.affectedGate, false); assert.equal(result.shadow.evidence.generator, 'static'); assert.deepEqual(context.evidence!.getRunEvidence('review-demo-run'), before);
    await request(url, '/api/runs/missing/shadow-review', undefined, 404);
  }),
  'explanation-never-rewrites-evidence': () => withAuthoring(async ({ url, context }) => {
    const before = context.evidence!.getRunEvidence('review-demo-run');
    const result = await request<{ explanation: { affectedGate: boolean } }>(url, '/api/runs/review-demo-run/explain');
    assert.equal(result.explanation.affectedGate, false); assert.deepEqual(context.evidence!.getRunEvidence('review-demo-run'), before);
  }),
};

export const operationsCases: Record<string, () => Promise<void>> = {
  'health-route-is-liveness-only': () => withAuthoring(async ({ url }) => {
    const result = await request<{ status: string; executionError: string }>(url, '/healthz'); assert.equal(result.status, 'ok'); assert.ok(result.executionError);
  }),
  'readiness-reflects-serving-dependencies': () => withAuthoring(async ({ url, context }) => {
    const result = await request<{ db: boolean; missions: number; workerReady: boolean; executionError: string }>(url, '/readyz');
    assert.equal(result.db, true); assert.equal(result.missions, 1); assert.equal(result.workerReady, true); assert.ok(result.executionError);
    context.store.db.exec('DROP TABLE authored_demo_evidence; DROP TABLE authored_review_decisions; DROP TABLE authored_missions');
    await request(url, '/readyz', undefined, 503);
  }),
  'metrics-route-exposes-bounded-observations': () => withAuthoring(async ({ url }) => {
    const response = await fetch(`${url}/metrics`); assert.equal(response.status, 200); const body = await response.text();
    assert.match(body, /commoncommit_build_info\{version="[^"]+",commit="[^"]+"\} 1/); assert.match(body, /commoncommit_llm_calls_total 0/); assert.doesNotMatch(body, /review-demo|fixture:\/\/|Authorization|apiKey/);
  }),
};

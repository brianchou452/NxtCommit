import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { startTestServer } from './test-support/http.js';
import { draftFixture, request } from './test-support/authoring.js';
import type { AuthoredMission } from '../shared/authoring.js';
import type { MissionDetail } from '../shared/mission.js';
import type { MarketplaceSnapshot, ContributorProfile } from '../shared/home.js';
import { executeFixture } from './services/mission-engine.js';

async function terminal(url: string, id: string): Promise<MissionDetail> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const m = await request<MissionDetail>(url, `/api/missions/${id}`);
    if (m.latestRun && m.latestRun.status !== 'running') return m;
    await delay(25);
  }
  throw new Error('Accepted dispatch did not reach persisted terminal evidence in 5 s');
}

/**
 * Spec: api.mission-create
 * Scenario: mission-creation-trusts-server-snapshots
 * Given Matching live capabilities hold analysis and draft.
 * When Mission creation is requested repeatedly.
 * Then Client edits are ignored and the same bound mission is returned.
 */
/**
 * Spec: api.mission-execute
 * Scenario: execute-success-produces-reviewable-evidence
 * Given DemoRunner applies scripted intelligence to a copied bundled fixture.
 * When Engine-owned verification observes a nonempty bounded diff and a green nonempty final suite.
 * Then The run persists source-labelled events dossier and artifact and only computeReviewable may move the mission to needs_review.
 */
/**
 * Spec: api.run-review
 * Scenario: review-keeps-human-boundary
 * Given A run has a reviewable local artifact.
 * When The local persona approves or requests changes.
 * Then The state changes locally, request_changes requires feedback and no upstream action occurs.
 */
test('Phase 3 authored fixture uses one lifecycle authority through funding, review, retry, persistence and reset', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'nxtcommit-phase3-'));
  const databasePath = join(directory, 'state.sqlite');
  let server = await startTestServer({ databasePath });
  try {
    const pair = await draftFixture(server.url);
    const { mission } = await request<{ mission: AuthoredMission }>(server.url, '/api/missions', pair);
    assert.equal(mission.project.executable, true);
    const again = await request<{ mission: AuthoredMission }>(server.url, '/api/missions', pair);
    assert.equal(again.mission.id, mission.id);
    assert.equal(server.context.store.db.prepare('SELECT count(*) AS n FROM authored_missions WHERE id=?').get(mission.id)?.n, 0);
    const market = await request<MarketplaceSnapshot>(server.url, '/api/marketplace');
    assert.ok(market.sections.some(s => s.missions.some(m => m.id === mission.id && Number.isFinite(m.computeGoal))));
    await request(server.url, `/api/missions/${mission.id}/wall`, { body: 'Local integration note' });
    await request(server.url, `/api/missions/${mission.id}/pledge`, { amount: mission.computeGoal });
    let outcome = await terminal(server.url, mission.id);
    assert.equal(outcome.status, 'needs_review'); assert.equal(outcome.latestRun?.status, 'succeeded');
    assert.ok(outcome.latestRun?.endedAt); assert.equal(outcome.artifact?.testEvidenceSource, 'engine');
    assert.equal(outcome.artifact?.dossier.baseline.total, 2); assert.equal(outcome.artifact?.dossier.experiments.at(-1)?.passed, 5);
    assert.ok(outcome.artifact?.files.some(f => f.path === 'parser.js'));
    assert.ok(outcome.artifact?.files.every(f => !f.path.includes('retry')));
    const run = outcome.latestRun!.id;
    await request(server.url, `/api/runs/${run}/review`, { decision: 'request_changes', comment: 'Review the edge cases again.' });
    assert.equal((await request<MissionDetail>(server.url, `/api/missions/${mission.id}`)).status, 'changes_requested');
    await request(server.url, `/api/missions/${mission.id}/execute`, {});
    outcome = await terminal(server.url, mission.id); assert.notEqual(outcome.latestRun!.id, run);
    await request(server.url, `/api/runs/${run}/review`, { decision: 'approve' }, 400);
    await request(server.url, `/api/runs/${outcome.latestRun!.id}/review`, { decision: 'approve', reviewerId: 'forged' });
    const profile = await request<ContributorProfile>(server.url, '/api/contributors/demo-contributor');
    assert.ok(profile.pledges.some(p => p.missionId === mission.id));
    assert.ok(profile.receipts.some(p => p.missionId === mission.id && p.status === 'approved'));
    await server.stop(); server = await startTestServer({ databasePath });
    const persisted = await request<MissionDetail>(server.url, `/api/missions/${mission.id}`);
    assert.equal(persisted.status, 'approved'); assert.equal(persisted.computeReserved, 0);
    assert.equal(persisted.ledger.filter(l => l.type === 'consume').length, 2);
    await request(server.url, '/api/demo/reset', {});
    await request(server.url, `/api/missions/${mission.id}`, undefined, 404);
    await request(server.url, '/api/missions', pair, 400);
    assert.equal((await request<MissionDetail>(server.url, '/api/missions/mission-fixture')).status, 'funding');
    assert.ok((await request<{ mission: AuthoredMission }>(server.url, '/api/missions/review-demo')).mission);
  } finally { await server.stop(); rmSync(directory, { recursive: true, force: true }); }
});

test('Phase 3 metadata capabilities cannot be changed into executable fixture authority', async () => {
  const server = await startTestServer({ authoring: { fetcher: async url => Response.json(String(url).includes('/issues?') ? [{ number: 1, title: 'Public issue', body: 'Observed metadata', labels: [] }] : { name: 'prime-agent', private: false }) } });
  try {
    const { analysis } = await request<{ analysis: import('../shared/authoring.js').RepoAnalysis }>(server.url, '/api/analyze', { source: 'github', url: 'https://github.com/PrimeIntellect-ai/prime-agent' });
    const { draft } = await request<{ draft: import('../shared/authoring.js').CampaignDraft }>(server.url, '/api/campaigns/generate', { analysis, issueId: '1', mode: 'demo' });
    const { mission } = await request<{ mission: AuthoredMission }>(server.url, '/api/missions', { analysis: { ...analysis, source: 'fixture', repoUrl: 'fixture://duration-demo' }, draft });
    assert.equal(mission.project.executable, false);
    await request(server.url, `/api/missions/${mission.id}/pledge`, { amount: mission.computeGoal });
    await request(server.url, `/api/missions/${mission.id}/execute`, {}, 400);
    const persisted = await request<MissionDetail>(server.url, `/api/missions/${mission.id}`);
    assert.equal(persisted.project.workspace.kind, 'github'); assert.equal(persisted.latestRun, undefined);
    await assert.rejects(executeFixture('m', 'r', new AbortController().signal, () => {}, '../duration-demo'));
  } finally { await server.stop(); }
});

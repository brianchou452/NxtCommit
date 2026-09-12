import { randomUUID } from 'node:crypto';
import type { AuthoringMissionPort } from '../persistence/authoring-review.js';
import type { AuthoredMission, CampaignDraft, RepoAnalysis } from '../../shared/authoring.js';
import type { MissionDetail, MissionRecord, PledgeRecord } from '../../shared/mission.js';
import type { Campaign } from '../../shared/home.js';
import type { ReviewDecision } from '../../shared/types.js';
import type { MissionServices } from './mission-services.js';
import type { ServiceContext } from './context.js';
import { MissionError, assertTransition } from '../domain/mission.js';

export function authoredView(mission: MissionDetail): AuthoredMission {
  return { id: mission.id, title: mission.title, status: mission.status, story: mission.story,
    generator: mission.generator, computeGoal: mission.computeGoal, computePledged: mission.computePledged,
    backerCount: mission.backerCount ?? new Set(mission.pledges.map(p => p.contributorId)).size, tags: mission.tags ?? [], progress: mission.progress,
    project: { ...mission.project, source: mission.project.workspace.kind === 'github' ? 'github' : 'fixture', executable: mission.project.workspace.kind === 'fixture' },
    ...(mission.draft ? { draft: mission.draft } : {}), ...(mission.latestRunId ? { latestRunId: mission.latestRunId } : {}) };
}

/** Read-only conversion for historical Home seeds; it never grants a fixture workspace. */
export function campaignDetail(campaign: Campaign): MissionDetail {
  return { ...campaign, dataMode: 'demo', computeReserved: 0, computeConsumed: 0, acceptanceCriteria: [], milestones: [], pledges: [], ledger: [],
    project: { ...campaign.project, repoUrl: '', maintainer: { id: 'demo-maintainer', name: 'Demo Maintainer', verified: false }, workspace: { kind: 'none' } } };
}

export function missionPort(service: MissionServices): AuthoringMissionPort {
  const read = (id: string) => { const value = service.store.detail(id); return value ? authoredView(value) : undefined; };
  return {
    get: read,
    all: () => service.store.list<MissionRecord>('mission').map(m => authoredView(service.getMission(m.id))),
    create(analysis: RepoAnalysis, draft: CampaignDraft) {
      const id = randomUUID();
      // The opaque analysis capability, not the browser's workspace fields, determines eligibility.
      const fixture = analysis.source === 'fixture' && analysis.repoUrl === 'fixture://duration-demo';
      const { serverToken: _token, ...publicDraft } = draft;
      const mission: MissionRecord = { id, projectId: `project-${id}`, title: draft.title, tagline: draft.tagline, story: draft.story,
        generator: draft.generator, dataMode: 'demo', status: 'funding', computeGoal: draft.estimate.total, computePledged: 0, computeReserved: 0, computeConsumed: 0,
        draft: { ...publicDraft, serverToken: '' }, tags: draft.tags,
        acceptanceCriteria: draft.criteria.map((text, index) => ({ id: `criterion-${index}`, text, status: 'pending' })),
        milestones: draft.milestones.map((m, index) => ({ id: `milestone-${index}`, title: m.title, share: m.allocation / 100, status: 'pending' })),
        project: { id: `project-${id}`, name: analysis.name, slug: analysis.name, description: { en: analysis.description, 'zh-TW': analysis.description }, repoUrl: analysis.repoUrl,
          figuresMode: analysis.source === 'fixture' ? 'demo' : 'live', maintainer: { id: 'demo-maintainer', name: 'Demo Maintainer', verified: false },
          workspace: fixture ? { kind: 'fixture', path: 'duration-demo' } : { kind: 'github', url: analysis.repoUrl } } };
      service.context.store.transaction(() => service.store.put('mission', id, mission.projectId, mission));
      service.notifyMission(id); return read(id)!;
    },
    save(mission) {
      const current = service.getMission(mission.id);
      service.store.put('mission', mission.id, current.projectId, { ...current, status: mission.status, latestRunId: mission.latestRunId });
      service.notifyMission(mission.id);
    },
    decide(missionId: string, decision: ReviewDecision) {
      service.context.store.transaction(() => {
        const mission = service.getMission(missionId);
        if (mission.latestRunId !== decision.runId || mission.status !== 'needs_review' || !service.reviewabilityForRun(decision.runId)?.reviewable) throw new MissionError('not_reviewable', 'Current engine evidence is required.');
        const next = decision.decision === 'approve' ? 'approved' : 'changes_requested';
        assertTransition(mission.status, next);
        if (service.store.get('review', decision.runId)) throw new MissionError('already_reviewed', 'Run already reviewed.');
        service.store.put('review', decision.runId, missionId, { ...decision, createdAt: new Date().toISOString() });
        service.store.put('mission', mission.id, mission.projectId, { ...mission, status: next });
      });
      service.notifyMission(missionId); return read(missionId)!;
    },
  };
}

/** Home tables are rebuildable projections; B remains the sole lifecycle/ledger writer. */
export function syncMissionProjection(context: ServiceContext, service: MissionServices): void {
  const currentUserId = context.bootstrap().currentUser.id;
  context.store.transaction(db => {
    for (const row of service.store.list<MissionRecord>('mission')) {
      const detail = service.getMission(row.id);
      const campaign: Campaign = { ...authoredView(detail), ...(row.catalog ? {catalog:row.catalog} : {}), projectId: row.projectId, tagline: row.tagline,
        project: { ...row.project, usedByYou: detail.pledges.some(p => p.contributorId === currentUserId) } };
      db.prepare('INSERT INTO home_projects VALUES (?,?) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot').run(row.projectId, JSON.stringify(campaign.project));
      db.prepare('INSERT INTO home_missions VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot').run(row.id, row.projectId, JSON.stringify(campaign));
      for (const pledge of service.store.list<PledgeRecord>('pledge', row.id)) {
        if (!db.prepare('SELECT 1 FROM home_contributors WHERE id=?').get(pledge.contributorId)) continue;
        db.prepare('INSERT INTO home_pledges VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING').run(pledge.id, row.id, pledge.contributorId, pledge.amount, pledge.createdAt);
      }
    }
  });
}

/** O(1) invalidation checks; idle HTTP reads never rebuild/write Home projections.
 * total_changes covers this connection (including rolled-back writes conservatively),
 * data_version observes commits from the separate queue worker. Capture AFTER sync.
 */
export function createProjectionSynchronizer(context: ServiceContext, service: MissionServices) {
  const changes = context.store.db.prepare('SELECT total_changes() AS revision');
  const external = context.store.db.prepare('PRAGMA data_version');
  const revision = () => `${changes.get()!.revision}:${external.get()!.data_version}`;
  let synced = '';
  return () => {
    if (revision() === synced) return false;
    syncMissionProjection(context, service);
    synced = revision();
    return true;
  };
}

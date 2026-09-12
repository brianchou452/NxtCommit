import { randomUUID } from 'node:crypto';
import type { Migration, PersistenceAdapter } from './database.js';
import type { AuthoredMission, RepoAnalysis, CampaignDraft } from '../../shared/authoring.js';
import type { ExecutionEvidence, ExecutionEvidenceReader, ReviewDecision } from '../../shared/types.js';

export const authoringReviewMigration: Migration = { id: 30, name: 'authoring-review-local-records', up(db) {
  db.exec(`CREATE TABLE authored_missions (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL CHECK(json_valid(snapshot)));
    CREATE TABLE authored_review_decisions (run_id TEXT PRIMARY KEY, mission_id TEXT NOT NULL REFERENCES authored_missions(id), snapshot TEXT NOT NULL CHECK(json_valid(snapshot)));
    CREATE TABLE authored_demo_evidence (run_id TEXT PRIMARY KEY, mission_id TEXT NOT NULL REFERENCES authored_missions(id), snapshot TEXT NOT NULL CHECK(json_valid(snapshot)));`);
} };

/** Central integration supplies B's mission authority without exposing its tables to C. */
export interface AuthoringMissionPort {
  create(analysis: RepoAnalysis, draft: CampaignDraft): AuthoredMission;
  get(id: string): AuthoredMission | undefined;
  all(): AuthoredMission[];
  save(mission: AuthoredMission): void;
  decide(missionId: string, decision: ReviewDecision): AuthoredMission;
}

/** Owns authored local mission creation/decisions. Execution evidence is always read through its port. */
export class AuthoringReviewRepository implements ExecutionEvidenceReader {
  constructor(private readonly store: PersistenceAdapter, private readonly missions?: AuthoringMissionPort) {}
  create(analysis: RepoAnalysis, draft: CampaignDraft): AuthoredMission {
    if (this.missions) return this.missions.create(analysis, draft);
    const id = randomUUID();
    const { serverToken: _token, ...publicDraft } = draft;
    const mission: AuthoredMission = {
      id, title: draft.title, status: 'funding', story: draft.story, generator: draft.generator,
      computeGoal: draft.estimate.total, computePledged: 0, backerCount: 0, tags: draft.tags,
      progress: { funding: 0, development: 0, verification: 0, adoption: 0 },
      project: { id: `project-${id}`, slug: analysis.name, name: analysis.name, description: { en: analysis.description, 'zh-TW': analysis.description }, repoUrl: analysis.repoUrl, source: analysis.source, executable: false, figuresMode: analysis.source === 'fixture' ? 'demo' : 'live' },
      draft: { ...publicDraft, serverToken: '' },
    };
    this.save(mission); return mission;
  }
  save(mission: AuthoredMission): void {
    if (this.missions?.get(mission.id)) { this.missions.save(mission); return; }
    this.store.db.prepare('INSERT INTO authored_missions VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot').run(mission.id, JSON.stringify(mission));
  }
  get(id: string): AuthoredMission | undefined {
    const owned = this.missions?.get(id); if (owned) return owned;
    const row = this.store.db.prepare('SELECT snapshot FROM authored_missions WHERE id=?').get(id);
    return row ? JSON.parse(String(row.snapshot)) as AuthoredMission : undefined;
  }
  byProject(id: string): AuthoredMission | undefined { return this.all().find(mission => mission.project.id === id); }
  all(): AuthoredMission[] { return [...(this.missions?.all() ?? []), ...this.store.db.prepare('SELECT snapshot FROM authored_missions ORDER BY id').all().map(row => JSON.parse(String(row.snapshot)) as AuthoredMission)]; }
  count(): number { return this.all().length; }
  getRunEvidence(runId: string): ExecutionEvidence | undefined {
    const row = this.store.db.prepare('SELECT snapshot FROM authored_demo_evidence WHERE run_id=?').get(runId);
    return row ? JSON.parse(String(row.snapshot)) as ExecutionEvidence : undefined;
  }
  getLatestRunEvidence(missionId: string): ExecutionEvidence | undefined {
    const runId = this.get(missionId)?.latestRunId;
    return runId ? this.getRunEvidence(runId) : undefined;
  }
  saveDemoEvidence(evidence: ExecutionEvidence): void {
    if (evidence.artifact?.testEvidenceSource !== 'demo' || evidence.events.some(event => event.verified)) throw new Error('Demo records cannot contain fresh verified evidence');
    this.store.db.prepare('INSERT INTO authored_demo_evidence VALUES (?, ?, ?)').run(evidence.run.id, evidence.run.missionId, JSON.stringify(evidence));
  }
  decide(missionId: string, decision: ReviewDecision): AuthoredMission {
    if (this.missions?.get(missionId)) return this.missions.decide(missionId, decision);
    return this.store.transaction(() => {
      const mission = this.get(missionId);
      if (!mission || mission.status !== 'needs_review' || mission.latestRunId !== decision.runId) throw new Error('Mission is not eligible for this review.');
      this.store.db.prepare('INSERT INTO authored_review_decisions VALUES (?, ?, ?)').run(decision.runId, missionId, JSON.stringify(decision));
      mission.status = decision.decision === 'approve' ? 'approved' : 'changes_requested';
      this.save(mission); return mission;
    });
  }
  clear(): void { this.store.db.exec('DELETE FROM authored_review_decisions; DELETE FROM authored_demo_evidence; DELETE FROM authored_missions;'); }
}

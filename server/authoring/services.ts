import type { RepoAnalysis, CampaignDraft } from '../../shared/authoring.js';
import type { PersistenceAdapter } from '../persistence/database.js';
import type { ExecutionEvidenceReader } from '../../shared/types.js';
import { AuthoringCapabilities } from '../persistence/authoring-capabilities.js';
import { AuthoringReviewRepository, authoringReviewMigration } from '../persistence/authoring-review.js';
import type { AuthoringMissionPort } from '../persistence/authoring-review.js';
import { Assistance } from './assistance.js';
import type { ModelConfiguration, ObservationSink } from './assistance.js';
import { bilingual, campaignDraft } from './campaign.js';
import { computeReviewable } from '../domain/reviewability.js';
import type { IntegrityEvidence } from '../domain/reviewability.js';
import type { ReviewabilityResult, ExecutionEvidence } from '../../shared/types.js';
import { assertRunSummary } from '../../shared/types.js';

export interface AuthoringOptions {
  missions?: AuthoringMissionPort;
  reviewabilityForRun?: (runId: string) => ReviewabilityResult | undefined;
  model?: ModelConfiguration; observations?: ObservationSink; fetcher?: typeof fetch; evidence?: ExecutionEvidenceReader;
  /** B supplies measured integrity alongside its evidence reader; never accepted from HTTP input. */
  integrityForRun?: (runId: string) => IntegrityEvidence | undefined;
}
export class AuthoringServices {
  readonly capabilities = new AuthoringCapabilities<RepoAnalysis, CampaignDraft>();
  readonly repository: AuthoringReviewRepository;
  readonly assistance: Assistance;
  readonly evidence: ExecutionEvidenceReader;
  private generation = 0;
  private resetting = false;
  constructor(store: PersistenceAdapter, readonly options: AuthoringOptions = {}) {
    store.migrate([authoringReviewMigration]);
    this.repository = new AuthoringReviewRepository(store, options.missions);
    this.assistance = new Assistance(options.model, options.observations, options.fetcher);
    this.evidence = {
      getRunEvidence: id => options.evidence?.getRunEvidence(id) ?? this.repository.getRunEvidence(id),
      getLatestRunEvidence: id => options.evidence?.getLatestRunEvidence(id) ?? this.repository.getLatestRunEvidence(id),
    };
    if (!this.repository.get('review-demo')) store.transaction(() => this.seed());
  }
  epoch(): number { if (this.resetting) throw new Error('reset_in_progress'); return this.generation; }
  assertEpoch(epoch: number): void { if (this.resetting || epoch !== this.generation) throw new Error('capability_expired'); }
  beginReset(): void { this.resetting = true; this.generation++; this.capabilities.clear(); }
  endReset(): void { this.resetting = false; }
  reviewability(evidence: ExecutionEvidence | undefined): ReviewabilityResult {
    if (!evidence?.artifact) return { reviewable: false, reasons: ['artifact_missing'] };
    try { assertRunSummary(evidence.run); } catch { return { reviewable: false, reasons: ['invalid_terminal_evidence'] }; }
    if (evidence.artifact.runId !== evidence.run.id) return { reviewable: false, reasons: ['artifact_run_mismatch'] };
    const mission = this.repository.get(evidence.run.missionId);
    if (!mission || mission.status !== 'needs_review' || mission.latestRunId !== evidence.run.id) return { reviewable: false, reasons: ['mission_not_reviewable'] };
    if (evidence.artifact.testEvidenceSource === 'demo' && this.repository.getRunEvidence(evidence.run.id)) {
      return { reviewable: true, reasons: ['authored_seed_local_decision_only'] };
    }
    const owned = this.options.reviewabilityForRun?.(evidence.run.id);
    if (owned) return owned;
    const integrity = this.options.integrityForRun?.(evidence.run.id);
    if (!integrity || evidence.run.status !== 'succeeded') return { reviewable: false, reasons: ['fresh_reviewability_not_available'] };
    return computeReviewable(evidence.artifact, integrity);
  }
  seed(): void {
    const analysis: RepoAnalysis = { source: 'fixture', repoUrl: 'fixture://review-example', name: 'review-example', description: 'Authored local review demonstration.', issues: [], measured: { metadata: false, filesystem: false, testsExecuted: false, fullTree: false }, serverToken: '' };
    const issue = { id: 'demo-review', title: 'Review a proposed parser change', body: 'Authored example for inspecting local change evidence.', labels: ['demo'], feasibility: { executable: false, basis: 'Authored seed' } };
    const draft = { ...campaignDraft(analysis, issue, { summary: bilingual('Authored review demonstration.', '人工編寫的檢視示範。'), evidence: { generator: 'demo' as const, promptVersion: 'seed-v1' }, affectedGate: false }), serverToken: '' };
    const mission = {
      id: 'review-demo', title: draft.title, status: 'needs_review' as const, story: draft.story, generator: 'demo' as const,
      computeGoal: draft.estimate.total, computePledged: 0, backerCount: 0, tags: ['demo'],
      progress: { funding: 0, development: 0, verification: 0, adoption: 0 },
      project: { id: 'review-demo-project', slug: analysis.name, name: analysis.name, description: bilingual(analysis.description, '人工編寫的本機檢視示範。'), repoUrl: analysis.repoUrl, source: 'fixture' as const, executable: false, figuresMode: 'demo' as const },
      draft, latestRunId: 'review-demo-run',
    };
    this.repository.save(mission);
    this.repository.saveDemoEvidence({
      run: { id: 'review-demo-run', missionId: mission.id, mode: 'demo', status: 'succeeded', computeBudget: 100, computeUsed: 0, startedAt: '2026-09-12T00:00:00Z', endedAt: '2026-09-12T00:00:01Z' }, events: [],
      artifact: { runId: 'review-demo-run', testEvidenceSource: 'demo',
        files: [{ path: 'parser.js', added: 1, deleted: 1, diff: '--- a/parser.js\n+++ b/parser.js\n- return input;\n+ return input.trim();' }, { path: 'parser.test.js', added: 1, deleted: 0, diff: '+ assert.equal(parse(" 1h "), 3600);' }],
        dossier: { baseline: { command: 'node --test', limitation: 'Authored seed: no fresh baseline measurement.' }, experiments: [], qualityGates: [], criterionEvidence: [{ criterion: 'Compound duration support', status: 'unknown', explanation: 'Not established by this authored example.' }] },
        review: { source: 'static', summary: 'Authored advisory example; not a model call.', affectedGate: false },
      },
    });
  }
}

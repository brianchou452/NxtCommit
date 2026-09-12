import type { ISODateTime, JsonValue } from './primitives.js';
import type { EventProvenance } from './provenance.js';

export const RUN_STATUSES = ['running', 'succeeded', 'failed', 'budget_exhausted', 'blocked', 'cancelled'] as const;
export type RunStatus = typeof RUN_STATUSES[number];
export type TerminalRunStatus = Exclude<RunStatus, 'running'>;
export type ExecutionMode = 'demo' | 'llm' | 'codex';
export type MissionStatus = 'funding' | 'funded' | 'executing' | 'needs_review' | 'changes_requested' | 'approved' | 'released' | 'failed' | 'stalled';

export interface MissionSummary { id: string; status: MissionStatus; latestRunId?: string }
interface RunBase {
  id: string;
  missionId: string;
  mode: ExecutionMode;
  computeBudget: number;
  computeUsed: number;
  startedAt: ISODateTime;
}
export type RunSummary = RunBase & (
  | { status: 'running'; endedAt?: never }
  | { status: TerminalRunStatus; endedAt: ISODateTime }
);

export type ExecutionEvent = EventProvenance & {
  id: string;
  runId: string;
  missionId: string;
  seq: number;
  ts: ISODateTime;
  type: string;
  computeDelta: number;
  payload?: JsonValue;
};

export interface TestSummary {
  command: string;
  exitCode?: number;
  passed?: number;
  failed?: number;
  total?: number;
  limitation?: string;
}
export interface QualityGate { id: string; status: 'passed' | 'failed' | 'unknown'; reason: string }
export interface CriterionEvidence { criterion: string; status: 'supported' | 'unsupported' | 'unknown'; explanation: string }
export interface VerificationDossier {
  baseline: TestSummary;
  experiments: TestSummary[];
  qualityGates: QualityGate[];
  criterionEvidence: CriterionEvidence[];
}
export interface ArtifactFile { path: string; diff: string; added: number; deleted: number }
export interface AdvisoryReview {
  source: 'llm' | 'static';
  summary: string;
  affectedGate: false;
}
export interface RunArtifact {
  runId: string;
  files: ArtifactFile[];
  dossier: VerificationDossier;
  testEvidenceSource: 'engine' | 'demo';
  review: AdvisoryReview;
}
export interface ReviewabilityResult { reviewable: boolean; reasons: string[] }
export type ReviewDecision = {
  runId: string;
  reviewerId: string;
} & ({ decision: 'approve'; comment?: string } | { decision: 'request_changes'; comment: string });

export interface ExecutionEvidence {
  run: RunSummary;
  events: ExecutionEvent[];
  artifact?: RunArtifact;
}
/** B implements this port; C consumes it without querying B-owned tables. */
export interface ExecutionEvidenceReader {
  getRunEvidence(runId: string): ExecutionEvidence | undefined;
  getLatestRunEvidence(missionId: string): ExecutionEvidence | undefined;
}

export type EventEnvelope =
  | { kind: 'mission_update'; mission: MissionSummary }
  | { kind: 'run_update'; run: RunSummary }
  | { kind: 'exec_event'; event: ExecutionEvent }
  | { kind: 'achievement'; contributorId: string; achievement: { id: string } };

/** Transport validation only. Lifecycle transitions remain owned by Computer B. */
export function assertRunSummary(value: RunSummary): void {
  if (!RUN_STATUSES.includes(value.status)) throw new Error('Invalid run status');
  if ('completedAt' in value) throw new Error('Use endedAt for terminal runs');
  if (!Number.isFinite(Date.parse(value.startedAt))) throw new Error('Invalid startedAt');
  if (value.status === 'running') {
    if (value.endedAt !== undefined) throw new Error('Running runs cannot have endedAt');
  } else if (!value.endedAt || !Number.isFinite(Date.parse(value.endedAt)) || Date.parse(value.endedAt) < Date.parse(value.startedAt)) {
    throw new Error('Terminal runs require a valid endedAt at or after startedAt');
  }
  for (const amount of [value.computeBudget, value.computeUsed]) {
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Invalid compute amount');
  }
  if (value.computeUsed > value.computeBudget) throw new Error('Run usage exceeds its budget');
}

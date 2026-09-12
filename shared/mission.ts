import type { CatalogContent } from "./catalog.js";
import type { LocalizedText } from './primitives.js';
import type { MissionStatus, RunArtifact, RunSummary } from './execution.js';
import type { CampaignDraft } from './authoring.js';
import type { ReviewDecision } from './execution.js';

export interface MissionProject {
  language?: string; license?: string; stars?: number; weeklyDownloads?: number; dependents?: number;
  id: string; slug: string; name: string; description: LocalizedText; repoUrl: string;
  figuresMode: 'demo' | 'live';
  maintainer: { id: string; name: string; verified: boolean };
  workspace: { kind: 'fixture' | 'github' | 'none'; path?: string; url?: string };
}
export interface MissionRecord {
  releaseVersion?: string; releasedAt?: string;
  catalog?: CatalogContent;
  backerCount?: number;
  id: string; projectId: string; title: LocalizedText; tagline: LocalizedText;
  story: { what: LocalizedText; why: LocalizedText; whoBenefits: LocalizedText; approach: LocalizedText };
  generator: 'demo' | 'openai'; dataMode: 'demo'; status: MissionStatus;
  draft?: CampaignDraft;
  tags?: string[];
  computeGoal: number; computePledged: number; computeReserved: number; computeConsumed: number;
  latestRunId?: string;
  acceptanceCriteria: { id: string; text: LocalizedText; status: 'pending' | 'supported' | 'unknown' }[];
  milestones: { id: string; title: LocalizedText; share: number; status: string }[];
  project: MissionProject;
}
export interface PledgeRecord { id: string; missionId: string; contributorId: string; amount: number; createdAt: string }
export interface LedgerRecord {
  id: string; missionId: string; contributorId?: string; runId?: string;
  type: 'pledge' | 'reserve' | 'consume' | 'refund_unused'; amount: number; createdAt: string;
}
export interface MissionArtifact extends RunArtifact { missionId: string; mode: 'demo' }
export interface MissionDetail extends MissionRecord {
  reviewDecision?: ReviewDecision;
  progress: { funding: number; development: number; verification: number; adoption: number };
  pledges: PledgeRecord[]; ledger: LedgerRecord[]; latestRun?: RunSummary; artifact?: MissionArtifact;
}
export interface RunRequest {
  id: string; missionId: string; status: 'queued' | 'leased' | 'completed' | 'failed' | 'cancelled';
  attempt: number; createdAt: string; updatedAt: string; resultRunId?: string; error?: string;
  leaseOwner?: string; leaseExpiresAt?: string;
}

import type { LocalizedText } from './primitives.js';
import type { MissionStatus } from './execution.js';

export interface AiEvidence {
  generator: 'openai' | 'demo' | 'static'; promptVersion: string;
  model?: string; latencyMs?: number; traceId?: string; fallbackReason?: string;
  responseId?: string; usage?: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
}
export interface ObservedIssue { id: string; title: string; body: string; url?: string; labels: string[]; feasibility: { executable: boolean; basis: string } }
export interface RepoAnalysis {
  source: 'fixture' | 'github'; repoUrl: string; name: string; description: string;
  commitSha?: string; language?: string; license?: string; stars?: number; files?: number;
  issues: ObservedIssue[]; measured: { metadata: boolean; filesystem: boolean; testsExecuted: false; fullTree: boolean };
  serverToken: string;
}
export interface CampaignDraft {
  issueId: string; title: LocalizedText; tagline: LocalizedText;
  story: { what: LocalizedText; why: LocalizedText; whoBenefits: LocalizedText; approach: LocalizedText };
  criteria: LocalizedText[]; milestones: Array<{ title: LocalizedText; allocation: number }>;
  estimate: { total: number; low: number; high: number; confidence: 'low' | 'high'; basis: string; breakdown: Array<{ label: string; credits: number }> };
  risk: LocalizedText; tags: string[]; generator: 'openai' | 'demo'; evidence: AiEvidence; serverToken: string;
}
export interface AuthoredMission {
  id: string; title: LocalizedText; status: MissionStatus; story: CampaignDraft['story'];
  generator: 'openai' | 'demo'; computeGoal: number; computePledged: number; backerCount: number;
  tags: string[]; progress: { funding: number; development: number; verification: number; adoption: number };
  project: { id: string; slug: string; name: string; description: LocalizedText; repoUrl: string; source: 'fixture' | 'github'; executable: boolean; figuresMode: 'demo' | 'live' };
  draft?: CampaignDraft; latestRunId?: string;
}
export interface AssistantResult {
  summary: LocalizedText; evidence: AiEvidence; affectedGate: false;
  scope?: LocalizedText; criteria?: LocalizedText[];
  checks?: Array<{ kind: 'grounding' | 'actionability' | 'bilingual_parity'; status: 'needs_review'; explanation: LocalizedText }>;
  facts?: Array<{ field: string; value: string | number }>; caveats?: LocalizedText[];
  verdict?: 'advisory_only';
}

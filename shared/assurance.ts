import type { AssistantResult } from './authoring.js';
export const assuranceStages = ['plan', 'safety', 'chaos', 'assess', 'review', 'iterate'] as const;
export type AssuranceStage = typeof assuranceStages[number];
export interface AssuranceRun {
  id: string; startedAt: string; finishedAt?: string; commit: string;
  trigger: 'scheduled' | 'operator'; status: 'running' | 'passed' | 'blocked' | 'failed' | 'interrupted';
  stages: Array<{name: AssuranceStage; status: 'pending' | 'running' | 'completed' | 'failed'; startedAt?: string; finishedAt?: string}>;
  safety: {fixedCatalog: boolean; privateDatabase: boolean; modelCannotChangeGate: boolean; sourceEditsEnabled: false};
  report?: {
    id: string; catalogVersion: string; seed: number; repetitions: number;
    summary: {total: number; passed: number; failed: number; p95Ms: number};
    decision: 'checks-passed' | 'blocked';
    measurements: Array<{scenario: string; repetition: number; passed: boolean; durationMs: number; checks: Record<string, boolean>; error?: string}>;
    comparison: {baselineId: string | null; comparable: boolean; regressions: string[]; recovered: string[]};
    backlog: Array<{scenario: string; failedChecks: string[]; nextAction: string}>;
  };
  advice: Partial<Record<'plan' | 'safety' | 'review' | 'iterate', AssistantResult>>;
  modelCalls: number; knownInputTokens: number; knownOutputTokens: number; unknownUsageCalls: number;
  failureCode?: 'cycle_failed' | 'process_restarted' | 'cancelled';
}
export interface AssuranceSnapshot {
  observedAt: string; enabled: boolean; intervalSeconds: number; nextEligibleAt: string | null;
  storage: 'ephemeral-sqlite'; scope: 'controlled-faults-real-modules'; sourceEditsEnabled: false;
  runs: AssuranceRun[];
}

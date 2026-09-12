import type { MissionDetail, RunRequest } from '../../shared/mission.js';
import type { ExecutionEvent, ExecutionEvidence, EventEnvelope } from '../../shared/execution.js';

export class MissionApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}
export async function missionJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = body as { error?: string; code?: string };
    throw new MissionApiError(response.status, error.error ?? 'request_failed', error.code);
  }
  return body as T;
}
export const missionPath = (id: string) => `/api/missions/${encodeURIComponent(id)}`;
export async function getMission(id: string, signal?: AbortSignal): Promise<MissionDetail> {
  const response = await missionJson<MissionDetail | { mission: import('../../shared/authoring.js').AuthoredMission; evidence?: ExecutionEvidence }>(missionPath(id), signal ? { signal } : {});
  if ('id' in response) return response;
  const m = response.mission;
  return { ...m, projectId: m.project.id, tagline: m.draft?.tagline ?? m.title, dataMode: 'demo', computeReserved: 0, computeConsumed: 0,
    acceptanceCriteria: (m.draft?.criteria ?? []).map((text, i) => ({ id: String(i), text, status: 'pending' })), milestones: [], pledges: [], ledger: [],
    project: { ...m.project, maintainer: { id: 'demo-maintainer', name: 'Demo Maintainer', verified: false }, workspace: m.project.source === 'github' ? { kind: 'github', url: m.project.repoUrl } : { kind: 'none' } },
    ...(response.evidence ? { latestRun: response.evidence.run } : {}),
    ...(response.evidence?.artifact ? { artifact: { ...response.evidence.artifact, missionId: id, mode: 'demo' } } : {}) };
}
export function ownedEvents(events: ExecutionEvent[], missionId: string, runId?: string): ExecutionEvent[] {
  if (!runId) return [];
  return [...new Map(events.filter(event => event.missionId === missionId && event.runId === runId).map(event => [event.id, event])).values()]
    .sort((a, b) => a.seq - b.seq || a.id.localeCompare(b.id));
}
export function envelopeBelongsToMission(value: EventEnvelope, id: string): boolean {
  return (value.kind === 'mission_update' && value.mission.id === id)
    || (value.kind === 'run_update' && value.run.missionId === id)
    || (value.kind === 'exec_event' && value.event.missionId === id);
}
export type PledgeResult = { mission: MissionDetail; wallet: number; executionStarting: boolean; achievements: unknown[] };
export const pledgeMission = (id: string, amount: number, key: string) => missionJson<PledgeResult>(`${missionPath(id)}/pledge`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ amount }),
});
export const executeMission = (id: string, signal?: AbortSignal) => missionJson<{ dispatch: 'inline'; run: ExecutionEvidence['run'] } | { dispatch: 'queue'; request: RunRequest }>(`${missionPath(id)}/execute`, {
  ...(signal ? { signal } : {}),
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
});

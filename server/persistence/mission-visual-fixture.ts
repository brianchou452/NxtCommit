import type { MissionServices } from '../services/mission-services.js';
import type { MissionRecord } from '../../shared/mission.js';
import type { ExecutionEvent, RunSummary } from '../../shared/execution.js';

/** E2E-only authored snapshot. Never called by product seed, dispatch, worker or recovery. */
export function seedRunningDemo(service: MissionServices): void {
  service.context.store.transaction(() => {
    const source = service.store.get<MissionRecord>('mission', 'mission-ready');
    if (!source) throw new Error('Mission visual fixture requires the regular demo graph.');
    const mission: MissionRecord = { ...source, id: 'mission-running', status: 'executing', latestRunId: 'seed-running-run', computePledged: 0, computeReserved: 0, computeConsumed: 0 };
    const run: RunSummary = { id: 'seed-running-run', missionId: mission.id, status: 'running', mode: 'demo', computeBudget: 40, computeUsed: 0, startedAt: '2026-01-01T00:00:00.000Z' };
    service.store.put('mission', mission.id, mission.projectId, mission);
    service.store.put('run', run.id, mission.id, run);
    const event: ExecutionEvent = { id: 'seed-running-event', missionId: mission.id, runId: run.id, seq: 1, ts: run.startedAt, type: 'plan', source: 'demo', verified: false, computeDelta: 0, payload: { title: 'Authored demo activity snapshot', detail: 'Visual fixture only; no active worker, LLM, or fresh engine observation.' } };
    service.store.put('event', event.id, run.id, event);
  });
}

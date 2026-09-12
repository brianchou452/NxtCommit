import { useCallback, useEffect, useRef, useState } from 'react';
import type { MissionDetail, RunRequest } from '../../shared/mission.js';
import type { ExecutionEvent, ExecutionEvidence, EventEnvelope } from '../../shared/execution.js';
import { envelopeBelongsToMission, getMission, missionJson, missionPath, ownedEvents } from '../services/mission.js';

type Snapshot = { mission: MissionDetail; events: ExecutionEvent[]; request?: RunRequest | null };
/** Adopt one complete mission/run snapshot. SSE is an invalidation signal, never verification. */
export function useMissionSnapshot(id: string, execution = false) {
  const [state, setState] = useState<{ id: string; data?: Snapshot; error?: unknown; evidenceError?: unknown }>({ id });
  const [disconnected, setDisconnected] = useState(false);
  const refresh = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    let active = true;
    let serial = 0;
    let polling: ReturnType<typeof setTimeout> | undefined;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let source: EventSource | undefined;
    let backoff = 500;
    const controllers = new Set<AbortController>();
    setState({ id });
    setDisconnected(false);
    const reload = async () => {
      const requestSerial = ++serial;
      const controller = new AbortController();
      controllers.add(controller);
      const current = () => active && requestSerial === serial;
      try {
        const mission = await getMission(id, controller.signal);
        if (!current() || mission.id !== id) return;
        let events: ExecutionEvent[] = [];
        let request: RunRequest | null | undefined;
        let evidenceError: unknown;
        if (execution) {
          const [eventResult, queueResult] = await Promise.allSettled([
            missionJson<{ runId?: string; events: ExecutionEvent[] }>(`${missionPath(id)}/events${mission.latestRun ? `?runId=${encodeURIComponent(mission.latestRun.id)}` : ''}`, { signal: controller.signal }),
            missionJson<{ request: RunRequest | null }>(`${missionPath(id)}/run-request`, { signal: controller.signal }),
          ]);
          if (!current()) return;
          if (eventResult.status === 'fulfilled') events = ownedEvents(eventResult.value.events, id, mission.latestRun?.id);
          else evidenceError = eventResult.reason;
          if (queueResult.status === 'fulfilled') {
            request = queueResult.value.request;
            if (request && request.missionId !== id) request = undefined;
          } else evidenceError = queueResult.reason;
          if (mission.latestRun) {
            try {
              const detail = await missionJson<ExecutionEvidence>(`/api/runs/${encodeURIComponent(mission.latestRun.id)}`, { signal: controller.signal });
              if (detail.run.id === mission.latestRun.id && detail.run.missionId === id) {
                // Mission owns run selection. Do not substitute a run from a delayed response.
                events = ownedEvents([...events, ...detail.events], id, mission.latestRun.id);
              }
            } catch (error) { evidenceError = error; }
          }
        }
        if (!current()) return;
        setState(previous => ({ id, data: { mission, events: evidenceError && !events.length && previous.data && previous.data.mission.latestRun?.id === mission.latestRun?.id ? previous.data.events : events, ...(request !== undefined ? { request } : {}) }, ...(evidenceError ? { evidenceError } : {}) }));
      } catch (error) {
        if (current()) setState(previous => ({ ...previous, id, error }));
      } finally {
        controllers.delete(controller);
        if (current()) {
          clearTimeout(polling);
          // Queue workers can have a separate event bus. REST also bounds recovery after packet loss.
          polling = setTimeout(() => void reload(), 1500);
        }
      }
    };
    refresh.current = reload;
    void reload();
    const connect = () => {
      if (!active) return;
      source = new EventSource(`${missionPath(id)}/stream`);
      source.onopen = () => { if (active) { backoff = 500; setDisconnected(false); void reload(); } };
      const update = (event: MessageEvent<string>) => {
        try { if (envelopeBelongsToMission(JSON.parse(event.data) as EventEnvelope, id)) void reload(); } catch { /* Ignore malformed transport frames, not evidence. */ }
      };
      for (const kind of ['mission_update', 'run_update', 'exec_event']) source.addEventListener(kind, update as EventListener);
      source.onerror = () => {
        source?.close();
        if (!active) return;
        setDisconnected(true);
        reconnect = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 8000);
      };
    };
    connect();
    return () => { active = false; ++serial; source?.close(); clearTimeout(polling); clearTimeout(reconnect); controllers.forEach(controller => controller.abort()); };
  }, [id, execution]);
  const reload = useCallback(() => refresh.current(), []);
  return { ...(state.id === id ? state : { id }), disconnected, reload };
}

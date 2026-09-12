import type { ExecutionEvent } from "../../shared/types.js";

type OrderedRunEvent = Pick<ExecutionEvent, "id" | "runId" | "missionId" | "seq" | "ts">;

/**
 * Merge append-only execution events without ever crossing a run boundary.
 *
 * Event sequence numbers restart at 1 for every run, so filtering only by the
 * mission would interleave two executions and corrupt every derived surface
 * (phase, files, tests and timeline). Existing events are filtered as well as
 * incoming events so switching runs atomically discards the previous run.
 */
export function mergeEventsForRun<T extends OrderedRunEvent>(
  previous: T[],
  incoming: readonly T[],
  missionId: string,
  runId: string
): T[] {
  const scopedPrevious = previous.filter(
    (event) => event.missionId === missionId && event.runId === runId
  );
  const byId = new Map(scopedPrevious.map((event) => [event.id, event]));
  let changed = scopedPrevious.length !== previous.length;

  for (const event of incoming) {
    if (event.missionId !== missionId || event.runId !== runId || byId.has(event.id)) continue;
    byId.set(event.id, event);
    changed = true;
  }

  if (!changed) return previous;
  return [...byId.values()].sort((a, b) => a.seq - b.seq || a.ts.localeCompare(b.ts));
}

import type { ExecutionEvent } from "../../shared/types.js";

/** Event families that provide evidence for each visible execution phase. */
export const EXECUTION_PHASE_TYPES = [
  ["workspace"],
  ["environment", "provision"],
  ["analysis", "plan", "diagnosis", "plan_revision"],
  ["file_change", "agent_message"],
  ["test_run", "test_result", "quality_check"],
  ["pr_prepared", "approval_gate", "release"],
] as const satisfies readonly (readonly ExecutionEvent["type"][])[];

/**
 * Find the newest event that actually belongs to a phase. Budget updates,
 * retries and diagnostics are timeline facts and must not clear the active rail.
 */
export function latestMappedPhaseIndex(events: readonly Pick<ExecutionEvent, "type">[]): number {
  for (let eventIndex = events.length - 1; eventIndex >= 0; eventIndex -= 1) {
    const eventType = events[eventIndex].type;
    const phaseIndex = EXECUTION_PHASE_TYPES.findIndex((types) =>
      (types as readonly ExecutionEvent["type"][]).includes(eventType)
    );
    if (phaseIndex >= 0) return phaseIndex;
  }
  return -1;
}

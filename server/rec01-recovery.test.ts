import { test } from 'node:test';

/**
 * Spec: api.mission-execute
 * Scenario: execute-dispatch-must-reach-terminal-or-recoverable
 * Given Inline or worker dispatch accepts an eligible run.
 * When Runtime processing proceeds or a bounded fault occurs.
 * Then The request produces one owned run that reaches succeeded failed budget_exhausted blocked or cancelled with endedAt persisted within the documented timeout; an accepted row alone is not completion.
 */
test.todo("api.mission-execute / execute-dispatch-must-reach-terminal-or-recoverable — Phase 2 implementation pending");

/**
 * Spec: page.execution-room
 * Scenario: execution-room-preserves-failure-and-recovery
 * Given A run fails stalls is cancelled loses its stream or is interrupted by restart.
 * When The page reloads or reconnects.
 * Then The last persisted evidence and explicit recoverable outcome remain visible without invented progress or cross-run data.
 */
test.todo("page.execution-room / execution-room-preserves-failure-and-recovery — Phase 2 implementation pending");

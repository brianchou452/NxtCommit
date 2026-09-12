import { test } from 'node:test';

/**
 * Spec: page.execution-room
 * Scenario: execution-room-keeps-queue-separate-from-work
 * Given Queue dispatch returns a request before any worker owns or starts a run.
 * When The page polls queued leased completed failed or cancelled request states.
 * Then It reports request ownership separately and shows runner activity only after a matching run and events exist.
 */
test.todo("page.execution-room / execution-room-keeps-queue-separate-from-work — Phase 2 implementation pending");

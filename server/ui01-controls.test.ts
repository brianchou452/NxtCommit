import { test } from 'node:test';

/**
 * Spec: component.execution-activity
 * Scenario: activity-rejects-cross-run-events
 * Given Stored and live events contain delayed frames from a prior run.
 * When Activity adopts a new active run.
 * Then Every prior-run frame and derived test/file/phase summary is removed before the new timeline renders.
 */
test.todo("component.execution-activity / activity-rejects-cross-run-events — Phase 2 implementation pending");

/**
 * Spec: page.execution-room
 * Scenario: execution-room-isolates-active-run
 * Given A mission starts a later retry while prior REST and SSE responses remain in flight.
 * When The active run changes.
 * Then Old-run events tests files phase and summaries are discarded and every accepted update matches both current missionId and runId.
 */
test.todo("page.execution-room / execution-room-isolates-active-run — Phase 2 implementation pending");

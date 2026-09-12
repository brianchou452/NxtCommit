import { test } from 'node:test';

/**
 * Spec: api.mission-detail
 * Scenario: mission-detail-nests-only-owned-evidence
 * Given Several missions have concurrent runs pledges ledger rows artifacts and reviews.
 * When One mission detail is requested.
 * Then Every nested record belongs to that mission and absent optional evidence stays absent.
 */
test.todo("api.mission-detail / mission-detail-nests-only-owned-evidence — Phase 2 implementation pending");

/**
 * Spec: api.mission-stream
 * Scenario: mission-stream-never-crosses-mission-or-run
 * Given Concurrent missions and sequential retries publish overlapping updates.
 * When Clients subscribe disconnect and reconnect.
 * Then Each stream receives only its mission and clients accept execution frames only for the selected active run before REST revalidation.
 */
test.todo("api.mission-stream / mission-stream-never-crosses-mission-or-run — Phase 2 implementation pending");

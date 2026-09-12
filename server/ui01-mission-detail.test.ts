
/**
 * Spec: page.mission-detail
 * Scenario: mission-detail-keeps-partial-failures-local
 * Given Mission detail succeeds while explanation or comment-wall loading fails.
 * When The page renders its partial error state and the user retries.
 * Then Campaign content lifecycle action and any pledge intent remain intact while only the failed region reloads.
 */
// Docker UI acceptance: e2e/mission-execution.e2e.spec.ts,
// "lost pledge response retries the same intent; local failures retain campaign".

/**
 * Spec: page.mission-detail
 * Scenario: mission-detail-discards-stale-route-work
 * Given A mission detail explanation wall or mutation response is still pending.
 * When Navigation changes to a different mission id.
 * Then The prior mission state is cleared immediately and no late response can populate or mutate the new route.
 */
// Docker UI acceptance: e2e/mission-execution.e2e.spec.ts,
// "same-SPA navigation discards an unmounted pending dispatch response".
// Mission-id transport filtering also executes in server/ui01-controls.test.ts.

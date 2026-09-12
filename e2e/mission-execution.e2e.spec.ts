import { test, expect, type Page } from '@playwright/test';

async function reset(page: Page, origin = '') {
  await page.goto(`${origin}/`);
  await page.getByRole('button', { name: 'Reset demo data', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Demo data reset.' })).toBeVisible();
}
async function pledge(page: Page, amount: string) {
  await page.getByRole('button', { name: 'Pledge compute credits', exact: true }).click();
  await page.getByLabel('Amount', { exact: true }).fill(amount);
  await page.getByRole('button', { name: 'Commit credits', exact: true }).click();
}
/** Spec: page.execution-room / execution-room-reaches-evidenced-terminal; page.mission-detail / mission-detail-actions-follow-state. */
test('UI funding → engine terminal → persisted review evidence', async ({ page }) => {
  await reset(page);
  await page.goto('/missions/mission-fixture');
  await expect(page.getByTestId('mission-overview')).toContainText('Generator: demo');
  await pledge(page, '100');
  await expect(page).toHaveURL(/mission-fixture\/run$/);
  await expect(page.getByTestId('run-status')).toHaveText('succeeded', { timeout: 25000 });
  await expect(page.getByTestId('mission-status').first()).toHaveText('Ready for review');
  await expect(page.getByTestId('running-pulse')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Inspect change evidence' })).toBeVisible();
  await expect(page.getByTestId('execution-event').filter({ hasText: 'Source: demo' }).first()).toBeVisible();
  await expect(page.getByTestId('execution-event').filter({ hasText: 'Engine verified' }).first()).toBeVisible();
  const evidence = page.getByTestId('execution-event');
  const before = await evidence.count();
  await page.getByRole('button', { name: 'Reload evidence' }).click();
  await expect(evidence).toHaveCount(before);
  await page.reload();
  await expect(page.getByTestId('run-status')).toHaveText('succeeded');
  await expect(evidence).toHaveCount(before);
  await page.getByRole('link', { name: 'Inspect change evidence' }).click();
  await expect(page).toHaveURL(/\/review$/);
});
/** Spec: component.pledge-dialog / retry-preserves-pledge-intent; page.mission-detail / mission-detail-keeps-partial-failures-local. */
test('lost pledge response retries the same intent; local failures retain campaign', async ({ page }) => {
  const origin = 'http://127.0.0.1:4191';
  await reset(page, origin);
  await page.goto(`${origin}/missions/mission-fixture`);
  await expect(page.getByTestId('mission-wall')).toContainText('unavailable');
  await expect(page.getByTestId('mission-explanation')).toContainText('unavailable');
  await page.getByTestId('mission-explanation').getByRole('button', { name: 'Retry' }).click();
  const intents: { key: string | undefined; body: string | null }[] = [];
  page.on('request', request => { if (request.url().endsWith('/pledge')) intents.push({ key: request.headers()['idempotency-key'], body: request.postData() }); });
  await pledge(page, '10');
  await expect(page.getByRole('alert').filter({ hasText: 'Controlled lost response' })).toBeVisible();
  // The optional-region retry finishes while the modal intent is active; its
  // failure must not remount the dialog or change the retry key/body.
  await expect(page.getByTestId('mission-explanation')).toContainText('unavailable');
  await expect(page.getByLabel('Amount', { exact: true })).toHaveValue('10');
  await page.getByRole('button', { name: 'Commit credits', exact: true }).click();
  await expect(page.getByTestId('pledge-dialog')).toHaveCount(0);
  expect(intents).toHaveLength(2); expect(intents[0]).toEqual(intents[1]); expect(intents[0]?.key).toBeTruthy();
  const response = await page.request.get(`${origin}/api/missions/mission-fixture`);
  const mission = await response.json(); expect(mission.computePledged).toBe(10); expect(mission.pledges).toHaveLength(1);
  await page.getByRole('button', { name: 'Pledge compute credits', exact: true }).click();
  await page.getByLabel('Amount', { exact: true }).fill('90');
  await page.getByRole('button', { name: 'Commit credits', exact: true }).click();
  await expect(page.getByTestId('run-status')).toHaveText('succeeded', { timeout: 25000 });
  expect(intents[2]?.key).not.toBe(intents[0]?.key);
});
/** Spec: page.mission-detail / mission-detail-refuses-metadata-only-execution; overview-keeps-unknown-measurements-absent. */
test('metadata refuses execution and missing route cannot retain campaign', async ({ page }) => {
  await reset(page); await page.goto('/missions/mission-metadata');
  await expect(page.getByTestId('execution-refusal')).toContainText('read-only metadata');
  await expect(page.getByRole('button', { name: 'Start fixture execution' })).toHaveCount(0);
  await expect(page.getByTestId('mission-overview')).not.toContainText('weekly downloads');
  await page.goto('/missions/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Mission not found' })).toBeVisible();
  await expect(page.getByTestId('mission-overview')).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mission not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Discover' }).click();
  await expect(page).toHaveURL('/');
});
/** Spec: page.execution-room / execution-room-keeps-queue-separate-from-work. */
test('UI dispatch queues without inventing runner activity', async ({ page }) => {
  const origin = 'http://127.0.0.1:4192';
  await reset(page, origin); await page.goto(`${origin}/missions/mission-ready/run`);
  await expect(page.getByTestId('execution-idle')).toContainText('No run is active');
  await page.getByRole('button', { name: 'Start fixture execution' }).click();
  await expect(page.getByTestId('execution-idle')).toContainText('Waiting for an execution worker');
  await expect(page.getByTestId('execution-event')).toHaveCount(0);
  await expect(page.getByTestId('running-pulse')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reload evidence' }).click();
  await expect(page.getByTestId('execution-idle')).toContainText('queued');
  await expect(page.getByRole('button', { name: 'Start fixture execution' })).toHaveCount(0);
});
/** Spec: page.execution-room / execution-room-preserves-failure-and-recovery; execution-room-isolates-active-run. */
test('bounded failure retains old outcome and retry adopts only the new run', async ({ page }) => {
  const origin = 'http://127.0.0.1:4193';
  await reset(page, origin); await page.goto(`${origin}/missions/mission-ready/run`);
  await page.getByRole('button', { name: 'Start fixture execution' }).click();
  await expect(page.getByTestId('run-status')).toHaveText(/^(failed|blocked|cancelled|budget_exhausted)$/, { timeout: 25000 });
  await expect(page.getByTestId('execution-activity')).toBeVisible();
  const oldRun = await page.getByTestId('execution-activity').getAttribute('data-run-id');
  await page.getByRole('button', { name: 'Reload evidence' }).click();
  await expect(page.getByTestId('running-pulse')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start fixture execution' }).click();
  await expect(page.getByTestId('execution-activity')).not.toHaveAttribute('data-run-id', oldRun!);
  await expect(page.getByTestId('run-status')).toHaveText(/^(failed|blocked|cancelled|budget_exhausted)$/, { timeout: 25000 });
  const current = await page.getByTestId('execution-activity').getAttribute('data-run-id');
  for (const event of await page.getByTestId('execution-event').all()) expect(await event.getAttribute('data-run-id')).toBe(current);
  await expect(page.getByTestId('execution-facts')).toHaveAttribute('data-run-id', current!);
  const persisted = await (await page.request.get(`${origin}/api/runs/${current}`)).json();
  expect(persisted.run.endedAt).toBeTruthy(); expect(Number.isFinite(Date.parse(persisted.run.endedAt))).toBe(true);
});
/**
 * Spec: page.execution-room
 * Scenario: execution-room-isolates-active-run
 * Given A mission starts a later retry while prior REST and SSE responses remain in flight.
 * When The active run changes.
 * Then Old-run events tests files phase and summaries are discarded and every accepted update matches both current missionId and runId.
 */
test('late prior-run and cross-mission SSE frames cannot contaminate retry evidence', async ({ page }) => {
  const origin = 'http://127.0.0.1:4193';
  await reset(page, origin); await page.goto(`${origin}/missions/mission-ready/run`);
  await page.getByRole('button', { name: 'Start fixture execution' }).click();
  await expect(page.getByTestId('run-status')).toHaveText('failed', { timeout: 25000 });
  const oldRun = await page.getByTestId('execution-activity').getAttribute('data-run-id');
  await page.getByRole('button', { name: 'Start fixture execution' }).click();
  await expect(page.getByTestId('execution-activity')).not.toHaveAttribute('data-run-id', oldRun!);
  await expect(page.getByTestId('run-status')).toHaveText('failed', { timeout: 25000 });
  await expect.poll(async () => (await (await page.request.get(`${origin}/api/e2e/transport-faults`)).json()).injected).toBeGreaterThan(0);
  // Fetching is observational; both executions were dispatched through the UI.
  await page.getByRole('button', { name: 'Reload evidence' }).click();
  const current = await page.getByTestId('execution-activity').getAttribute('data-run-id');
  await expect(page.getByTestId('execution-facts')).toHaveAttribute('data-run-id', current!);
  for (const event of await page.getByTestId('execution-event').all()) expect(await event.getAttribute('data-run-id')).toBe(current);
  await expect(page.locator('body')).not.toContainText('STALE_TRANSPORT_MARKER');
  await expect(page.locator('body')).not.toContainText('stale-file.ts');
  await expect(page.getByTestId('running-pulse')).toHaveCount(0);
});
/** Spec: page.execution-room / execution-room-keeps-queue-separate-from-work / execution-room-reaches-evidenced-terminal. */
test('UI queue dispatch is claimed by worker and reaches persisted terminal', async ({ page }) => {
  const origin = 'http://127.0.0.1:4194';
  await reset(page, origin); await page.goto(`${origin}/missions/mission-ready/run`);
  await page.getByRole('button', { name: 'Start fixture execution' }).click();
  await expect(page.getByTestId('run-status')).toHaveText('succeeded', { timeout: 25000 });
  await expect(page.getByRole('link', { name: 'Inspect change evidence' })).toBeVisible();
  await expect(page.getByTestId('running-pulse')).toHaveCount(0);
  await expect(page.getByText(/Run request: completed/)).toBeVisible();
  const snapshot = await (await page.request.get(`${origin}/api/missions/mission-ready/run-request`)).json();
  expect(snapshot.request.resultRunId).toBe(await page.getByTestId('execution-activity').getAttribute('data-run-id'));
  await page.reload(); await expect(page.getByTestId('run-status')).toHaveText('succeeded');
});
/** Spec: page.execution-room / execution-room-preserves-failure-and-recovery. */
test('stream disconnect remains visible, then reconnect revalidates the same persisted run', async ({ page }) => {
  const origin = 'http://127.0.0.1:4191';
  await reset(page, origin); await page.goto(`${origin}/missions/mission-terminal/run`);
  await expect(page.getByRole('status').filter({ hasText: 'Connection interrupted' })).toBeVisible();
  await expect(page.getByTestId('execution-event')).toHaveCount(1);
  await expect(page.getByTestId('execution-activity')).toHaveAttribute('data-run-id', 'seed-terminal-run');
  await expect(page.getByRole('status').filter({ hasText: 'Connection interrupted' })).toHaveCount(0, { timeout: 15000 });
  await page.getByRole('button', { name: 'Reload evidence' }).click();
  await expect(page.getByTestId('execution-event')).toHaveCount(1);
  await expect(page.getByTestId('running-pulse')).toHaveCount(0);
});
/** Spec: page.mission-detail / mission-detail-discards-stale-route-work. */
test('same-SPA navigation discards an unmounted pending dispatch response', async ({ page }) => {
  const origin = 'http://127.0.0.1:4191';
  await reset(page, origin); await page.goto(`${origin}/missions/mission-ready`);
  const response = page.waitForResponse(value => value.url().endsWith('/mission-ready/execute'));
  await page.getByRole('button', { name: 'Start fixture execution' }).click();
  await page.getByRole('navigation', { name: 'NxtCommit', exact: true }).getByRole('link', { name: 'Discover', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/`);
  await page.goBack();
  await expect(page).toHaveURL(`${origin}/missions/mission-ready`);
  await response;
  await expect(page).toHaveURL(`${origin}/missions/mission-ready`);
  await expect(page.getByTestId('mission-overview')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Starting…' })).toHaveCount(0);
  await expect(page.getByTestId('mission-explanation')).toContainText('unavailable');
});
/** Spec: component.execution-activity / activity-renders-event-payload-union. */
test('authored seed event details preserve demo provenance', async ({ page }) => {
  await reset(page); await page.goto('/missions/mission-terminal/run');
  await expect(page.getByText('Authored seed evidence — not fresh engine verification.')).toBeVisible();
  await expect(page.getByTestId('running-pulse')).toHaveCount(0);
  const details = page.getByTestId('execution-event').locator('details');
  for (const item of await details.all()) { await item.locator('summary').click(); await expect(item.locator('pre')).toBeVisible(); }
  await expect(page.getByTestId('execution-event').first()).toContainText('Not engine verified');
});

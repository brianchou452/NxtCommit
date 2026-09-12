import { test, expect, type Page } from '@playwright/test';
// Approved historical references remain read-only. Differences are reported, never blessed here.
async function reset(page: Page, origin = '') {
  await page.goto(`${origin}/`);
  await page.getByRole('button', { name: 'Reset demo data', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Demo data reset.' })).toBeVisible();
}
const pageBaselines = [
  ['mission-detail-funding', 'mission-fixture', false, 1200],
  ['mission-detail-funded-fixture', 'mission-ready', false, 1000],
  ['mission-detail-metadata-refusal', 'mission-metadata', false, 1000],
  ['mission-detail-needs-review', 'mission-terminal', false, 1200],
  ['mission-detail-error-recovery', 'does-not-exist', false, 1000],
  ['execution-room-idle', 'mission-fixture', true, 1000],
  ['execution-room-terminal', 'mission-terminal', true, 1200],
  ['execution-room-running-demo', 'mission-running', true, 1200],
] as const;
for (const [baseline, id, execution, height] of pageBaselines) {
  // Spec: visual.mission-detail / visual.execution-room; baseline ID is the test name.
  test(baseline, async ({ page }) => {
    const origin = id === 'mission-running' ? 'http://127.0.0.1:4191' : '';
    await page.setViewportSize({ width: 1440, height }); await reset(page, origin);
    await page.goto(`${origin}/missions/${id}${execution ? '/run' : ''}`);
    if (id === 'does-not-exist') await expect(page.getByRole('heading', { name: 'Mission not found' })).toBeVisible();
    else if (execution) await expect(page.getByRole('heading', { name: 'Live execution' })).toBeVisible();
    else { await expect(page.getByTestId('mission-overview')).toBeVisible(); await expect(page.getByTestId('mission-wall')).toContainText('No notes yet.'); await expect(page.getByTestId('project-explanation-content')).toBeVisible(); }
    if (id === 'mission-running') await expect(page.getByRole('status').filter({ hasText: 'Connection interrupted' })).toHaveCount(0, { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${baseline}.png`, { fullPage: true, animations: 'disabled' });
  });
}
test('execution-room-queued', async ({ page }) => {
  // Spec: visual.execution-room / execution-room-queued.
  await page.setViewportSize({ width: 1440, height: 1000 });
  const origin = 'http://127.0.0.1:4192'; await reset(page, origin);
  await page.goto(`${origin}/missions/mission-ready/run`);
  await page.getByRole('button', { name: 'Start fixture execution' }).click();
  await expect(page.getByTestId('execution-idle')).toContainText('Waiting for an execution worker');
  await expect(page).toHaveScreenshot('execution-room-queued.png', { fullPage: true, animations: 'disabled' });
});
test('mission-overview-funding', async ({ page }) => {
  // Spec: visual.mission-overview / mission-overview-funding.
  await page.setViewportSize({ width: 1440, height: 1200 }); await reset(page); await page.goto('/missions/mission-fixture');
  await expect(page.getByTestId('mission-overview')).toHaveScreenshot('component-mission-overview-funding.png', { animations: 'disabled' });
});
for (const error of [false, true]) test(`pledge-dialog-${error ? 'error' : 'ready'}`, async ({ page }) => {
  // Spec: visual.pledge-dialog / pledge-dialog-ready / pledge-dialog-error.
  await page.setViewportSize({ width: 1440, height: 1000 });
  const origin = error ? 'http://127.0.0.1:4191' : '';
  await reset(page, origin); await page.goto(`${origin}/missions/mission-fixture`);
  await page.getByRole('button', { name: 'Pledge compute credits', exact: true }).click();
  if (error) { await page.getByLabel('Amount', { exact: true }).fill('1'); await page.getByRole('button', { name: 'Commit credits' }).click(); await expect(page.getByTestId('pledge-dialog').getByRole('alert')).toBeVisible(); }
  await expect(page.getByTestId('pledge-dialog')).toHaveScreenshot(`component-pledge-dialog-${error ? 'error' : 'ready'}.png`, { animations: 'disabled' });
});
test('execution-activity-terminal', async ({ page }) => {
  // Spec: visual.execution-activity / execution-activity-terminal.
  await page.setViewportSize({ width: 1440, height: 1200 }); await reset(page); await page.goto('/missions/mission-terminal/run');
  await expect(page.getByTestId('execution-activity')).toHaveScreenshot('component-execution-activity-terminal.png', { animations: 'disabled' });
});

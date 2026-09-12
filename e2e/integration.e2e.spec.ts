import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function launch(page: Page, role: 'maintainer' | 'provider') {
  await page.goto('/demo');
  const reset = page.waitForResponse(r => r.url().endsWith('/api/demo/reset') && r.request().method() === 'POST');
  await page.getByRole('button', { name: `Start ${role} walkthrough`, exact: true }).click();
  expect((await reset).status()).toBe(200);
  await expect(page.getByTestId('guide')).toContainText('Use the highlighted product control to continue.');
}
async function fund(page: Page) {
  await page.getByRole('button', { name: 'Pledge compute credits', exact: true }).click();
  await page.getByRole('button', { name: 'Max', exact: true }).click();
  await page.getByRole('button', { name: 'Commit credits', exact: true }).click();
  await expect(page.getByTestId('run-status')).toHaveText('succeeded', { timeout: 20000 });
  await expect(page.getByTestId('execution-event').filter({ hasText: 'Engine verified' }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Inspect change evidence', exact: true }).click();
  await expect(page.getByTestId('review-controls')).toBeVisible();
}

// Specs: page.new-mission, page.marketplace, page.mission-detail, page.execution-room,
// page.review, page.contributor-profile, page.guided-demo. Every mutation uses a visible control.
test('Integrated maintainer authoring → funding → fresh engine evidence → review → profile → reset', async ({ page, context }, info) => {
  await launch(page, 'maintainer');
  await page.getByRole('button', { name: 'Analyze repository', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Parse compound durations' })).toBeChecked();
  await page.getByRole('button', { name: 'Generate draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publish local mission', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Publish local mission', exact: true }).click();
  await page.getByRole('link', { name: 'Open local mission', exact: true }).click();
  const missionId = new URL(page.url()).pathname.split('/')[2]!;
  const explanation = page.getByTestId('project-explanation-content');
  await expect(explanation).toContainText('Static fallback');
  await expect(explanation).toContainText('Editorial estimate; no measured impact is claimed.');
  await explanation.getByText('Technical summary', { exact: true }).click();
  await expect(explanation).toContainText('No future execution or publication is promised.');
  const observer = await context.newPage();
  await observer.goto('/marketplace');
  await expect(observer.locator(`[data-mission-id="${missionId}"]`)).toHaveCount(1);
  await page.getByLabel('Leave a local note').fill('A local end-to-end review note.');
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.getByTestId('comment-wall')).toContainText('A local end-to-end review note.');
  await fund(page);
  await expect(page.getByRole('button', { name: 'Approve local demo', exact: true })).toBeEnabled();
  const detail = await (await page.request.get(`/api/missions/${missionId}`)).json();
  expect(detail.artifact.testEvidenceSource).toBe('engine');
  expect(detail.artifact.dossier.baseline.total).toBe(2);
  expect(detail.artifact.dossier.experiments.at(-1).passed).toBe(5);
  expect(detail.latestRun.endedAt).toBeTruthy();
  await expect(observer.locator(`[data-mission-id="${missionId}"]`).first()).toContainText('Under verification');
  await page.screenshot({ path: info.outputPath('fresh-duration-review.png'), fullPage: true });
  await page.getByRole('button', { name: 'Approve local demo', exact: true }).click();
  await expect(page.getByTestId('mission-status')).toHaveText('approved');
  await expect(page.getByTestId('guide')).toContainText('The local walkthrough is complete.');
  await page.reload(); await expect(page.getByTestId('mission-status')).toHaveText('approved');
  await page.getByRole('link', { name: 'My Commitment', exact: true }).click();
  await expect(page.getByTestId('contributor-impact')).toContainText('Approved locally');
  const profile = await (await page.request.get('/api/contributors/demo-contributor')).json();
  expect(profile.pledges.some((p: { missionId: string }) => p.missionId === missionId)).toBe(true);
  await page.getByRole('button', { name: 'Reset demo data', exact: true }).click();
  await expect(page).toHaveURL('/');
  expect((await page.request.get(`/api/missions/${missionId}`)).status()).toBe(404);
  await expect(observer.locator(`[data-mission-id="${missionId}"]`)).toHaveCount(0);
  await observer.close();
});

test('Integrated provider guide reaches fresh evidence with read-only review and persistent credits', async ({ page }) => {
  await launch(page, 'provider');
  const campaign = page.locator('[data-guide-target="campaign"]');
  await expect(campaign).toHaveAttribute('href', '/missions/mission-fixture?demo=provider');
  await campaign.click();
  await fund(page);
  await expect(page.getByRole('button', { name: 'Approve local demo' })).toHaveCount(0);
  await expect(page.getByTestId('guide')).toContainText('The local walkthrough is complete.');
  const mission = await (await page.request.get('/api/missions/mission-fixture')).json();
  expect(mission.latestRun.status).toBe('succeeded'); expect(mission.computeConsumed).toBe(4); expect(mission.computeReserved).toBe(0);
  expect(mission.ledger.filter((row: { type: string }) => row.type === 'consume')).toHaveLength(1);
  await page.getByRole('button', { name: 'Exit walkthrough', exact: true }).click();
  await expect(page.getByTestId('guide')).toHaveCount(0);
});

test('Integrated request-changes retries to a new owned run before approval', async ({ page }) => {
  await page.goto('/demo'); await page.getByRole('button', { name: 'Reset demo data', exact: true }).click();
  await page.goto('/missions/mission-fixture'); await fund(page);
  const first = await (await page.request.get('/api/missions/mission-fixture')).json();
  await page.getByLabel('Review comment', { exact: true }).fill('Recheck the bounded regression evidence.');
  await page.getByRole('button', { name: 'Request changes', exact: true }).click();
  await expect(page.getByTestId('mission-status')).toHaveText('changes_requested');
  await page.getByRole('link', { name: 'Open local mission', exact: true }).click();
  await page.getByRole('button', { name: 'Start fixture execution', exact: true }).click();
  await expect(page.getByTestId('run-status')).toHaveText('succeeded');
  const second = await (await page.request.get('/api/missions/mission-fixture')).json();
  expect(second.latestRun.id).not.toBe(first.latestRun.id);
  expect(second.artifact.runId).toBe(second.latestRun.id);
  await page.getByRole('link', { name: 'Inspect change evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Approve local demo', exact: true }).click();
  await expect(page.getByTestId('mission-status')).toHaveText('approved');
});

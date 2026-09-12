import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const candidates = join(process.env.E2E_OUTPUT_DIRECTORY ?? 'test-results', 'candidates');
async function capture(subject: Page | Locator, golden: string, fullPage = false) {
  mkdirSync(candidates, { recursive: true });
  await subject.screenshot({ path: join(candidates, golden), animations: 'disabled', ...(fullPage ? { fullPage: true } : {}) });
  // Preserve approved baselines. User authorized YAML ordering, then human review
  // of new images; capturing candidates does not grant baseline approval.
  await expect(subject).toHaveScreenshot(golden, { animations: 'disabled', ...(fullPage ? { fullPage: true } : {}) });
}
async function fixtureDraft(page: Page) {
  await page.goto('/new'); await page.getByRole('button', { name: 'Analyze repository', exact: true }).click();
  await page.getByRole('radio', { name: 'Parse compound durations' }).check();
  await page.getByRole('button', { name: 'Generate demo draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Compute estimate', exact: true })).toBeVisible();
}
async function review(page: Page, provider = false) {
  await page.goto('/new'); await page.getByRole('button', { name: 'Reset demo data', exact: true }).click(); await expect(page).toHaveURL(/\/$/);
  await page.goto(`/missions/review-demo/review${provider ? '?perspective=provider' : ''}`); await expect(page.getByTestId('dossier')).toBeVisible();
}
// Spec: visual.new-mission; Baseline: new-mission-source-step; status: approved.
test('new-mission-source-step', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/new');
  await expect(page.getByRole('button', { name: 'Analyze repository', exact: true })).toBeVisible(); await capture(page, 'new-mission-source-step.png', true);
});
// Spec: visual.new-mission; Baseline: new-mission-draft-step; status: approved.
test('new-mission-draft-step', async ({ page }) => { await page.setViewportSize({ width: 1440, height: 1200 }); await fixtureDraft(page); await capture(page, 'new-mission-draft-step.png', true); });
// Spec: visual.repository-analyzer; Baseline: repository-analyzer-results; status: approved.
test('repository-analyzer-results', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 }); await page.goto('/new'); await page.getByRole('button', { name: 'Analyze repository', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose an observed issue' })).toBeVisible(); await capture(page.getByRole('region', { name: 'Measurement coverage', exact: true }), 'component-repository-analyzer-results.png');
});
// Spec: visual.campaign-authoring; Baseline: campaign-authoring-draft; status: approved.
test('campaign-authoring-draft', async ({ page }) => { await page.setViewportSize({ width: 1440, height: 1200 }); await fixtureDraft(page); await capture(page.getByRole('region', { name: 'Campaign', exact: true }), 'component-campaign-authoring-draft.png'); });
// Spec: visual.review; Baseline: review-dossier-ready; status: approved.
test('review-dossier-ready', async ({ page }) => { await page.setViewportSize({ width: 1440, height: 1400 }); await review(page); await capture(page, 'review-dossier-ready.png', true); });
for (const [spec, baseline, locator] of [
  ['visual.verification-dossier', 'verification-dossier-ready', 'dossier'],
  ['visual.diff-viewer', 'diff-viewer-ready', 'diff'],
  ['visual.review-controls', 'review-controls-maintainer', 'review-controls'],
] as const) {
  // Spec and baseline IDs are the explicit entries above; all retain approved status.
  test(`${spec} / ${baseline}`, async ({ page }) => { await page.setViewportSize({ width: 1440, height: 1400 }); await review(page); await capture(page.getByTestId(locator), `component-${baseline}.png`); });
}
// Spec: visual.review-controls; Baseline: review-controls-provider-read-only; status: approved.
test('review-controls-provider-read-only', async ({ page }) => { await page.setViewportSize({ width: 1440, height: 1400 }); await review(page, true); await expect(page.getByRole('button', { name: 'Approve local demo' })).toHaveCount(0); await capture(page.getByTestId('review-controls'), 'component-review-controls-provider-read-only.png'); });
for (const concept of ['editorial', 'kickstarter', 'network', 'hybrid']) {
  // Spec: visual.design-concepts; Baseline: design-concept-<concept>; status: approved.
  test(`design-concept-${concept}`, async ({ page }) => { await page.setViewportSize({ width: 1440, height: 1200 }); await page.goto(`/concepts/${concept}`); await expect(page.locator('footer')).toContainText('all metrics and identities are demo data'); await capture(page, `design-concept-${concept}.png`, true); });
}
// Spec: visual.design-concepts; Baseline: design-concept-hybrid-campaign; status: approved.
test('design-concept-hybrid-campaign', async ({ page }) => { await page.setViewportSize({ width: 1440, height: 1200 }); await page.goto('/concepts/hybrid/campaign'); await expect(page.getByRole('slider')).toBeVisible(); await capture(page, 'design-concept-hybrid-campaign.png', true); });

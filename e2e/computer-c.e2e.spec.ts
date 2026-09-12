import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function resetFromUi(page: Page) {
  await page.goto('/new');
  await page.getByRole('button', { name: 'Reset demo data', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('status').filter({ hasText: 'Demo data reset.' })).toHaveText('Demo data reset.');
}
async function generate(page: Page) {
  await page.goto('/new');
  await page.getByRole('button', { name: 'Analyze repository', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose an observed issue' })).toBeVisible();
  await page.getByRole('radio', { name: 'Parse compound durations' }).check();
  await page.getByRole('button', { name: 'Generate demo draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Compute estimate', exact: true })).toBeVisible();
}

/**
 * Spec: page.new-mission
 * Scenario: wizard-is-semantically-visible
 * Given Visitor opens the New Mission route in a real browser.
 * When The initial source step renders.
 * Then The page-owned heading and Analyze control are visibly rendered with non-zero opacity.
 */
test('wizard-is-semantically-visible', async ({ page }) => {
  await page.goto('/new');
  const heading = page.getByRole('heading', { name: 'Create a mission', exact: true });
  await expect(heading).toBeVisible(); await expect(heading).toHaveCSS('opacity', '1');
  await expect(page.getByRole('button', { name: 'Analyze repository', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: /Import from GitHub/ }).check();
  await expect(page.getByLabel('Public GitHub repository URL')).toBeVisible();
});

/**
 * Spec: page.new-mission
 * Scenario: wizard-preserves-trusted-capabilities
 * Given Visitor progresses from analysis to publication.
 * When Each asynchronous step completes or fails.
 * Then The UI preserves server provenance and never treats client edits as trusted repository facts.
 * Spec: component.campaign-authoring
 * Scenario: authoring-separates-model-and-policy
 * Given A trusted issue may use real or demo generation.
 * When Draft and critique render.
 * Then Generator provenance is separate from deterministic estimate and publish remains local.
 */
test('wizard publishes one persisted local mission with advisory and estimate provenance', async ({ page }) => {
  await resetFromUi(page); await generate(page);
  await expect(page.getByText(/Generator: Demo generator/)).toBeVisible();
  await expect(page.getByText('Planning allowance, not a provider token bill.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review campaign', exact: true }).click();
  await expect(page.getByText(/Generator: Static fallback/)).toBeVisible();
  await page.getByRole('button', { name: 'Publish local mission', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Local mission created' })).toBeVisible();
  await page.getByRole('link', { name: 'Open local mission', exact: true }).click();
  await expect(page).toHaveURL(/\/missions\/[a-f0-9-]+$/); const url = page.url();
  await expect(page.getByText('funding', { exact: true })).toBeVisible();
  await page.reload(); await expect(page).toHaveURL(url); await expect(page.getByRole('heading', { name: 'Parse compound durations' })).toBeVisible();
  await expect(page.getByText('Repository execution is unavailable in this runtime.', { exact: true })).toBeVisible();
});

/**
 * Spec: component.repository-analyzer
 * Scenario: github-analysis-stays-metadata-only
 * Given User selects a public GitHub repository.
 * When Analysis completes.
 * Then Coverage identifies metadata observations and UI makes no clone full-tree or execution claim.
 */
test('public metadata retry preserves input, loading, scope advice and non-executable publication', async ({ page }) => {
  await page.goto('http://127.0.0.1:4192/new');
  await page.getByRole('radio', { name: /Import from GitHub/ }).check();
  const input = page.getByLabel('Public GitHub repository URL'); await input.fill('https://github.com/PrimeIntellect-ai/prime-agent');
  await page.getByRole('button', { name: 'Analyze repository', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reading repository observations…' })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('Your input is preserved'); await expect(input).toHaveValue('https://github.com/PrimeIntellect-ai/prime-agent');
  await page.getByRole('button', { name: 'Analyze repository', exact: true }).click();
  await expect(page.getByText('Unknown / not measured', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Observed public issue fixture' }).check();
  await page.getByRole('button', { name: 'Suggest issue scope', exact: true }).click();
  await expect(page.getByText(/Generator: Static fallback/)).toBeVisible();
  await page.getByRole('button', { name: 'Helpful', exact: true }).click(); await expect(page.getByText(/Feedback submitted as local-demo-user/)).toBeVisible();
  await page.getByRole('button', { name: 'Generate demo draft', exact: true }).click();
  await expect(page.getByText(/Public metadata only; the repository is not cloned or executed/)).toBeVisible();
  await expect(page.getByText(/· low$/)).toBeVisible();
  await page.getByRole('button', { name: 'Publish local mission', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Local mission created' })).toBeVisible();
});

test('wizard capability invalidated by another tab UI reset requires fresh analysis', async ({ page, context }) => {
  await generate(page);
  const other = await context.newPage(); await resetFromUi(other); await other.close();
  await page.getByRole('button', { name: 'Publish local mission', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('The capability expired or was reset. Analyze the repository again.');
  await expect(page.getByRole('button', { name: 'Publish local mission', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Analyze again', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze repository', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose an observed issue' })).toBeVisible();
});

/**
 * Spec: page.review
 * Scenario: review-keeps-deterministic-evidence-primary
 * Given A mission has a local review artifact.
 * When Human and optional AI review features are used.
 * Then Deterministic evidence remains first and only local lifecycle actions occur.
 * Spec: component.diff-viewer
 * Scenario: diff-is-local-engine-artifact
 * Given Engine produced a baseline-relative artifact.
 * When Reviewer inspects files.
 * Then Persisted changes render without implying a pushed branch or GitHub PR.
 * Spec: component.verification-dossier
 * Scenario: dossier-separates-suite-and-criteria
 * Given Aggregate tests and criterion evidence may differ.
 * When Dossier renders.
 * Then Suite success is not presented as proof for an unsupported criterion and unreadable stays unknown.
 */
test('review keeps seeded dossier and diff before advice; local approval survives reload', async ({ page }) => {
  await resetFromUi(page); await page.goto('/missions/review-demo/review');
  await expect(page.getByText('Authored demo evidence — not fresh engine verification', { exact: true })).toBeVisible();
  await expect(page.getByTestId('dossier')).toContainText('Unknown / not measured');
  await expect(page.getByTestId('dossier')).toContainText('Passing suites do not prove every acceptance criterion.');
  const order = await page.locator('[data-testid="dossier"], [data-testid="diff"], [data-testid="advisory"]').evaluateAll(elements => elements.map(element => element.getAttribute('data-testid')));
  expect(order).toEqual(['dossier', 'diff', 'advisory']);
  await page.getByText('parser.test.js · +1 −0', { exact: true }).click(); await expect(page.getByTestId('diff').getByText('+ assert.equal(parse(" 1h "), 3600);', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Explain evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Run shadow review', exact: true }).click(); await expect(page.getByText('affectedGate: false', { exact: true })).toHaveCount(3);
  await page.getByRole('button', { name: 'Approve local demo', exact: true }).click(); await expect(page.getByTestId('mission-status')).toHaveText('approved');
  await page.reload(); await expect(page.getByTestId('mission-status')).toHaveText('approved'); await expect(page.getByRole('button', { name: 'Approve local demo', exact: true })).toBeDisabled();
});

/**
 * Spec: component.review-controls
 * Scenario: controls-cannot-bypass-gate
 * Given Advisory findings may be positive while deterministic gate is not reviewable.
 * When Controls render.
 * Then Decision remains unavailable until mission state authorizes it and request changes requires feedback.
 */
test('request changes requires feedback, persists and updates another tab over SSE', async ({ page, context }) => {
  await resetFromUi(page); await page.goto('/missions/review-demo/review');
  const other = await context.newPage(); await other.goto('/missions/review-demo/review');
  await expect(other.getByTestId('mission-status')).toHaveText('needs_review');
  await page.getByRole('button', { name: 'Request changes', exact: true }).click(); await expect(page.getByRole('alert')).toHaveText('Feedback is required when requesting changes.');
  await page.getByLabel('Review comment', { exact: true }).fill('Please add a regression test.');
  await page.getByRole('button', { name: 'Request changes', exact: true }).click(); await expect(page.getByTestId('mission-status')).toHaveText('changes_requested');
  await expect(other.getByTestId('mission-status')).toHaveText('changes_requested'); await other.close();
  await page.reload(); await expect(page.getByTestId('mission-status')).toHaveText('changes_requested');
});

test('review empty and initial read/stream failure recover through refresh', async ({ page }) => {
  await page.goto('/missions/missing/review'); await expect(page.getByRole('alert')).toContainText('No review artifact');
  await page.getByRole('button', { name: 'Refresh evidence', exact: true }).click(); await expect(page.getByRole('button', { name: 'Approve local demo', exact: true })).toHaveCount(0);
  await page.goto('http://127.0.0.1:4192/missions/review-demo/review');
  await expect(page.getByRole('alert')).toContainText('No review artifact');
  await page.getByRole('button', { name: 'Refresh evidence', exact: true }).click();
  await expect(page.getByTestId('dossier')).toBeVisible(); await expect(page.getByTestId('mission-status')).toHaveText('needs_review');
});

/**
 * Spec: page.design-concepts
 * Scenario: concepts-remain-clearly-nonproduction
 * Given Visitor opens a concept route.
 * When Static mock interactions render.
 * Then No product API effect occurs and the exploration disclosure remains visible.
 * Spec: component.design-concept-shell
 * Scenario: standalone-concept-shell-has-no-product-effects
 * Given Visitor opens a concept home or campaign route
 * When They navigate, switch local language, or adjust mock backing controls
 * Then Only local exploration state changes and the demo disclosure remains present
 */
test('all concept directions navigate and mock backing stays local with no API calls', async ({ page }) => {
  const calls: string[] = []; page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.url()); });
  await page.goto('/concepts/editorial');
  for (const concept of ['kickstarter', 'network', 'hybrid', 'editorial']) {
    await page.getByRole('link', { name: concept, exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/concepts/${concept}$`));
    await expect(page.locator('footer')).toHaveText('Campaign concept · all metrics and identities are demo data');
  }
  await page.getByRole('link', { name: 'hybrid', exact: true }).click(); await page.getByRole('link', { name: 'Open mock campaign', exact: true }).first().click();
  await page.getByRole('slider', { name: 'Mock backing amount', exact: true }).fill('900'); await page.getByRole('button', { name: 'Preview backing', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Mock backing preview updated.' })).toHaveText('Mock backing preview updated. No pledge was created.');
  await page.getByRole('button', { name: '中文', exact: true }).click(); await expect(page.locator('footer')).toHaveText('Campaign 概念展示 · 所有數據與人物皆為示意');
  expect(calls).toEqual([]);
});

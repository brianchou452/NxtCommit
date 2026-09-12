import { test, expect } from '@playwright/test';

test('foundation locale persists through navigation and reload; route focus is recoverable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#hero h1')).toBeVisible();
  await page.getByLabel('Language', { exact: true }).selectOption('zh-TW');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(page.locator('#hero h1')).toBeVisible();
  await page.getByRole('link', { name: 'New Mission' }).click();
  await expect(page).toHaveURL(/\/new$/);
  await expect(page.locator('main')).toBeFocused();
  await page.reload();
  await expect(page.getByRole('combobox')).toHaveValue('zh-TW');
  await page.goto('/unknown-foundation-route');
  await expect(page.getByRole('heading', { name: '找不到這個頁面。' })).toBeVisible();
  await page.getByRole('link', { name: 'Discover', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#hero h1')).toBeVisible();
});

test('declared deep links load the foundation router, not a server 404', async ({ page }) => {
  for (const route of ['/new', '/missions/example/run', '/missions/example/review', '/concepts/example/overview']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: 'Shared foundation' })).toBeVisible();
    await expect(page.getByText('This route is a Phase 1 placeholder. Product workflows are not implemented yet.')).toBeVisible();
  }
});

// Spec: component.application-shell; Scenario: shell-preserves-local-demo-and-locale-boundaries.
test('shell exposes refusal, supports local profile navigation and UI reset', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('Execution unavailable', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Compute credits', { exact: true })).toHaveText('10,000');
  await expect(page.getByText('Local demo identities and compute credits. No authentication, payments or upstream publication.')).toBeVisible();
  await page.getByRole('link', { name: 'My Commitment' }).click();
  await expect(page).toHaveURL(/\/contributors\/demo-contributor$/);
  const resetResponse = page.waitForResponse(response => response.url().endsWith('/api/demo/reset') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  expect((await resetResponse).status()).toBe(200);
  await expect(page.getByRole('status').filter({ hasText: 'Demo data reset.' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('server-owned bootstrap and reset failures recover through visible controls', async ({ page }) => {
  await page.goto('http://127.0.0.1:4178/new');
  await expect(page.getByRole('alert')).toContainText('NxtCommit could not load its session data.');
  await expect(page.getByLabel('Compute credits', { exact: true })).toHaveText('—');
  await expect(page.getByText('Execution unavailable', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByLabel('Compute credits', { exact: true })).toHaveText('7');
  const resetRequests: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/demo/reset')) resetRequests.push(request.url()); });
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await expect(page.getByRole('button', { name: 'Resetting…' })).toBeDisabled();
  await expect(page.getByRole('alert')).toHaveText('Demo data could not be reset.');
  await expect(page).toHaveURL(/\/new$/);
  await expect(page.getByLabel('Compute credits', { exact: true })).toHaveText('7');
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await expect(page.getByRole('button', { name: 'Resetting…' })).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'Demo data reset.' })).toBeVisible();
  await expect(page).toHaveURL('http://127.0.0.1:4178/');
  await expect(page.getByLabel('Compute credits', { exact: true })).toHaveText('10,000');
  await page.reload();
  await expect(page.getByLabel('Compute credits', { exact: true })).toHaveText('10,000');
  expect(resetRequests).toHaveLength(2);
});

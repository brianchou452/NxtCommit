import { test, expect } from '@playwright/test';
test('Agent Lab exposes persisted terminal checks in both languages without fake activity', async ({page, request}) => {
  await page.goto('/assurance');
  await expect(page.getByRole('heading', {name: 'What are the agents testing? See for yourself.'})).toBeVisible();
  const response = await request.post('/api/assurance/run', {headers: {Authorization: 'Bearer test-assurance-operator-0000000000'}});
  expect(response.ok()).toBe(true); const run = await response.json(); expect(run.status).toBe('passed');
  await expect(page.locator('.assurance-result-number')).toHaveText('38 / 38');
  await expect(page.getByText(run.id, {exact:true})).toBeHidden();
  await page.getByText('Trace this record', {exact:true}).click();
  await expect(page.getByText(run.id, {exact:true})).toBeVisible();
  await page.getByText('Expand individual test evidence', {exact:true}).click();
  await expect(page.getByRole('cell', {name: 'worker-recovery · 2'})).toBeVisible();
  await expect(page.locator('.assurance-stage.completed')).toHaveCount(6);
  await expect(page.locator('.assurance-stage.running')).toHaveCount(0);
  await page.getByRole('button', {name:/language/i}).click();
  await expect(page.locator('h1')).not.toHaveText('What are the agents testing? See for yourself.');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

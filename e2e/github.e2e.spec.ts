import { test, expect } from '@playwright/test';
const base = 'http://127.0.0.1:4202';
test.use({ baseURL: base });
test.beforeEach(async ({ page, request }) => {
  await request.post(`${base}/__fixture/config`, { data: { reset: true } });
  await page.addInitScript(() => localStorage.setItem('cc-locale', 'en'));
  await page.goto('/github');
  // This is an authored credential accepted only by the controlled GitHub transport.
  await page.getByLabel('GitHub access token', { exact: true }).fill('fixture-auth-token');
  await page.getByRole('button', { name: 'Connect GitHub', exact: true }).click();
  await expect(page.getByText('Connected as', { exact: false })).toBeVisible();
});
async function importSource(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Download and analyze source' }).click();
  await expect(page.getByRole('heading', { name: 'PrimeIntellect-ai/prime-agent', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Source file', exact: true }).selectOption('math.mjs');
  await expect(page.getByText('export const add = (a, b) => a - b;', { exact: true })).toBeVisible();
}
async function pledge(page: import('@playwright/test').Page) {
  await page.getByLabel('Implementation task').fill('Fix addition to return the sum of two numbers');
  await page.getByRole('button', { name: 'Commit credits and open draft PR' }).click();
}
test('UI source import → pledge → draft → AI code → measured tests → same PR ready → reload', async ({ page, request }) => {
  await importSource(page); await pledge(page);
  await expect(page.getByText('PR is ready for review', { exact: true })).toBeVisible({ timeout: 90000 });
  await expect(page.getByRole('link', { name: 'Open GitHub PR' })).toHaveAttribute('href', 'https://github.com/PrimeIntellect-ai/prime-agent/pull/42');
  await expect(page.getByText('Provider tokens: 120')).toBeVisible();
  await page.getByText('Source changes: math.mjs', { exact: true }).click();
  await expect(page.getByText('export const add = (a, b) => a + b;', { exact: true })).toBeVisible();
  const state = await (await request.get(`${base}/__fixture/state`)).json();
  const calls = state.calls as Array<{ path: string; method: string; body: any }>;
  expect(calls.filter(c => c.path.endsWith('/pulls') && c.method === 'POST')).toHaveLength(1);
  expect(calls.find(c => c.path.endsWith('/pulls') && c.method === 'POST')!.body.draft).toBe(true);
  const draftIndex = calls.findIndex(c => c.path.endsWith('/pulls') && c.method === 'POST');
  expect(calls.findIndex(c => c.method === 'PATCH')).toBeGreaterThan(draftIndex);
  expect(calls.findIndex(c => c.path === '/graphql')).toBeGreaterThan(calls.findIndex(c => c.method === 'PATCH'));
  expect(state.draft).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath('github-workspace.png'), fullPage: true });
  await page.reload(); await expect(page.getByText('PR is ready for review', { exact: true })).toBeVisible();
});
test('failed CI holds draft and recovery promotes without another pledge, PR or model call', async ({ page, request }) => {
  await request.post(`${base}/__fixture/config`, { data: { failChecks: true } });
  await importSource(page); await pledge(page);
  await expect(page.getByText('Waiting for required GitHub CI', { exact: true })).toBeVisible({ timeout: 90000 });
  let state = await (await request.get(`${base}/__fixture/state`)).json(); expect(state.draft).toBe(true);
  await request.post(`${base}/__fixture/config`, { data: { failChecks: false } });
  await page.getByRole('button', { name: 'Retry or check CI' }).click();
  await expect(page.getByText('PR is ready for review', { exact: true })).toBeVisible();
  state = await (await request.get(`${base}/__fixture/state`)).json();
  expect(state.commits).toBe(2);
  expect(state.calls.filter((c: any) => c.path.endsWith('/pulls') && c.method === 'POST')).toHaveLength(1);
});
test('failing AI patch never reaches branch publication or ready mutation', async ({ page, request }) => {
  await request.post(`${base}/__fixture/config`, { data: { modelFailure: true } });
  await importSource(page); await pledge(page);
  await expect(page.getByText('Stopped; draft PR remains recoverable', { exact: true })).toBeVisible({ timeout: 90000 });
  const state = await (await request.get(`${base}/__fixture/state`)).json(); expect(state.draft).toBe(true); expect(state.commits).toBe(1);
  expect(state.calls.some((c: any) => c.path === '/graphql' || c.method === 'PATCH')).toBe(false);
});
test('permission denial prevents funding and any GitHub mutation', async ({ page, request }) => {
  await request.post(`${base}/__fixture/config`, { data: { denied: true } });
  await importSource(page); await pledge(page);
  await expect(page.getByRole('alert')).toContainText('repository_write_required');
  const state = await (await request.get(`${base}/__fixture/state`)).json(); expect(state.opened).toBe(false); expect(state.commits).toBe(0);
});
test('truncated repository is rejected rather than presented as full source analysis', async ({ page, request }) => {
  await request.post(`${base}/__fixture/config`, { data: { truncated: true } });
  await page.getByRole('button', { name: 'Download and analyze source' }).click();
  await expect(page.getByRole('alert')).toContainText('repository_too_large');
  await expect(page.getByRole('button', { name: 'Commit credits and open draft PR' })).toHaveCount(0);
});

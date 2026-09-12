import { test, expect } from '@playwright/test';

test('workflow illustration requires explicit confirmation and preserves the concept boundary', async ({page}) => {
  await page.goto('/');
  const story = page.locator('#workflow');
  await expect(story.getByText('Interactive product concept · Not a live execution record')).toBeVisible();
  await story.getByRole('button', {name: /09\s*Next issue/}).click();
  await expect(story.getByText('Not confirmed: the next issue still uses v1. A proposal does not activate itself.')).toBeVisible();
  const confirmation = story.getByRole('button', {name: 'Simulate confirmation and open the next issue'});
  await confirmation.focus();
  await page.keyboard.press('Enter');
  await expect(story.getByText('Example v2: the next form issue requires keyboard E2E evidence. Missing or failed checks block acceptance.')).toBeVisible();
  await expect(story.getByRole('button', {name: 'Example v2 confirmed'})).toBeDisabled();
  await story.getByRole('button', {name: 'Reset example'}).click();
  await expect(confirmation).toBeEnabled();
  await page.getByRole('combobox', {name: 'Language'}).selectOption('zh-TW');
  await expect(story.getByRole('heading', {name: '任務修正', exact:true})).toBeVisible();
  await expect(page.getByRole('link', {name:'代理實驗室', exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

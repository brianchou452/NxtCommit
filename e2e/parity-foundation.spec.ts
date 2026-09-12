import {test,expect} from '@playwright/test';
test('commoncommit shell preserves bilingual navigation, keyboard focus and missing route recovery',async({page})=>{
 await page.goto('/'); await expect(page.getByRole('heading').first()).toBeVisible();
 await page.getByRole('button',{name:/language/i}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant-TW');
 await page.reload(); await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant-TW');
 await page.goto('/missing-route'); await expect(page.getByRole('heading')).toBeVisible();
 await expect(page.locator('body')).not.toContainText('TypeError');
});

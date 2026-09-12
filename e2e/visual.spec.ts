import { test, expect } from '@playwright/test';

// Spec: visual.application-shell; Baseline: application-shell-desktop; status: approved.
test('application-shell-desktop', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('Execution unavailable', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Compute credits', { exact: true })).toHaveText('10,000');
  // Foundation capability is refused because no runner is installed. The supplied
  // approved image shows a resolved demo runner, older logo and a different persona.
  // Preserve that oracle; this comparison reports the difference, never updates it.
  await expect(page.getByTestId('shell-header')).toHaveScreenshot('component-application-shell-desktop.png', { animations: 'disabled' });
});

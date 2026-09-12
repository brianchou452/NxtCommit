import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'github.e2e.spec.ts', workers: 1, retries: 0,
  timeout: 120000,
  outputDir: `${process.env.E2E_OUTPUT_DIRECTORY ?? 'test-results/github'}/artifacts`,
  reporter: [['list'], ['json', { outputFile: `${process.env.E2E_OUTPUT_DIRECTORY ?? 'test-results/github'}/results.json` }]],
  use: { baseURL: 'http://127.0.0.1:4202', browserName: 'chromium', locale: 'en', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});

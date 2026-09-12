import { defineConfig } from '@playwright/test';
import { join } from 'node:path';
const output = process.env.E2E_OUTPUT_DIRECTORY ?? 'test-results';
export default defineConfig({
  testDir: './e2e',
  snapshotPathTemplate: '{testDir}/golden/{arg}{ext}',
  outputDir: join(output, 'artifacts'),
  reporter: [['list'], ['json', { outputFile: join(output, 'results.json') }]],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4177', browserName: 'chromium',
    locale: 'en', timezoneId: 'Asia/Taipei', viewport: { width: 1440, height: 900 },
    contextOptions: { reducedMotion: 'reduce' }, trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  webServer: [{
    command: 'node dist-server/server/index.js', url: 'http://127.0.0.1:4177/healthz',
    reuseExistingServer: false, timeout: 30000,
    env: { HOST: '127.0.0.1', PORT: '4177', VAR_DIR: '/tmp/nxtcommit-playwright-state', EXECUTION_MODE: 'demo' },
  }, {
    command: 'node --import tsx e2e/fixture-server.ts', url: 'http://127.0.0.1:4178/healthz',
    reuseExistingServer: false, timeout: 30000,
  }, {
    command: 'node --import tsx e2e/mission-fixture-server.ts', url: 'http://127.0.0.1:4191/healthz',
    reuseExistingServer: false, timeout: 30000,
  }],
  projects: [
    { name: 'foundation', testMatch: 'foundation.spec.ts' },
    { name: 'product', testMatch: '*.e2e.spec.ts' },
    { name: 'mission', testMatch: 'mission-execution.e2e.spec.ts' },
    { name: 'mission-visual', testMatch: 'mission-execution.visual.spec.ts' },
    { name: 'visual', testMatch: 'visual.spec.ts' },
  ],
});

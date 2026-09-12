import { test, expect } from '@playwright/test';
import { createApplication } from '../server/app.js';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
let application: ReturnType<typeof createApplication>;
let server: Server;
let base: string;
test.beforeAll(async () => {
  application = createApplication({staticDirectory: resolve('dist'), demoProtection: {token: 'synthetic-browser-operator-token'}});
  server = application.app.listen(0, '127.0.0.1');
  await new Promise<void>(done => server.once('listening', done));
  base = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
});
test.afterAll(async () => { server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); await application.close(); });
test('protected guide starts without resetting another visitor progress', async ({page}) => {
  let resets = 0;
  page.on('request', request => { if (request.url().endsWith('/api/demo/reset')) resets++; });
  await page.goto(base+'/demo');
  await expect(page.getByRole('button', {name:'Reset demo data', exact:true})).toHaveCount(0);
  await expect(page.locator('.reset-disclosure')).toContainText('keeps existing progress');
  await page.getByRole('button', {name:'Start maintainer walkthrough', exact:true}).click();
  await expect(page).toHaveURL(base+'/new?demo=maintainer');
  await expect(page.getByRole('button', {name:'Analyze repository', exact:true})).toBeVisible();
  expect(resets).toBe(0);
  expect((await page.request.post(base+'/api/demo/reset')).status()).toBe(403);
});

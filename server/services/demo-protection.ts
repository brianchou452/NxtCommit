import { timingSafeEqual } from 'node:crypto';
import { backup } from 'node:sqlite';
import { mkdtemp, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Express, Request } from 'express';
import type { ServiceContext } from './context.js';

/** Protect shared destructive operations; not application-wide authentication. */
export function installDemoProtection(app: Express, context: ServiceContext, token?: string) {
  const allowed = (request: Request) => {
    if (!token || token.length < 24) return false;
    const expected = Buffer.from(`Bearer ${token}`);
    const actual = Buffer.from(request.headers.authorization ?? '');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  };
  let exporting = false;
  app.post('/api/demo/reset', (request, response, next) => {
    if (allowed(request)) { if (exporting) { response.sendStatus(409); return; } return next(); }
    response.status(403).json({code: 'demo_protected', error: 'Shared demo reset is restricted to the operator.'});
  });
  app.get('/api/demo/backup', async (request, response) => {
    if (!allowed(request)) { response.sendStatus(404); return; }
    if (exporting || context.authoring?.isResetting()) { response.sendStatus(409); return; }
    exporting = true;
    let directory: string | undefined;
    try {
      directory = await mkdtemp(join(tmpdir(), 'nxtcommit-backup-'));
      const destination = join(directory, 'nxtcommit.sqlite');
      await backup(context.store.db, destination);
      await chmod(destination, 0o600);
      response.setHeader('Cache-Control', 'no-store');
      await new Promise<void>((resolve, reject) => response.download(destination, 'nxtcommit.sqlite', error => error ? reject(error) : resolve()));
    } catch { if (!response.headersSent) response.sendStatus(503); }
    finally { exporting = false; if (directory) await rm(directory, {recursive: true, force: true}); }
  });
}

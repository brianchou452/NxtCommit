import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { acquireLease } from './lease.js';
import { UpdateControl } from '../self-update/control.js';

async function childReady(script: string, args: string[]) {
  const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let timer: NodeJS.Timeout;
  await Promise.race([
    once(child.stdout!, 'data'),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(Error('child_timeout'));
      }, 5000);
    }),
    once(child, 'exit').then(() => {
      throw Error('child_exited');
    }),
  ]).finally(() => clearTimeout(timer!));
  return child;
}
test('OS lease refuses concurrent workers and recovers after actual SIGKILL', async () => {
  const root = mkdtempSync(join(tmpdir(), 'agent-lease-'));
  const module = pathToFileURL(resolve('server/agents/lease.ts')).href;
  const child = await childReady(
    `import {acquireLease} from ${JSON.stringify(module)};await acquireLease(process.argv[1]);console.log('ready');setInterval(()=>{},1000);`,
    [join(root, 'lease.sqlite')],
  );
  try {
    await assert.rejects(acquireLease(join(root, 'lease.sqlite')), /agent_busy/);
    const exited = once(child, 'exit');
    child.kill('SIGKILL');
    await exited;
    const release = await acquireLease(join(root, 'lease.sqlite'));
    release();
    release();
  } finally {
    child.kill('SIGKILL');
    rmSync(root, { recursive: true, force: true });
  }
});
test('a killed activation is rolled back before a demo freeze is acknowledged', async () => {
  const root = mkdtempSync(join(tmpdir(), 'agent-crash-')),
    base = randomUUID(),
    candidate = randomUUID();
  const control = new UpdateControl(root);
  for (const id of [base, candidate]) {
    mkdirSync(join(root, 'releases', id, 'dist'), { recursive: true });
    writeFileSync(join(root, 'releases', id, 'dist/index.html'), id);
  }
  control.switchTo(base);
  const settings = await control.change({ enabled: true, demoLocked: false });
  const module = pathToFileURL(resolve('server/self-update/control.ts')).href;
  const child = await childReady(
    `import {UpdateControl} from ${JSON.stringify(module)};const [root,epoch,base,candidate]=process.argv.slice(1);await new UpdateControl(root).promote(epoch,base,candidate,()=>{console.log('switched');return new Promise(()=>{setInterval(()=>{},1000);});});`,
    [root, settings.epoch, base, candidate],
  );
  try {
    assert.equal(control.active(), candidate);
    const exited = once(child, 'exit');
    child.kill('SIGKILL');
    await exited;
    await control.change({ demoLocked: true });
    assert.equal(control.active(), base);
    const receipt = JSON.parse(readFileSync(join(root, 'promotions', candidate + '.json'), 'utf8'));
    assert.equal(receipt.reason, 'interrupted_activation');
    let calls = 0;
    assert.equal(
      await control.promote(settings.epoch, base, candidate, async () => {
        calls++;
        return true;
      }),
      'rolled-back',
    );
    assert.equal(calls, 0);
  } finally {
    child.kill('SIGKILL');
    rmSync(root, { recursive: true, force: true });
  }
});

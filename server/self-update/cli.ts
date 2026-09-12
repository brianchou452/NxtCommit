import { setTimeout as delay } from 'node:timers/promises';
import { homedir } from 'node:os';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { redactText } from '../authoring/analyzer.js';
import { UpdateControl } from './control.js';
import { initialize, iterate, smoke } from './runner.js';
import { authoringConfiguration } from '../authoring/configuration.js';
import { execFileSync } from 'node:child_process';

const control = new UpdateControl(resolve('var/self-update'));
const [command = 'status', ...args] = process.argv.slice(2);
const status = () => ({ ...control.read(), activeRelease: control.active(), effectiveEnabled: control.read().enabled && !control.read().demoLocked });

switch (command) {
  case 'goal': {
    const goal = args.join(' ').trim();
    if (!goal || goal.length > 2000 || redactText(goal) !== goal) throw new Error('invalid_goal');
    await control.change({ goal }); console.log(JSON.stringify(status())); break;
  }
  case 'on': await control.change({ enabled: true }); console.log(JSON.stringify(status())); break;
  case 'off': await control.change({ enabled: false }); console.log(JSON.stringify(status())); break;
  case 'demo-on': await control.change({ demoLocked: true }); console.log(JSON.stringify(status())); break;
  case 'demo-off': await control.change({ demoLocked: false }); console.log(JSON.stringify(status())); break;
  case 'status': console.log(JSON.stringify(status(), null, 2)); break;
  case 'init': {
    const docker = process.env.SELF_UPDATE_DOCKER ?? join(homedir(), '.docker/bin/docker');
    const context = process.env.SELF_UPDATE_DOCKER_CONTEXT ?? 'colima';
    const image = execFileSync(docker, ['--context', context, 'image', 'inspect', 'nxtcommit-foundation-e2e:0.1.0', '--format', '{{.Id}}'], { encoding: 'utf8', env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '' } }).trim();
    await initialize(control, { docker, context, image, applicationUrl: 'http://127.0.0.1:4188/' }); console.log(JSON.stringify(status())); break;
  }
  case 'run':
  case 'watch': {
    const cycles = command === 'run' ? 1 : Number(args[0] ?? 10);
    if (!Number.isInteger(cycles) || cycles < 1 || cycles > 100) throw new Error('cycles must be 1..100');
    const stopping = new AbortController();
    process.once('SIGINT', () => stopping.abort()); process.once('SIGTERM', () => stopping.abort());
    for (let cycle = 0; cycle < cycles && !stopping.signal.aborted; cycle++) {
      const settings = control.read();
      if (control.allowed(settings.epoch)) {
        if (existsSync('.env')) process.loadEnvFile('.env');
        const configuration = authoringConfiguration(process.env).model;
        if (!configuration) throw new Error('Model configuration is required');
        const result = await iterate(control, configuration, settings.goal); console.log(JSON.stringify(result));
        if (result.status === 'failed' || result.status === 'rolled-back') process.exitCode = 1;
      } else console.log(JSON.stringify({ status: 'disabled' }));
      if (cycle + 1 < cycles && !stopping.signal.aborted) await delay(300000, undefined, { signal: stopping.signal }).catch(() => {});
    }
    break;
  }
  case 'rollback': {
    await control.locked(async () => {
      if (control.read().demoLocked) throw new Error('demo_locked');
      const active = control.active(); if (!active) throw new Error('no_active_release');
      const manifest = JSON.parse(readFileSync(join(control.root, 'releases', active, 'manifest.json'), 'utf8')) as { base: string | null };
      if (!manifest.base) throw new Error('no_previous_release');
      control.switchTo(manifest.base);
      try { if (!await smoke(control)) throw new Error('unhealthy'); }
      catch { control.switchTo(active); throw new Error('rollback_smoke_failed'); }
    });
    console.log(JSON.stringify(status())); break;
  }
  default: throw new Error('Usage: npm run agents:update -- init|status|on|off|demo-on|demo-off|run|watch [cycles]|rollback|goal <text>');
}

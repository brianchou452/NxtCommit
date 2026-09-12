import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, lstatSync, symlinkSync, rmSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { UpdateControl, atomicJson } from './control.js';
import { editableFiles, propose } from './proposal.js';
import type { SourceFiles } from './proposal.js';
import type { ModelConfiguration } from '../authoring/assistance.js';

const childEnvironment = () => Object.fromEntries(['PATH', 'HOME', 'DOCKER_HOST', 'DOCKER_CONTEXT'].flatMap(key => process.env[key] ? [[key, process.env[key]!]] : []));
function git(args: string[]): string { return execFileSync('git', args, { encoding: 'utf8', env: childEnvironment() }).trim(); }
function files(directory: string): string[] {
  return readdirSync(directory).sort().flatMap(name => {
    const path = join(directory, name); const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error('symlink_in_artifact');
    return stat.isDirectory() ? files(path) : [path];
  });
}
export function digest(directory: string): string {
  const hash = createHash('sha256');
  for (const path of files(directory)) hash.update(relative(directory, path)).update(readFileSync(path));
  return hash.digest('hex');
}
function snapshot(destination: string) {
  if (git(['status', '--porcelain'])) throw new Error('clean_source_required');
  mkdirSync(destination, { recursive: true });
  for (const path of git(['ls-files', '-z']).split('\0').filter(Boolean)) {
    if (path.startsWith('.env') || path.startsWith('.git/') || path.split('/').includes('..')) continue;
    if (!lstatSync(path).isFile()) throw new Error('snapshot_requires_regular_files');
    mkdirSync(join(destination, path, '..'), { recursive: true }); cpSync(path, join(destination, path));
  }
}
interface RuntimeConfiguration { image: string; docker: string; context: string; applicationUrl: string }
export function runtime(control: UpdateControl): RuntimeConfiguration {
  const value = JSON.parse(readFileSync(join(control.root, 'runtime.json'), 'utf8')) as RuntimeConfiguration;
  if (!/^sha256:[a-f0-9]{64}$/.test(value.image) || typeof value.docker !== 'string' || !value.docker.startsWith('/') || typeof value.context !== 'string') throw new Error('invalid_runtime');
  const url = new URL(value.applicationUrl);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('invalid_application_url');
  return value;
}
export async function initialize(control: UpdateControl, configuration: RuntimeConfiguration) {
  await control.locked(() => {
    if (control.active()) throw new Error('already_initialized');
    atomicJson(join(control.root, 'runtime.json'), configuration); runtime(control);
    const id = randomUUID(); const release = join(control.root, 'releases', id); mkdirSync(release, { recursive: true });
    snapshot(join(release, 'source')); cpSync('dist', join(release, 'dist'), { recursive: true });
    atomicJson(join(release, 'manifest.json'), { id, base: null, kind: 'operator-baseline', commit: git(['rev-parse', 'HEAD']), distHash: digest(join(release, 'dist')) });
    control.switchTo(id);
  });
  await control.change({ enabled: false, demoLocked: true });
}
function sources(directory: string): SourceFiles {
  return Object.fromEntries(editableFiles.map(path => [path, readFileSync(join(directory, path), 'utf8')])) as SourceFiles;
}

/** No host execution fallback. Source/tests are read-only; only build/artifact directories are writable. */
export async function verifyCandidate(control: UpdateControl, source: string, output: string, signal: AbortSignal) {
  const config = runtime(control); const name = `nxtcommit-update-${randomUUID()}`;
  for (const part of ['dist', 'dist-server', 'out']) mkdirSync(join(output, part), { recursive: true });
  // This link resolves only inside the pinned verification image, never to host dependencies.
  symlinkSync('/app/node_modules', join(source, 'node_modules'));
  const args = ['--context', config.context, 'run', '--rm', '--name', name, '--init', '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=2g', '--cpus=2', '--pids-limit=256', '--shm-size=512m', '--user', `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`, '--tmpfs', '/tmp:rw,nosuid,size=512m,mode=1777', '-e', 'HOME=/tmp', '-e', 'npm_config_cache=/tmp/npm-cache', '-e', 'VAR_DIR=/tmp/nxtcommit-state', '-e', 'E2E_OUTPUT_DIRECTORY=/out', '--workdir', '/source', '--mount', `type=bind,source=${source},target=/source,readonly`, '--mount', `type=bind,source=${join(output, 'dist')},target=/source/dist`, '--mount', `type=bind,source=${join(output, 'dist-server')},target=/source/dist-server`, '--mount', `type=bind,source=${join(output, 'out')},target=/out`, config.image, 'sh', '-c',
    'npm run typecheck && npm test && node --import tsx server/self-update/quality-cli.ts && npm run build && ./node_modules/.bin/playwright test --project=foundation --project=computer-c'];
  const log: Buffer[] = []; let bytes = 0;
  try {
    await new Promise<void>((done, fail) => {
      const child = spawn(config.docker, args, { env: childEnvironment(), stdio: ['ignore', 'pipe', 'pipe'] });
      const capture = (part: Buffer) => { if (bytes < 1_000_000) { log.push(part.subarray(0, 1_000_000 - bytes)); bytes += part.length; } };
      child.stdout.on('data', capture); child.stderr.on('data', capture);
      const stop = () => {
        child.kill('SIGTERM');
        spawn(config.docker, ['--context', config.context, 'rm', '-f', name], { env: childEnvironment(), stdio: 'ignore' }).on('error', () => {});
      };
      signal.addEventListener('abort', stop, { once: true });
      const timer = setTimeout(stop, 240000);
      child.on('error', error => { clearTimeout(timer); signal.removeEventListener('abort', stop); fail(error); });
      child.on('close', code => { clearTimeout(timer); signal.removeEventListener('abort', stop); code === 0 && !signal.aborted ? done() : fail(new Error(signal.aborted ? 'cancelled' : 'verification_failed')); });
      if (signal.aborted) stop();
    });
  } finally {
    // No credentials are supplied to this container; logs stay in ignored local storage.
    writeFileSync(join(output, 'verification.log'), Buffer.concat(log), { mode: 0o600 });
    rmSync(join(source, 'node_modules'), { force: true });
    try { execFileSync(config.docker, ['--context', config.context, 'rm', '-f', name], { env: childEnvironment(), stdio: 'ignore', timeout: 10000 }); } catch { /* --rm normally already removed it. */ }
  }
}
export async function smoke(control: UpdateControl): Promise<boolean> {
  const url = runtime(control).applicationUrl;
  for (const path of ['readyz', '']) {
    const response = await fetch(url + path, { redirect: 'error', signal: AbortSignal.timeout(3000) });
    const body = await response.text();
    if (!response.ok || (path === '' && !body.includes('<div id="root">'))) return false;
  }
  return true;
}
export async function iterate(control: UpdateControl, configuration: ModelConfiguration, goal: string) {
  const settings = control.read();
  if (!control.allowed(settings.epoch)) return { status: 'disabled' };
  const base = control.active(); if (!base) throw new Error('not_initialized');
  const runLock = join(control.root, 'iteration.lock'); mkdirSync(runLock);
  const id = randomUUID(); const candidate = join(control.root, 'candidates', id); mkdirSync(candidate, { recursive: true });
  const abort = new AbortController();
  const poll = setInterval(() => { if (!control.allowed(settings.epoch)) abort.abort(); }, 100);
  const stop = () => abort.abort(); process.once('SIGINT', stop); process.once('SIGTERM', stop);
  let status = 'failed';
  try {
    const baseSource = join(control.root, 'releases', base, 'source');
    const model = await propose(configuration, sources(baseSource), goal, abort.signal);
    atomicJson(join(candidate, 'proposal.json'), model);
    if (!control.allowed(settings.epoch)) status = 'cancelled';
    else if (model.proposal.edits.length === 0) status = 'no-change';
    else {
      if (readdirSync(join(control.root, 'releases')).length >= 20) throw new Error('release_retention_limit');
      const source = join(candidate, 'source'); cpSync(baseSource, source, { recursive: true });
      for (const edit of model.proposal.edits) {
        const path = join(source, edit.path); writeFileSync(path, readFileSync(path, 'utf8').replace(edit.before, edit.after));
      }
      for (const path of ['dist', 'dist-server']) mkdirSync(join(source, path), { recursive: true });
      const sourceHash = digest(source);
      await verifyCandidate(control, source, candidate, abort.signal);
      if (digest(source) !== sourceHash) throw new Error('source_integrity_failed');
      if (!control.allowed(settings.epoch)) status = 'cancelled';
      else {
        const release = join(control.root, 'releases', id); mkdirSync(release);
        cpSync(source, join(release, 'source'), { recursive: true }); cpSync(join(candidate, 'dist'), join(release, 'dist'), { recursive: true });
        // Preserve content-hashed assets for pages opened before a release switch.
        const oldAssets = join(control.root, 'releases', base, 'dist', 'assets');
        if (existsSync(oldAssets)) cpSync(oldAssets, join(release, 'dist', 'assets'), { recursive: true, force: false, errorOnExist: false });
        atomicJson(join(release, 'manifest.json'), { id, base, kind: 'model-candidate', evidence: model.evidence, sourceHash, distHash: digest(join(release, 'dist')), gates: ['typecheck', 'server-tests', 'request-quality', 'production-build', 'foundation-e2e', 'computer-c-e2e'] });
        status = await control.promote(settings.epoch, base, id, () => smoke(control));
      }
    }
  } catch { status = abort.signal.aborted ? 'cancelled' : 'failed'; }
  finally {
    clearInterval(poll); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
    atomicJson(join(candidate, 'result.json'), { id, base, status, endedAt: new Date().toISOString() }); rmSync(runLock, { recursive: true });
  }
  return { id, base, status };
}

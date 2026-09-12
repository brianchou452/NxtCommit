import { acquireLease } from '../agents/lease.js';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  lstatSync,
  symlinkSync,
  rmSync,
} from 'node:fs';
import { join, resolve, relative, basename } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { UpdateControl, atomicJson } from './control.js';
import { workflow } from '../agents/workflow.js';
import { AgentTrace } from '../agents/telemetry.js';
import { editableFiles, propose, validateProposal } from './proposal.js';
import type { SourceFiles } from './proposal.js';
import type { ModelConfiguration } from '../authoring/assistance.js';

const childEnvironment = () =>
  Object.fromEntries(
    ['PATH', 'HOME', 'DOCKER_HOST', 'DOCKER_CONTEXT'].flatMap((key) =>
      process.env[key] ? [[key, process.env[key]!]] : [],
    ),
  );
function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', env: childEnvironment() }).trim();
}
function files(directory: string): string[] {
  return readdirSync(directory)
    .sort()
    .flatMap((name) => {
      const path = join(directory, name);
      const stat = lstatSync(path);
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
    mkdirSync(join(destination, path, '..'), { recursive: true });
    cpSync(path, join(destination, path));
  }
}
interface RuntimeConfiguration {
  image: string;
  docker: string;
  context: string;
  applicationUrl: string;
}
export function runtime(control: UpdateControl): RuntimeConfiguration {
  const value = JSON.parse(readFileSync(join(control.root, 'runtime.json'), 'utf8')) as RuntimeConfiguration;
  if (
    !/^sha256:[a-f0-9]{64}$/.test(value.image) ||
    typeof value.docker !== 'string' ||
    !value.docker.startsWith('/') ||
    typeof value.context !== 'string'
  )
    throw new Error('invalid_runtime');
  const url = new URL(value.applicationUrl);
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    !url.port ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('invalid_application_url');
  return value;
}
export async function initialize(control: UpdateControl, configuration: RuntimeConfiguration) {
  await control.locked(() => {
    if (control.active()) throw new Error('already_initialized');
    atomicJson(join(control.root, 'runtime.json'), configuration);
    runtime(control);
    const id = randomUUID();
    const release = join(control.root, 'releases', id);
    mkdirSync(release, { recursive: true });
    snapshot(join(release, 'source'));
    cpSync('dist', join(release, 'dist'), { recursive: true });
    atomicJson(join(release, 'manifest.json'), {
      id,
      base: null,
      kind: 'operator-baseline',
      commit: git(['rev-parse', 'HEAD']),
      distHash: digest(join(release, 'dist')),
    });
    control.switchTo(id);
  });
  await control.change({ enabled: false, demoLocked: true });
}
function sources(directory: string): SourceFiles {
  return Object.fromEntries(
    editableFiles.map((path) => [path, readFileSync(join(directory, path), 'utf8')]),
  ) as SourceFiles;
}

/** No host execution fallback. Source/tests are read-only; only build/artifact directories are writable. */
export async function verifyCandidate(
  control: UpdateControl,
  source: string,
  output: string,
  signal: AbortSignal,
) {
  const config = runtime(control);
  const name = `nxtcommit-update-${basename(output)}`;
  for (const part of ['dist', 'dist-server', 'out']) mkdirSync(join(output, part), { recursive: true });
  // Recover only this candidate's abandoned verifier after an operator resume.
  try {
    execFileSync(config.docker, ['--context', config.context, 'rm', '-f', name], {
      env: childEnvironment(),
      stdio: 'ignore',
      timeout: 10000,
    });
  } catch {
    /* absent is expected */
  }
  rmSync(join(source, 'node_modules'), { force: true });
  // This link resolves only inside the pinned verification image, never to host dependencies.
  symlinkSync('/app/node_modules', join(source, 'node_modules'));
  const args = [
    '--context',
    config.context,
    'run',
    '--rm',
    '--name',
    name,
    '--init',
    '--network=none',
    '--read-only',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--memory=2g',
    '--cpus=2',
    '--pids-limit=256',
    '--shm-size=512m',
    '--user',
    `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
    '--tmpfs',
    '/tmp:rw,nosuid,size=512m,mode=1777',
    '--tmpfs',
    '/app/node_modules/.vite-temp:rw,nosuid,size=32m,mode=1777',
    '-e',
    'HOME=/tmp',
    '-e',
    'npm_config_cache=/tmp/npm-cache',
    '-e',
    'VAR_DIR=/tmp/nxtcommit-state',
    '-e',
    'E2E_OUTPUT_DIRECTORY=/out',
    '--workdir',
    '/source',
    '--mount',
    `type=bind,source=${source},target=/source,readonly`,
    '--mount',
    `type=bind,source=${join(output, 'dist')},target=/source/dist`,
    '--mount',
    `type=bind,source=${join(output, 'dist-server')},target=/source/dist-server`,
    '--mount',
    `type=bind,source=${join(output, 'out')},target=/out`,
    config.image,
    'sh',
    '-c',
    'npm run typecheck && npm test && node --import tsx server/self-update/quality-cli.ts && npm run build && ./node_modules/.bin/playwright test --project=foundation --project=product',
  ];
  const log: Buffer[] = [];
  let bytes = 0;
  try {
    await new Promise<void>((done, fail) => {
      const child = spawn(config.docker, args, {
        env: childEnvironment(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const capture = (part: Buffer) => {
        if (bytes < 1_000_000) {
          log.push(part.subarray(0, 1_000_000 - bytes));
          bytes += part.length;
        }
      };
      child.stdout.on('data', capture);
      child.stderr.on('data', capture);
      const stop = () => {
        child.kill('SIGTERM');
        spawn(config.docker, ['--context', config.context, 'rm', '-f', name], {
          env: childEnvironment(),
          stdio: 'ignore',
        }).on('error', () => {});
      };
      signal.addEventListener('abort', stop, { once: true });
      const timer = setTimeout(stop, 240000);
      child.on('error', (error) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', stop);
        fail(error);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', stop);
        code === 0 && !signal.aborted
          ? done()
          : fail(new Error(signal.aborted ? 'cancelled' : 'verification_failed'));
      });
      if (signal.aborted) stop();
    });
  } finally {
    // No credentials are supplied to this container; logs stay in ignored local storage.
    writeFileSync(join(output, 'verification.log'), Buffer.concat(log), { mode: 0o600 });
    rmSync(join(source, 'node_modules'), { force: true });
    try {
      execFileSync(config.docker, ['--context', config.context, 'rm', '-f', name], {
        env: childEnvironment(),
        stdio: 'ignore',
        timeout: 10000,
      });
    } catch {
      /* --rm normally already removed it. */
    }
  }
}
export async function smoke(control: UpdateControl): Promise<boolean> {
  const url = runtime(control).applicationUrl;
  for (const path of ['readyz', '']) {
    const response = await fetch(url + path, { redirect: 'error', signal: AbortSignal.timeout(3000) });
    const body = await response.text();
    if (
      !response.ok ||
      (path === '' &&
        (response.headers.get('x-nxtcommit-static-release') !== control.active() ||
          body !== readFileSync(join(control.root, 'current/dist/index.html'), 'utf8')))
    )
      return false;
  }
  return true;
}
export async function iterate(
  control: UpdateControl,
  configuration: ModelConfiguration,
  goal: string,
  resumeId?: string,
  operations = { propose, verifyCandidate, smoke },
) {
  const settings = control.read();
  if (!control.allowed(settings.epoch)) return { status: 'disabled' };
  if (resumeId && !/^[a-f0-9-]{36}$/.test(resumeId)) throw Error('invalid_run_id');
  if (existsSync(join(control.root, 'iteration.lock'))) throw Error('legacy_iteration_lock');
  let release: () => void;
  try {
    release = await acquireLease(join(control.root, 'iteration-lock.sqlite'));
  } catch (error) {
    if ((error as Error).message === 'agent_busy') return { status: 'busy' };
    throw error;
  }
  const id = resumeId ?? randomUUID();
  const candidate = join(control.root, 'candidates', id);
  const trace = new AgentTrace('self-update', id);
  const abort = new AbortController();
  const poll = setInterval(() => {
    if (!control.allowed(settings.epoch)) abort.abort();
  }, 100);
  const stop = () => abort.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  let status = 'failed';
  let failureReason: string | undefined;
  let base: string | null = null;
  let contextAccepted = false;
  try {
    await control.locked(() => {}); // Reconcile an interrupted activation before reading its base.
    mkdirSync(candidate, { recursive: true, mode: 0o700 });
    const signature = createHash('sha256')
      .update(digest('server'))
      .update(digest('shared'))
      .update(readFileSync('package-lock.json'))
      .update(JSON.stringify(runtime(control)))
      .update(configuration.model)
      .update(goal)
      .digest('hex');
    type Context = { base: string; epoch: string; signature: string };
    const context: Context = resumeId
      ? (JSON.parse(readFileSync(join(candidate, 'context.json'), 'utf8')) as Context)
      : { base: control.active() ?? '', epoch: settings.epoch, signature };
    base = context.base;
    if (!base) throw Error('not_initialized');
    if (context.epoch !== settings.epoch || context.signature !== signature)
      throw Error('checkpoint_identity_mismatch');
    if (control.active() !== base && control.active() !== id) throw Error('active_release_changed');
    contextAccepted = true;
    if (!resumeId) atomicJson(join(candidate, 'context.json'), context);
    const baseSource = join(control.root, 'releases', base, 'source');
    const source = join(candidate, 'source');
    const read = <T>(file: string): T => JSON.parse(readFileSync(join(candidate, file), 'utf8')) as T;
    type ModelResult = Awaited<ReturnType<typeof propose>>;
    const model = () => read<ModelResult>('proposal.json');
    const sourceHash = () => read<{ sourceHash: string }>('prepared.json').sourceHash;
    const allowed = () => !abort.signal.aborted && control.allowed(context.epoch);
    status = await workflow({
      database: join(control.root, 'checkpoints.sqlite'),
      runId: id,
      identity: signature + context.epoch,
      trace,
      allowed,
      ...(resumeId ? { resume: true } : {}),
      stages: [
        {
          name: 'propose',
          run: async () => {
            // An acknowledged proposal is reused after a crash before checkpoint commit.
            if (!existsSync(join(candidate, 'proposal.json'))) {
              const result = await trace.stage(
                'proposal-model',
                () => operations.propose(configuration, sources(baseSource), goal, abort.signal),
                (result) => ({
                  generator: 'openai',
                  model: result.evidence.model,
                  promptVersion: result.evidence.promptVersion,
                  ...(result.evidence.usage
                    ? {
                        inputTokens: result.evidence.usage.prompt_tokens!,
                        outputTokens: result.evidence.usage.completion_tokens!,
                      }
                    : {}),
                }),
              );
              atomicJson(join(candidate, 'proposal.json'), result);
            }
            validateProposal(model().proposal, sources(baseSource));
            if (!model().proposal.edits.length) return 'no-change';
          },
        },
        {
          name: 'prepare',
          run: async () => {
            if (readdirSync(join(control.root, 'releases')).length >= 20)
              throw Error('release_retention_limit');
            const proposal = validateProposal(model().proposal, sources(baseSource));
            rmSync(source, { recursive: true, force: true });
            cpSync(baseSource, source, { recursive: true });
            for (const edit of proposal.edits) {
              const path = join(source, edit.path);
              writeFileSync(path, readFileSync(path, 'utf8').replace(edit.before, edit.after));
            }
            for (const path of ['dist', 'dist-server']) mkdirSync(join(source, path), { recursive: true });
            atomicJson(join(candidate, 'prepared.json'), { sourceHash: digest(source) });
          },
        },
        {
          name: 'verify',
          run: async () => {
            rmSync(join(source, 'node_modules'), { force: true });
            if (digest(source) !== sourceHash()) throw Error('source_integrity_failed');
            await operations.verifyCandidate(control, source, candidate, abort.signal);
            if (digest(source) !== sourceHash()) throw Error('source_integrity_failed');
            atomicJson(join(candidate, 'verified.json'), {
              sourceHash: sourceHash(),
              distHash: digest(join(candidate, 'dist')),
            });
          },
        },
        {
          name: 'release',
          run: async () => {
            const verified = read<{ sourceHash: string; distHash: string }>('verified.json');
            if (
              digest(source) !== verified.sourceHash ||
              digest(join(candidate, 'dist')) !== verified.distHash
            )
              throw Error('source_integrity_failed');
            const release = join(control.root, 'releases', id);
            if (control.active() === id) throw Error('unexpected_active_candidate');
            rmSync(release, { recursive: true, force: true });
            mkdirSync(release);
            cpSync(source, join(release, 'source'), { recursive: true });
            cpSync(join(candidate, 'dist'), join(release, 'dist'), { recursive: true });
            const oldAssets = join(control.root, 'releases', base!, 'dist/assets');
            if (existsSync(oldAssets))
              cpSync(oldAssets, join(release, 'dist/assets'), {
                recursive: true,
                force: false,
                errorOnExist: false,
              });
            atomicJson(join(release, 'manifest.json'), {
              id,
              base,
              kind: 'model-candidate',
              evidence: model().evidence,
              sourceHash: verified.sourceHash,
              distHash: digest(join(release, 'dist')),
              gates: [
                'typecheck',
                'server-tests',
                'request-quality',
                'production-build',
                'foundation-e2e',
                'computer-c-e2e',
              ],
            });
          },
        },
        {
          name: 'promote',
          run: async () => {
            const release = join(control.root, 'releases', id);
            const manifest = JSON.parse(readFileSync(join(release, 'manifest.json'), 'utf8')) as {
              sourceHash: string;
              distHash: string;
            };
            if (
              digest(join(release, 'source')) !== manifest.sourceHash ||
              digest(join(release, 'dist')) !== manifest.distHash
            )
              throw Error('source_integrity_failed');
            // A completed activation may precede its graph checkpoint. Do not switch twice.
            return control.promote(context.epoch, base!, id, () => operations.smoke(control));
          },
        },
      ],
    });
  } catch (error) {
    status = abort.signal.aborted ? 'cancelled' : 'failed';
    const message = error instanceof Error ? error.message : '';
    failureReason = ['checkpoint_identity_mismatch', 'active_release_changed', 'stage_failed'].includes(
      message,
    )
      ? message
      : 'runtime_or_provider_error';
  } finally {
    clearInterval(poll);
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    try {
      const result = {
        id,
        base,
        status,
        ...(failureReason ? { failureReason } : {}),
        endedAt: new Date().toISOString(),
      };
      const attempts = join(candidate, 'attempts');
      mkdirSync(attempts, { recursive: true, mode: 0o700 });
      atomicJson(join(attempts, `${randomUUID()}.json`), result);
      if (!resumeId || contextAccepted) atomicJson(join(candidate, 'result.json'), result);
    } finally {
      release();
      await trace.flush(status);
    }
  }
  return { id, base, status, ...(failureReason ? { failureReason } : {}) };
}

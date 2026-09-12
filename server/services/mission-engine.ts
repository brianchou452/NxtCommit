import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, writeFile, readdir, lstat, realpath } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import type { TestSummary, ArtifactFile, ExecutionEvent } from '../../shared/execution.js';
import type { MissionArtifact } from '../../shared/mission.js';
import { computeReviewable, MissionError, redactEvidence } from '../domain/mission.js';

export interface EngineResult { artifact: MissionArtifact; reviewable: boolean }
export type EngineEmit = (type: string, source: 'engine' | 'demo', payload: NonNullable<ExecutionEvent['payload']>) => void;
const fixtureRoot = resolve('fixtures/retry-queue');
const cleanEnvironment = { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C', HOME: tmpdir(), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' };
function command(cwd: string, executable: string, args: string[], signal: AbortSignal): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolveResult, reject) => {
    execFile(executable, args, { cwd, env: cleanEnvironment, timeout: 5000, maxBuffer: 128 * 1024, signal }, (error, stdout, stderr) => {
      if (signal.aborted) return reject(new MissionError('cancelled', 'Execution cancelled.'));
      if (error && typeof error.code !== 'number') return reject(new MissionError('command_failed', 'Bounded fixture command failed.'));
      resolveResult({ stdout: String(stdout) + String(stderr), exitCode: error && typeof error.code === 'number' ? error.code : 0 });
    });
  });
}
async function files(root: string, directory = root): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new MissionError('unsafe_workspace', 'Symlinks are not executable inputs.');
    if (entry.isDirectory()) result.push(...await files(root, path)); else result.push(relative(root, path));
  }
  return result.sort();
}
export async function assertContainedWorkspacePath(root: string, path: string): Promise<string> {
  root = await realpath(root);
  if (isAbsolute(path) || path.split(/[\\/]/).some(part => ['..', '.git', 'node_modules'].includes(part))) throw new MissionError('unsafe_path', 'Path is outside the writable fixture boundary.');
  if (/(^|\/)(\.github|\.gitlab|\.npmrc|\.gitignore|\.gitattributes|package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|verification\.json|Dockerfile|LICENSE)(\/|$)/i.test(path)) throw new MissionError('protected_path', 'Verification and repository controls are engine-owned.');
  const target = resolve(root, path);
  const parent = await realpath(resolve(target, '..'));
  if (relative(root, parent).startsWith('..') || isAbsolute(relative(root, parent))) throw new MissionError('unsafe_path', 'Path escapes workspace.');
  try { if ((await lstat(target)).isSymbolicLink()) throw new MissionError('unsafe_path', 'Symlink target refused.'); if (/\.(test|spec)\.[^.]+$/.test(path)) throw new MissionError('protected_path', 'Existing test files are protected.'); } catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
  return target;
}
async function seal(root: string, names: string[]): Promise<string> {
  const digest = createHash('sha256');
  for (const name of names) digest.update(name).update(await readFile(join(root, name)));
  return digest.digest('hex');
}
async function verify(root: string, args: string[], signal: AbortSignal): Promise<TestSummary & { output: string }> {
  const result = await command(root, process.execPath, args, signal);
  const count = (key: string) => { const value = new RegExp(`^# ${key} (\\d+)\\s*$`, 'm').exec(result.stdout)?.[1]; return value === undefined ? undefined : Number(value); };
  const passed = count('pass'); const failed = count('fail'); const total = count('tests');
  return { command: `node ${args.join(' ')}`, exitCode: result.exitCode, ...(passed === undefined ? {} : { passed }), ...(failed === undefined ? {} : { failed }), ...(total === undefined ? {} : { total }), output: `<untrusted_evidence>\n${redactEvidence(result.stdout)}\n</untrusted_evidence>` };
}
/** Scripted intelligence; only engine commands supply tests/diff/gate evidence. No imported repository is accepted. */
export async function executeFixture(missionId: string, runId: string, signal: AbortSignal, emit: EngineEmit): Promise<EngineResult> {
  await files(fixtureRoot);
  const workspace = await mkdtemp(join(tmpdir(), 'nxtcommit-fixture-'));
  // Disposable run outputs are retained for diagnosis; checked-in fixture source is never changed.
  await cp(fixtureRoot, workspace, { recursive: true, dereference: false });
  const config = JSON.parse(await readFile(join(workspace, 'verification.json'), 'utf8')) as { command: string; args: string[]; source: string };
  if (config.command !== 'node' || JSON.stringify(config.args) !== '["--test","--test-reporter=tap"]' || config.source !== 'retry.mjs') throw new MissionError('invalid_verification', 'Bundled verification facts changed.');
  const frozenArgs = Object.freeze([...config.args]);
  const git = (args: string[]) => command(workspace, '/usr/bin/git', ['--no-optional-locks', ...args], signal);
  for (const args of [['init', '-q'], ['add', '--all'], ['-c', 'user.name=Fixture Engine', '-c', 'user.email=fixture@localhost', 'commit', '-qm', 'Fixture baseline']]) {
    if ((await git(args)).exitCode !== 0) throw new MissionError('baseline_failed', 'Cannot establish fixture baseline.');
  }
  const baselineRef = (await git(['rev-parse', 'HEAD'])).stdout.trim();
  const protectedNames = (await files(workspace)).filter(path => path !== 'retry.mjs');
  const protectedSeal = await seal(workspace, protectedNames);
  emit('environment', 'engine', { title: 'Measured execution boundary', isolation: 'process', osIsolated: false, detail: 'Bundled fixture only; no OS sandbox or network-isolation claim.' });
  emit('workspace', 'engine', { title: 'Copied bundled fixture', baseline: baselineRef, fixture: 'retry-queue' });
  const baseline = await verify(workspace, [...frozenArgs], signal);
  emit('test-result', 'engine', { ...baseline, stage: 'baseline', title: 'Baseline suite' });
  if (baseline.exitCode !== 0 || !baseline.passed || baseline.failed !== 0 || !baseline.total) throw new MissionError('baseline_failed', 'Baseline must be green and nonempty.');
  if (await seal(workspace, protectedNames) !== protectedSeal) throw new MissionError('integrity_failed', 'Baseline test changed protected inputs.');
  emit('plan', 'demo', { title: 'Scripted demo plan', detail: 'Clamp retry delays and add a regression test. This is authored DemoRunner intelligence, not an LLM.' });
  await writeFile(await assertContainedWorkspacePath(workspace, 'retry.mjs'), 'export function retryDelay(attempt) {\n  return Math.max(0, attempt) * 100;\n}\n');
  await writeFile(await assertContainedWorkspacePath(workspace, 'retry-negative.test.mjs'), "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { retryDelay } from './retry.mjs';\ntest('negative retries never produce negative delays', () => assert.equal(retryDelay(-1), 0));\n");
  emit('file-change', 'demo', { title: 'Scripted fixture edit submitted', files: ['retry.mjs', 'retry-negative.test.mjs'] });
  if (await seal(workspace, protectedNames) !== protectedSeal) throw new MissionError('integrity_failed', 'Runner changed protected verification inputs.');
  const final = await verify(workspace, [...frozenArgs], signal);
  // Re-seal AFTER executable tests and BEFORE any authoritative diff command.
  const integrity = await seal(workspace, protectedNames) === protectedSeal && (await files(workspace)).every(path => protectedNames.includes(path) || ['retry.mjs', 'retry-negative.test.mjs'].includes(path));
  emit('test-result', 'engine', { ...final, stage: 'final', title: 'Authoritative final suite' });
  if (!integrity) throw new MissionError('integrity_failed', 'Executable test changed protected inputs.');
  await git(['add', '-N', '--', 'retry-negative.test.mjs']);
  const stat = await git(['diff', '--numstat', baselineRef, '--']);
  const changed: ArtifactFile[] = [];
  for (const line of stat.stdout.trim().split('\n').filter(Boolean)) {
    const [added, deleted, path] = line.split('\t');
    if (!path || !/^\d+$/.test(added ?? '') || !/^\d+$/.test(deleted ?? '')) throw new MissionError('invalid_diff', 'Unreadable diff statistics.');
    const patch = await git(['diff', baselineRef, '--', path]);
    changed.push({ path, added: Number(added), deleted: Number(deleted), diff: redactEvidence(patch.stdout) });
  }
  const gate = computeReviewable(baseline, final, changed, integrity);
  if (/ignore (?:all |previous |prior )*instructions|reveal (?:the )?system prompt|exfiltrat/i.test(baseline.output + final.output + changed.map(file => file.diff).join('\n'))) { gate.reviewable = false; gate.reasons.push('prompt_injection_indicator'); }
  emit('diff', 'engine', { title: 'Baseline-relative diff', files: changed.map(({ path, added, deleted }) => ({ path, added, deleted })) });
  emit('guard', 'engine', { title: 'Deterministic reviewability gate', reviewable: gate.reviewable, reasons: gate.reasons });
  const artifact: MissionArtifact = {
    missionId, runId, mode: 'demo', files: changed, testEvidenceSource: 'engine',
    dossier: { baseline, experiments: [final], qualityGates: [{ id: 'computeReviewable', status: gate.reviewable ? 'passed' : 'failed', reason: gate.reasons.join(', ') || 'Green nonempty suite, bounded diff, test growth and protected integrity.' }], criterionEvidence: [{ criterion: 'retry-delay', status: 'unknown', explanation: 'Suite-level test evidence is real; individual acceptance criteria are not independently proven.' }] },
    review: { source: 'static', affectedGate: false, summary: 'Local fixture diff only. No authenticated approval or upstream write.' },
  };
  return { artifact, reviewable: gate.reviewable };
}

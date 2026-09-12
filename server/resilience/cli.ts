import { agentSourceHash } from '../agents/identity.js';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { execFileSync } from 'node:child_process';
import { loadAgentMonitoring } from '../agents/telemetry.js';
import { acquireLease } from '../agents/lease.js';
import { atomicJson } from '../self-update/control.js';
import { ExperimentAgent } from './experiment.js';
import type { ExperimentReport } from './experiment.js';
import { Assistance } from '../authoring/assistance.js';
import { authoringConfiguration } from '../authoring/configuration.js';

const args = process.argv.slice(2),
  seen = new Set<string>();
const allowed = new Set(['--live', '--cycles', '--interval', '--repetitions', '--seed', '--resume']);
for (let i = 0; i < args.length; i++) {
  const name = args[i]!;
  if (seen.has(name) || !allowed.has(name)) throw Error('Invalid or duplicate argument');
  seen.add(name);
  if (name !== '--live' && (!args[++i] || args[i]!.startsWith('--'))) throw Error('Missing argument value');
}
const value = (name: string, fallback: number) =>
  seen.has(name) ? Number(args[args.indexOf(name) + 1]) : fallback;
const resumeId = seen.has('--resume') ? args[args.indexOf('--resume') + 1] : undefined;
if (resumeId && (!/^[a-f0-9-]{36}$/.test(resumeId) || args.length !== 2))
  throw Error('Usage: --resume <run-id> alone; saved settings are reused');
const cycles = value('--cycles', 1),
  interval = value('--interval', 300);
if (
  !Number.isInteger(cycles) ||
  cycles < 1 ||
  cycles > 100 ||
  !Number.isFinite(interval) ||
  interval < 5 ||
  interval > 86400
)
  throw Error('Invalid cycle/interval bounds');
let seed = value('--seed', 42),
  repetitions = value('--repetitions', 2),
  live = seen.has('--live');
if (
  !Number.isSafeInteger(seed) ||
  seed < 0 ||
  seed > 0xffffffff ||
  !Number.isInteger(repetitions) ||
  repetitions < 1 ||
  repetitions > 10
)
  throw Error('Invalid seed/repetition bounds');
const git = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', env: { PATH: process.env.PATH ?? '' } }).trim();
const sourceHash = agentSourceHash;
const identity = {
  commit: git(['rev-parse', 'HEAD']),
  dirty: Boolean(git(['status', '--porcelain'])),
  sourceHash: sourceHash(),
};
const directory = resolve('var/chaos-agents');
mkdirSync(directory, { recursive: true, mode: 0o700 });
type Context = {
  seed: number;
  repetitions: number;
  live: boolean;
  sourceHash: string;
  baseline?: ExperimentReport;
};
const resumed = resumeId
  ? (JSON.parse(readFileSync(resolve(directory, 'runs', resumeId, 'context.json'), 'utf8')) as Context)
  : undefined;
if (resumed) {
  if (resumed.sourceHash !== identity.sourceHash) throw Error('checkpoint_identity_mismatch');
  ({ seed, repetitions, live } = resumed);
}
if (live && existsSync('.env')) process.loadEnvFile('.env');
loadAgentMonitoring();
const configuration = live ? authoringConfiguration(process.env) : {};
if (live && !configuration.model) throw Error('Live advice requires model configuration');
if (existsSync(resolve(directory, 'active.lock'))) throw Error('legacy_agent_lock');
const abort = new AbortController();
process.once('SIGINT', () => abort.abort());
process.once('SIGTERM', () => abort.abort());
const release = await acquireLease(resolve(directory, 'worker-lock.sqlite'), 0, abort.signal);
let failed = false;
try {
  for (let cycle = 0; cycle < cycles && !abort.signal.aborted; cycle++) {
    const id = resumeId ?? randomUUID();
    const previous = readdirSync(directory)
      .filter((file) => /^\d+-[a-f0-9-]+\.json$/.test(file))
      .sort()
      .at(-1);
    const baseline =
      resumed?.baseline ??
      (!resumed && previous
        ? (JSON.parse(readFileSync(resolve(directory, previous), 'utf8')) as ExperimentReport)
        : undefined);
    const runDirectory = resolve(directory, 'runs', id);
    mkdirSync(runDirectory, { recursive: true, mode: 0o700 });
    if (!resumed)
      atomicJson(resolve(runDirectory, 'context.json'), {
        seed,
        repetitions,
        live,
        sourceHash: identity.sourceHash,
        ...(baseline ? { baseline } : {}),
      });
    console.log(JSON.stringify({ id, status: resumeId ? 'resuming' : 'started' }));
    try {
      const report = await new ExperimentAgent().run({
        runtime: {
          directory: resolve(directory, 'runs'),
          identity: identity.sourceHash,
          runId: id,
          ...(resumeId ? { resume: true } : {}),
        },
        signal: abort.signal,
        seed,
        repetitions,
        ...(baseline ? { baseline } : {}),
        ...(live ? { assistance: new Assistance(configuration.model, undefined, fetch, abort.signal) } : {}),
      });
      if (identity.sourceHash !== sourceHash()) throw Error('source_changed');
      const path = resolve(directory, `${Date.now()}-${report.id}.json`);
      atomicJson(path, { ...report, identity });
      failed ||= report.decision === 'blocked';
      console.log(
        JSON.stringify({
          cycle: cycle + 1,
          id,
          summary: report.summary,
          decision: report.decision,
          roles: report.roles,
          comparison: report.comparison,
          report: path,
        }),
      );
    } catch {
      console.log(
        JSON.stringify({
          id,
          status: abort.signal.aborted ? 'interrupted' : 'failed',
          resume: `npm run agents:experiment -- --resume ${id}`,
        }),
      );
      failed = true;
      break;
    }
    if (cycle + 1 < cycles && !abort.signal.aborted)
      await setTimeout(interval * 1000, undefined, { signal: abort.signal }).catch(() => {});
  }
} finally {
  release();
}
process.exitCode = abort.signal.aborted ? 130 : failed ? 1 : 0;

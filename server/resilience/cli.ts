import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { execFileSync } from 'node:child_process';
import { ExperimentAgent } from './experiment.js';
import type { ExperimentReport } from './experiment.js';
import { Assistance } from '../authoring/assistance.js';
import { authoringConfiguration } from '../authoring/configuration.js';

const args = process.argv.slice(2);
const value = (name: string, fallback: number) => args.includes(name) ? Number(args[args.indexOf(name) + 1]) : fallback;
const seen = new Set<string>();
const allowed = new Set(['--live', '--cycles', '--interval', '--repetitions', '--seed']);
for (let i = 0; i < args.length; i++) {
  if (seen.has(args[i]!)) throw new Error('Duplicate argument');
  seen.add(args[i]!);
  if (!allowed.has(args[i]!)) throw new Error('Usage: npm run agents:experiment -- [--live] [--cycles 1..100] [--interval 5..86400] [--repetitions 1..10] [--seed integer]');
  if (args[i] !== '--live') i++;
}
const cycles = value('--cycles', 1); const interval = value('--interval', 300);
if (!Number.isInteger(cycles) || cycles < 1 || cycles > 100 || !Number.isFinite(interval) || interval < 5 || interval > 86400) throw new Error('Invalid cycle/interval bounds');
const seed = value('--seed', 42); const repetitions = value('--repetitions', 2);
if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || !Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10) throw new Error('Invalid seed/repetition bounds');
if (args.includes('--live') && existsSync('.env')) process.loadEnvFile('.env');
const live = args.includes('--live');
const configuration = live ? authoringConfiguration(process.env) : {};
if (live && !configuration.model) throw new Error('Live advice requires OPENAI_API_KEY and OPENAI_MODEL');
const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8', env: { PATH: process.env.PATH ?? '' } }).trim();
const files = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(resolve(directory, entry.name)) : [resolve(directory, entry.name)]);
const sourceHash = () => { const hash = createHash('sha256'); for (const file of [...files('server'), ...files('shared'), resolve('package.json'), resolve('package-lock.json')].sort()) hash.update(relative(process.cwd(), file)).update(readFileSync(file)); return hash.digest('hex'); };
const identity = { commit: git(['rev-parse', 'HEAD']), dirty: Boolean(git(['status', '--porcelain'])), sourceHash: sourceHash() };
const directory = resolve('var/chaos-agents'); mkdirSync(directory, { recursive: true, mode: 0o700 });
const lock = resolve(directory, 'active.lock');
const descriptor = openSync(lock, 'wx', 0o600); writeFileSync(descriptor, String(process.pid));
const abort = new AbortController();
process.once('SIGINT', () => abort.abort()); process.once('SIGTERM', () => abort.abort());
let failed = false;
try {
  for (let cycle = 0; cycle < cycles && !abort.signal.aborted; cycle++) {
    const previous = readdirSync(directory).filter(file => /^\d+-[a-f0-9-]+\.json$/.test(file)).sort().at(-1);
    const baseline = previous ? JSON.parse(readFileSync(resolve(directory, previous), 'utf8')) as ExperimentReport : undefined;
    const report = await new ExperimentAgent().run({ seed, repetitions, ...(baseline ? { baseline } : {}), ...(live ? { assistance: new Assistance(configuration.model) } : {}) });
    if (identity.sourceHash !== sourceHash()) throw new Error('Source changed during the loop; restart to load the new modules');
    const path = resolve(directory, `${Date.now()}-${report.id}.json`);
    writeFileSync(`${path}.tmp`, JSON.stringify({ ...report, identity }, null, 2), { mode: 0o600 }); renameSync(`${path}.tmp`, path);
    failed ||= report.decision === 'blocked';
    console.log(JSON.stringify({ cycle: cycle + 1, id: report.id, summary: report.summary, decision: report.decision, roles: report.roles, comparison: report.comparison, report: path }));
    if (cycle + 1 < cycles && !abort.signal.aborted) await setTimeout(interval * 1000, undefined, { signal: abort.signal }).catch(() => {});
  }
} finally { closeSync(descriptor); unlinkSync(lock); }
process.exitCode = abort.signal.aborted ? 130 : failed ? 1 : 0;

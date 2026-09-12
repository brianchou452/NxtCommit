import { agentSourceHash } from './identity.js';
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { ExperimentAgent } from '../resilience/experiment.js';
import { Assistance, features } from '../authoring/assistance.js';
import { authoringConfiguration } from '../authoring/configuration.js';
import { atomicJson, UpdateControl } from '../self-update/control.js';
import { AgentTrace, loadAgentMonitoring } from './telemetry.js';
import { acquireLease } from './lease.js';

if (process.argv.slice(2).some((arg) => arg !== '--live') || process.argv.slice(2).length > 1)
  throw Error('Usage: npm run agents:benchmark -- [--live]');
const live = process.argv.includes('--live');
if (live && existsSync('.env')) process.loadEnvFile('.env');
loadAgentMonitoring();
const configuration = live ? authoringConfiguration(process.env).model : undefined;
if (live && !configuration) throw Error('Live evaluation requires model configuration');
const abort = new AbortController();
process.once('SIGINT', () => abort.abort());
process.once('SIGTERM', () => abort.abort());
const id = randomUUID(),
  root = resolve('var/agent-benchmarks', id);
mkdirSync(root, { recursive: true, mode: 0o700 });
const release = await acquireLease(resolve('var/agent-benchmarks/worker-lock.sqlite'), 0, abort.signal);
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
  env: { PATH: process.env.PATH ?? '' },
}).trim();
const sourceHash = agentSourceHash();
const control = new UpdateControl('var/self-update'),
  before = { settings: control.read(), release: control.active() };
const assistance = new Assistance(configuration, undefined, fetch, abort.signal);
const trace = new AgentTrace('authoring-evaluation', id);
trace.sourceHash = sourceHash;
const reports = [],
  roles = [];
let status = 'failed';
try {
  for (const seed of [0, 42, 2026]) {
    abort.signal.throwIfAborted();
    const report = await new ExperimentAgent().run({
      seed,
      repetitions: 2,
      signal: abort.signal,
      runtime: { directory: join(root, 'experiments'), identity: sourceHash },
      ...(live && seed === 42 ? { assistance } : {}),
    });
    reports.push({
      seed,
      summary: report.summary,
      decision: report.decision,
      roles: report.roles,
      id: report.id,
    });
    if (seed === 42 && report.advice)
      for (const [role, result] of Object.entries(report.advice))
        roles.push({
          feature: role === 'chaos' ? 'chaos-planner' : 'experiment-review',
          generator: result.evidence.generator,
          usage: result.evidence.usage,
          bilingual: Boolean(result.summary.en && result.summary['zh-TW']),
          affectedGate: result.affectedGate,
        });
  }
  for (const feature of features.filter(
    (feature) => !['chaos-planner', 'experiment-review'].includes(feature),
  )) {
    abort.signal.throwIfAborted();
    const result = await trace.stage(
      feature,
      () =>
        assistance.explain(
          feature,
          {
            source: 'fixture',
            testsMeasured: false,
            affectedGate: false,
            executionAvailable: false,
            task: 'Explain the bounded scope and one uncertainty. Keep both languages concise.',
          },
          {
            en: 'Inspect supplied facts; unknown observations remain unknown.',
            'zh-TW': '檢視提供的事實；未知觀察保持未知。',
          },
        ),
      (value) => ({
        generator: value.evidence.generator === 'openai' ? 'openai' : 'static',
        status: value.evidence.fallbackReason ? 'fallback' : 'model-response',
        ...(value.evidence.model ? { model: value.evidence.model } : {}),
        promptVersion: value.evidence.promptVersion,
        ...(value.evidence.usage
          ? { inputTokens: value.evidence.usage.inputTokens, outputTokens: value.evidence.usage.outputTokens }
          : {}),
      }),
    );
    roles.push({
      feature,
      generator: result.evidence.generator,
      usage: result.evidence.usage,
      bilingual: Boolean(result.summary.en && result.summary['zh-TW']),
      affectedGate: result.affectedGate,
    });
  }
  status =
    reports.every((report) => report.decision === 'checks-passed') &&
    roles.every((role) => role.bilingual && !role.affectedGate)
      ? 'checks-passed'
      : 'blocked';
} catch {
  status = abort.signal.aborted ? 'interrupted' : 'failed';
} finally {
  await trace.flush(status);
  release();
  const servingUnchanged =
    JSON.stringify(before) === JSON.stringify({ settings: control.read(), release: control.active() });
  const report = {
    id,
    commit,
    sourceHash,
    mode: live ? 'live' : 'offline',
    status,
    servingUnchanged,
    reports,
    roles,
    modelCalls: assistance.counts.calls,
    fallbacks: assistance.counts.fallback,
    semanticQuality: 'unmeasured',
    promotionApproved: false,
  };
  atomicJson(join(root, 'report.json'), report);
  console.log(
    JSON.stringify({
      id,
      status,
      servingUnchanged,
      cases: reports.reduce((sum, report) => sum + report.summary.total, 0),
      modelCalls: assistance.counts.calls,
      fallbacks: assistance.counts.fallback,
      modelAvailability:
        live && assistance.counts.fallback > 0 ? 'degraded' : live ? 'available' : 'not-requested',
      report: join(root, 'report.json'),
    }),
  );
  if (status !== 'checks-passed' || !servingUnchanged) process.exitCode = 1;
}

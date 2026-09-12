import { DatabaseSync } from 'node:sqlite';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Express } from 'express';
import { ExperimentAgent } from '../resilience/experiment.js';
import type { ExperimentReport } from '../resilience/experiment.js';
import { fallback } from '../resilience/chaos.js';
import { Assistance } from '../authoring/assistance.js';
import type { AuthoringOptions } from '../authoring/services.js';
import { assuranceStages } from '../../shared/assurance.js';
import type { AssuranceRun, AssuranceSnapshot, AssuranceStage } from '../../shared/assurance.js';

export interface AssuranceOptions {
  directory: string; token?: string | undefined; enabled: boolean; commit: string;
  authoring?: AuthoringOptions; intervalMs?: number;
  experiment?: ExperimentAgent;
}
/** One bounded operator/scheduler lane. No public spending or source-write capability. */
export class AssuranceController {
  private readonly db: DatabaseSync;
  private readonly interval: number;
  private active: Promise<AssuranceRun> | undefined;
  private abort: AbortController | undefined;
  constructor(private readonly options: AssuranceOptions) {
    mkdirSync(options.directory, {recursive: true, mode: 0o700});
    this.db = new DatabaseSync(resolve(options.directory, 'assurance.sqlite'));
    this.db.exec('CREATE TABLE IF NOT EXISTS assurance_runs (id TEXT PRIMARY KEY, started INTEGER NOT NULL, body TEXT NOT NULL)');
    this.interval = options.intervalMs ?? 300000;
    if (!Number.isFinite(this.interval) || this.interval < 1000) throw Error('invalid_interval');
    for (const run of this.runs()) if (run.status === 'running') {
      run.status = 'interrupted'; run.failureCode = 'process_restarted'; run.finishedAt = new Date().toISOString();
      for (const stage of run.stages) if (stage.status === 'running') stage.status = 'failed';
      this.save(run);
    }
  }
  private runs(): AssuranceRun[] {
    return (this.db.prepare('SELECT body FROM assurance_runs ORDER BY started DESC LIMIT 40').all() as {body: string}[]).map(row => JSON.parse(row.body) as AssuranceRun);
  }
  private save(run: AssuranceRun) {
    this.db.prepare('INSERT OR REPLACE INTO assurance_runs VALUES (?, ?, ?)').run(run.id, Date.parse(run.startedAt), JSON.stringify(run));
    this.db.exec('DELETE FROM assurance_runs WHERE id NOT IN (SELECT id FROM assurance_runs ORDER BY started DESC LIMIT 40)');
  }
  snapshot(): AssuranceSnapshot {
    const runs = this.runs();
    return {observedAt: new Date().toISOString(), enabled: this.options.enabled, intervalSeconds: this.interval / 1000,
      nextEligibleAt: this.options.enabled && runs[0] ? new Date(Date.parse(runs[0].startedAt) + this.interval).toISOString() : null,
      storage: 'ephemeral-sqlite', scope: 'controlled-faults-real-modules', sourceEditsEnabled: false, runs};
  }
  async start(trigger: AssuranceRun['trigger']): Promise<AssuranceRun | null> {
    if (!this.options.enabled) return null;
    if (this.active) return this.active;
    const previous = this.runs()[0];
    if (previous && Date.now() - Date.parse(previous.startedAt) < this.interval) return previous;
    const abort = this.abort = new AbortController();
    this.active = this.execute(trigger, abort.signal).finally(() => {this.active = undefined; this.abort = undefined;});
    return this.active;
  }
  private async execute(trigger: AssuranceRun['trigger'], stop: AbortSignal): Promise<AssuranceRun> {
    const signal = AbortSignal.any([stop, AbortSignal.timeout(120000)]);
    const baselineRun = this.runs().find(run => run.report && run.commit === this.options.commit);
    const run: AssuranceRun = {id: randomUUID(), startedAt: new Date().toISOString(), commit: this.options.commit,
      trigger, status: 'running', stages: assuranceStages.map(name => ({name, status: 'pending'})),
      safety: {fixedCatalog: true, privateDatabase: true, modelCannotChangeGate: true, sourceEditsEnabled: false},
      advice: {}, modelCalls: 0, knownInputTokens: 0, knownOutputTokens: 0, unknownUsageCalls: 0};
    this.save(run);
    const assistance = new Assistance(this.options.authoring?.model, this.options.authoring?.observations, fetch, signal);
    const captureCounts = () => {run.modelCalls = assistance.counts.calls; run.knownInputTokens = assistance.counts.inputTokens; run.knownOutputTokens = assistance.counts.outputTokens; run.unknownUsageCalls = Math.max(assistance.counts.unknownUsage, assistance.counts.calls - Object.values(run.advice).filter(value => value?.evidence.usage).length);};
    const stage = (name: AssuranceStage, status: 'running' | 'completed' | 'failed') => {
      const entry = run.stages.find(s => s.name === name)!;
      entry.status = status;
      if (status === 'running') entry.startedAt = new Date().toISOString();
      else entry.finishedAt = new Date().toISOString();
      captureCounts(); this.save(run);
    };
    try {
      const baseline = baselineRun?.report as ExperimentReport | undefined;
      const report = await (this.options.experiment ?? new ExperimentAgent()).run({
        seed: (Date.now() >>> 0), repetitions: 2, assistance, signal,
        priorHypothesis: baselineRun?.advice.iterate?.summary,
        beforeChaos: async () => {
      // Deterministic scope policy is fixed before any fault injection. Model advice cannot override it.
      stage('safety', 'running');
      run.advice.safety = await assistance.explain('safety-review', {runId: run.id, controls: run.safety, task: 'In at most 50 words per language, explain residual risks of controlled fault tests in private transports and private in-memory databases. No production fault injection, source edit, merge or safety certification is authorized.'}, fallback);
      signal.throwIfAborted(); stage('safety', 'completed');
        },
        ...(baseline ? {baseline} : {}),
        runtime: {directory: resolve(this.options.directory, 'runs'), identity: this.options.commit, runId: run.id},
        onStage: (name, status) => { if (['plan','chaos','assess','review'].includes(name)) stage(name as AssuranceStage, status); },
      });
      run.report = {id: report.id, catalogVersion: report.catalogVersion, seed: report.seed, repetitions: report.repetitions,
        summary: report.summary, decision: report.decision, measurements: report.measurements, comparison: report.comparison, backlog: report.backlog};
      if (report.advice) {run.advice.plan = report.advice.chaos; run.advice.review = report.advice.experiment;}
      stage('iterate', 'running');
      run.advice.iterate = await assistance.explain('iteration-planner', {runId: run.id, summary: report.summary, comparison: report.comparison, backlog: report.backlog, priorReview: report.advice?.experiment.summary,
        task: 'In at most 50 words per language, propose the next measurable hypothesis based only on these results. All fixed scenarios will run in the next scheduled cycle with a new seed. Do not claim source repair or automatic deployment; source edits are disabled.'}, fallback);
      signal.throwIfAborted(); stage('iterate', 'completed');
      run.status = report.decision === 'checks-passed' ? 'passed' : 'blocked';
    } catch {
      run.status = stop.aborted ? 'interrupted' : 'failed'; run.failureCode = stop.aborted ? 'cancelled' : 'cycle_failed';
      for (const entry of run.stages) if (entry.status === 'running') stage(entry.name, 'failed');
    } finally {
      captureCounts(); run.finishedAt = new Date().toISOString(); this.save(run);
    }
    return run;
  }
  install(app: Express) {
    app.get('/api/assurance', (_request, response) => response.json(this.snapshot()));
    app.post('/api/assurance/run', async (request, response) => {
      const expected = Buffer.from(`Bearer ${this.options.token ?? ''}`), actual = Buffer.from(request.headers.authorization ?? '');
      if (!this.options.token || this.options.token.length < 24 || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        response.status(403).json({code: 'operator_required'}); return;
      }
      const run = await this.start(request.headers['x-assurance-trigger'] === 'scheduled' ? 'scheduled' : 'operator');
      response.status(run ? 200 : 503).json(run ?? {code: 'assurance_disabled'});
    });
  }
  async close() { this.abort?.abort(); await this.active; this.db.close(); }
}

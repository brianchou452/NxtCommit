import { randomUUID } from 'node:crypto';
import { ChaosAgent, catalogVersion, scenarioIds, fallback } from './chaos.js';
import type { Measurement } from './chaos.js';
import type { Assistance } from '../authoring/assistance.js';
import type { AssistantResult } from '../../shared/authoring.js';

export interface ExperimentReport {
  id: string; createdAt: string; catalogVersion: string; seed: number; repetitions: number;
  provenance: 'controlled-faults-real-modules'; measurements: Measurement[];
  summary: { total: number; passed: number; failed: number; p95Ms: number };
  decision: 'checks-passed' | 'blocked'; promotionApproved: false;
  comparison: { baselineId: string | null; comparable: boolean; regressions: string[]; recovered: string[] };
  backlog: Array<{ scenario: string; failedChecks: string[]; nextAction: 'investigate-and-add-regression' }>;
  roles: { chaos: 'deterministic' | 'model-assisted'; experiment: 'deterministic' | 'model-assisted' };
  advice?: { chaos: AssistantResult; experiment: AssistantResult };
}
export function assess(measurements: Measurement[], baseline?: ExperimentReport) {
  const failedIds = new Set(measurements.filter(row => !row.passed).map(row => row.scenario));
  const comparable = Boolean(baseline && baseline.catalogVersion === catalogVersion &&
    new Set(measurements.map(row => row.scenario)).size === scenarioIds.length &&
    baseline.repetitions === measurements.length / scenarioIds.length &&
    baseline.measurements.length === measurements.length &&
    scenarioIds.every(id => baseline.measurements.some(row => row.scenario === id)));
  const previous = new Set(comparable ? baseline!.measurements.filter(row => !row.passed).map(row => row.scenario) : []);
  return { baselineId: comparable ? baseline!.id : null, comparable,
    regressions: comparable ? [...failedIds].filter(id => !previous.has(id)) : [],
    recovered: comparable ? [...previous].filter(id => !failedIds.has(id)) : [] };
}

export class ExperimentAgent {
  constructor(private readonly chaos = new ChaosAgent()) {}
  async run(options: { seed?: number; repetitions?: number; baseline?: ExperimentReport; assistance?: Assistance } = {}): Promise<ExperimentReport> {
    const seed = options.seed ?? 42; const repetitions = options.repetitions ?? 2;
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || !Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10) throw new Error('Invalid experiment bounds');
    const measurements: Measurement[] = [];
    let state = seed || 1;
    const order = [...scenarioIds];
    for (let i = order.length - 1; i > 0; i--) {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      const j = state % (i + 1); [order[i], order[j]] = [order[j]!, order[i]!];
    }
    const chaosAdvice = options.assistance ? await options.assistance.explain('chaos-planner', {
      catalogVersion, allowedScenarios: order, mode: 'controlled-faults-real-modules',
      task: 'Prioritize risks and suggest a hypothesis from this fixed catalog. Every case runs regardless of advice. Give one hypothesis in at most 60 words per language.',
    }, fallback) : undefined;
    for (let repetition = 0; repetition < repetitions; repetition++) {
      for (const scenario of order) measurements.push(await this.chaos.execute(scenario, repetition));
    }
    const failed = measurements.filter(row => !row.passed);
    const durations = measurements.map(row => row.durationMs).sort((a, b) => a - b);
    const report: ExperimentReport = {
      id: randomUUID(), createdAt: new Date().toISOString(), catalogVersion, seed, repetitions,
      provenance: 'controlled-faults-real-modules', measurements,
      summary: { total: measurements.length, passed: measurements.length - failed.length, failed: failed.length, p95Ms: durations[Math.ceil(durations.length * .95) - 1]! },
      decision: failed.length ? 'blocked' : 'checks-passed', promotionApproved: false,
      comparison: assess(measurements, options.baseline),
      backlog: [...new Set(failed.map(row => row.scenario))].map(scenario => ({ scenario, failedChecks: [...new Set(failed.filter(row => row.scenario === scenario).flatMap(row => row.error ? [row.error] : Object.entries(row.checks).filter(([, pass]) => !pass).map(([key]) => key)))], nextAction: 'investigate-and-add-regression' })),
      roles: { chaos: chaosAdvice?.evidence.generator === 'openai' ? 'model-assisted' : 'deterministic', experiment: 'deterministic' },
    };
    if (options.assistance && chaosAdvice) {
      const experiment = await options.assistance.explain('experiment-review', {
        summary: report.summary, comparison: report.comparison, backlog: report.backlog,
        decision: report.decision, chaosHypothesis: chaosAdvice.summary,
        task: 'Explain remaining uncertainty and the next measurable experiment. Give one next experiment in at most 60 words per language; controlled scenarios do not establish production stability.',
      }, fallback);
      report.advice = { chaos: chaosAdvice, experiment };
      report.roles.experiment = experiment.evidence.generator === 'openai' ? 'model-assisted' : 'deterministic';
    }
    return report;
  }
}

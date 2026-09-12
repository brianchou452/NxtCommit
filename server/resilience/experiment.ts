import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicJson } from '../self-update/control.js';
import { workflow } from '../agents/workflow.js';
import { AgentTrace } from '../agents/telemetry.js';
import { ChaosAgent, catalogVersion, scenarioIds, fallback } from './chaos.js';
import type { Measurement } from './chaos.js';
import type { Assistance } from '../authoring/assistance.js';
import type { AssistantResult } from '../../shared/authoring.js';

export interface ExperimentReport {
  id: string;
  createdAt: string;
  catalogVersion: string;
  seed: number;
  repetitions: number;
  provenance: 'controlled-faults-real-modules';
  measurements: Measurement[];
  summary: { total: number; passed: number; failed: number; p95Ms: number };
  decision: 'checks-passed' | 'blocked';
  promotionApproved: false;
  comparison: { baselineId: string | null; comparable: boolean; regressions: string[]; recovered: string[] };
  backlog: Array<{ scenario: string; failedChecks: string[]; nextAction: 'investigate-and-add-regression' }>;
  roles: { chaos: 'deterministic' | 'model-assisted'; experiment: 'deterministic' | 'model-assisted' };
  advice?: { chaos: AssistantResult; experiment: AssistantResult };
}
export function assess(measurements: Measurement[], baseline?: ExperimentReport) {
  const failedIds = new Set(measurements.filter((row) => !row.passed).map((row) => row.scenario));
  const comparable = Boolean(
    baseline &&
      baseline.catalogVersion === catalogVersion &&
      new Set(measurements.map((row) => row.scenario)).size === scenarioIds.length &&
      baseline.repetitions === measurements.length / scenarioIds.length &&
      baseline.measurements.length === measurements.length &&
      scenarioIds.every((id) => baseline.measurements.some((row) => row.scenario === id)),
  );
  const previous = new Set(
    comparable ? baseline!.measurements.filter((row) => !row.passed).map((row) => row.scenario) : [],
  );
  return {
    baselineId: comparable ? baseline!.id : null,
    comparable,
    regressions: comparable ? [...failedIds].filter((id) => !previous.has(id)) : [],
    recovered: comparable ? [...previous].filter((id) => !failedIds.has(id)) : [],
  };
}

export class ExperimentAgent {
  constructor(private readonly chaos = new ChaosAgent()) {}
  async run(
    options: {
      seed?: number;
      repetitions?: number;
      baseline?: ExperimentReport;
      assistance?: Assistance;
      runtime?: { directory: string; identity: string; runId?: string; resume?: boolean };
    } = {},
  ): Promise<ExperimentReport> {
    const seed = options.seed ?? 42;
    const repetitions = options.repetitions ?? 2;
    if (
      !Number.isSafeInteger(seed) ||
      seed < 0 ||
      seed > 0xffffffff ||
      !Number.isInteger(repetitions) ||
      repetitions < 1 ||
      repetitions > 10
    )
      throw new Error('Invalid experiment bounds');
    const id = options.runtime?.runId ?? randomUUID();
    if (!/^[a-f0-9-]{36}$/.test(id)) throw Error('invalid_run_id');
    const identity =
      (options.runtime?.identity ?? 'test') +
      ':' +
      createHash('sha256')
        .update(
          JSON.stringify({
            seed,
            repetitions,
            baseline: options.baseline ?? null,
            model: options.assistance?.configuration?.model ?? null,
          }),
        )
        .digest('hex');
    const root = options.runtime?.directory ?? mkdtempSync(join(tmpdir(), 'nxtcommit-experiment-'));
    const directory = join(root, id);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const trace = new AgentTrace('experiment', id);
    const read = <T>(file: string): T => JSON.parse(readFileSync(join(directory, file), 'utf8')) as T;
    let outcome = 'failed';
    try {
      await workflow({
        database: join(root, 'checkpoints.sqlite'),
        runId: id,
        identity,
        ...(options.runtime?.resume ? { resume: true } : {}),
        trace,
        stages: [
          {
            name: 'plan',
            run: async () => {
              let state = seed || 1;
              const order = [...scenarioIds];
              for (let i = order.length - 1; i > 0; i--) {
                state = (Math.imul(1664525, state) + 1013904223) >>> 0;
                const j = state % (i + 1);
                [order[i], order[j]] = [order[j]!, order[i]!];
              }
              const chaosAdvice = options.assistance
                ? await trace.stage(
                    'chaos-planner-model',
                    () =>
                      options.assistance!.explain(
                        'chaos-planner',
                        {
                          catalogVersion,
                          allowedScenarios: order,
                          mode: 'controlled-faults-real-modules',
                          task: 'Prioritize risks and suggest a hypothesis from this fixed catalog. Every case runs regardless of advice. Give one hypothesis in at most 60 words per language.',
                        },
                        fallback,
                      ),
                    (result) => ({
                      generator: result.evidence.generator === 'openai' ? 'openai' : 'static',
                      ...(result.evidence.model ? { model: result.evidence.model } : {}),
                      promptVersion: result.evidence.promptVersion,
                      ...(result.evidence.usage
                        ? {
                            inputTokens: result.evidence.usage.inputTokens,
                            outputTokens: result.evidence.usage.outputTokens,
                          }
                        : {}),
                    }),
                  )
                : undefined;
              atomicJson(join(directory, 'plan.json'), { order, chaosAdvice });
            },
          },
          {
            name: 'chaos',
            run: async () => {
              const { order } = read<{ order: typeof scenarioIds }>('plan.json');
              const measurements: Measurement[] = [];
              for (let repetition = 0; repetition < repetitions; repetition++) {
                for (const scenario of order)
                  measurements.push(await this.chaos.execute(scenario, repetition));
              }
              atomicJson(join(directory, 'measurements.json'), measurements);
            },
          },
          {
            name: 'assess',
            run: async () => {
              const measurements = read<Measurement[]>('measurements.json');
              const { chaosAdvice } = read<{ chaosAdvice?: AssistantResult }>('plan.json');
              const failed = measurements.filter((row) => !row.passed);
              const durations = measurements.map((row) => row.durationMs).sort((a, b) => a - b);
              const report: ExperimentReport = {
                id,
                createdAt: new Date().toISOString(),
                catalogVersion,
                seed,
                repetitions,
                provenance: 'controlled-faults-real-modules',
                measurements,
                summary: {
                  total: measurements.length,
                  passed: measurements.length - failed.length,
                  failed: failed.length,
                  p95Ms: durations[Math.ceil(durations.length * 0.95) - 1]!,
                },
                decision: failed.length ? 'blocked' : 'checks-passed',
                promotionApproved: false,
                comparison: assess(measurements, options.baseline),
                backlog: [...new Set(failed.map((row) => row.scenario))].map((scenario) => ({
                  scenario,
                  failedChecks: [
                    ...new Set(
                      failed
                        .filter((row) => row.scenario === scenario)
                        .flatMap((row) =>
                          row.error
                            ? [row.error]
                            : Object.entries(row.checks)
                                .filter(([, pass]) => !pass)
                                .map(([key]) => key),
                        ),
                    ),
                  ],
                  nextAction: 'investigate-and-add-regression',
                })),
                roles: {
                  chaos: chaosAdvice?.evidence.generator === 'openai' ? 'model-assisted' : 'deterministic',
                  experiment: 'deterministic',
                },
              };
              atomicJson(join(directory, 'assessment.json'), report);
            },
          },
          {
            name: 'review',
            run: async () => {
              const report = read<ExperimentReport>('assessment.json');
              const { chaosAdvice } = read<{ chaosAdvice?: AssistantResult }>('plan.json');
              if (options.assistance && chaosAdvice) {
                const experiment = await trace.stage(
                  'experiment-review-model',
                  () =>
                    options.assistance!.explain(
                      'experiment-review',
                      {
                        summary: report.summary,
                        comparison: report.comparison,
                        backlog: report.backlog,
                        decision: report.decision,
                        chaosHypothesis: chaosAdvice.summary,
                        task: 'Explain remaining uncertainty and the next measurable experiment. Give one next experiment in at most 60 words per language; controlled scenarios do not establish production stability.',
                      },
                      fallback,
                    ),
                  (result) => ({
                    generator: result.evidence.generator === 'openai' ? 'openai' : 'static',
                    ...(result.evidence.model ? { model: result.evidence.model } : {}),
                    promptVersion: result.evidence.promptVersion,
                    ...(result.evidence.usage
                      ? {
                          inputTokens: result.evidence.usage.inputTokens,
                          outputTokens: result.evidence.usage.outputTokens,
                        }
                      : {}),
                  }),
                );
                report.advice = { chaos: chaosAdvice, experiment };
                report.roles.experiment =
                  experiment.evidence.generator === 'openai' ? 'model-assisted' : 'deterministic';
              }
              atomicJson(join(directory, 'report.json'), report);
            },
          },
        ],
      });
      const report = read<ExperimentReport>('report.json');
      outcome = report.decision;
      await trace.stage(
        'deterministic-gate',
        async () => report,
        (report) => ({
          passed: report.summary.passed,
          failed: report.summary.failed,
          status: report.decision,
        }),
      );
      return report;
    } finally {
      await trace.flush(outcome);
      if (!options.runtime) rmSync(root, { recursive: true, force: true });
    }
  }
}

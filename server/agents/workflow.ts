import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AgentTrace } from './telemetry.js';

const State = Annotation.Root({
  runId: Annotation<string>(),
  identity: Annotation<string>(),
  status: Annotation<string>(),
});
export interface WorkflowStage {
  name: string;
  run: () => Promise<string | void>;
}
/** Only opaque run identity and terminal status enter checkpoints; artifacts remain local. */
export async function workflow(options: {
  database: string;
  runId: string;
  identity: string;
  stages: WorkflowStage[];
  resume?: boolean;
  allowed?: () => boolean;
  interrupted?: () => boolean;
  trace: AgentTrace;
  onStage?: (stage: string, status: "running" | "completed" | "failed") => void;
}) {
  process.env.LANGSMITH_TRACING = 'false';
  process.env.LANGCHAIN_TRACING_V2 = 'false';
  options.trace.sourceHash = options.identity.slice(0, 64);
  mkdirSync(dirname(options.database), { recursive: true, mode: 0o700 });
  const saver = SqliteSaver.fromConnString(options.database);
  chmodSync(options.database, 0o600);
  try {
    const nodes = Object.fromEntries(
      options.stages.map((stage) => [
        stage.name,
        async () => {
          if (options.interrupted?.()) throw Error('run_interrupted');
          if (options.allowed && !options.allowed()) return { status: 'cancelled' };
          try {
            options.onStage?.(stage.name, "running");
            const status = await options.trace.stage(stage.name, stage.run);
            options.onStage?.(stage.name, "completed");
            return { status: status ?? '' };
          } catch {
            options.onStage?.(stage.name, "failed");
            throw new Error('stage_failed');
          } // Raw provider/container errors must not enter checkpoints.
        },
      ]),
    );
    const builder = new StateGraph(State).addNode(nodes).addEdge(START, options.stages[0]!.name);
    options.stages.forEach((stage, index) =>
      builder.addConditionalEdges(stage.name, (state) =>
        state.status ? END : (options.stages[index + 1]?.name ?? END),
      ),
    );
    const graph = builder.compile({ checkpointer: saver });
    const config = { configurable: { thread_id: options.runId }, recursionLimit: 50, callbacks: [] };
    const saved = await graph.getState(config);
    if (options.resume) {
      if (!saved.values?.runId || saved.values.identity !== options.identity)
        throw Error('checkpoint_identity_mismatch');
      if (!saved.next.length) return saved.values.status || 'completed';
    } else if (saved.values?.runId) throw Error('run_already_exists');
    const result = await graph.invoke(
      options.resume ? null : { runId: options.runId, identity: options.identity, status: '' },
      config,
    );
    return result.status || 'completed';
  } finally {
    saver.db.close();
  }
}

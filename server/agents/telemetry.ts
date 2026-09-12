import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import { existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { redactText } from '../authoring/analyzer.js';

export type AgentKind = 'experiment' | 'self-update';
export interface StageMetrics {
  generator?: 'openai' | 'static';
  model?: string;
  promptVersion?: string;
  inputTokens?: number;
  outputTokens?: number;
  passed?: number;
  failed?: number;
  status?: string;
}
export interface StageEvent {
  spanId: string;
  parentId: string;
  name: string;
  start: number;
  end: number;
  ok: boolean;
  metrics: StageMetrics;
}
/** Intentionally explicit OTLP instrumentation: no automatic prompt/source callbacks. */
export class AgentTrace {
  readonly traceId = randomBytes(16).toString('hex');
  private readonly rootId = randomBytes(8).toString('hex');
  private readonly started = Date.now();
  readonly events: StageEvent[] = [];
  private readonly context = new AsyncLocalStorage<string>();
  sourceHash: string | undefined;
  constructor(
    readonly kind: AgentKind,
    readonly runId: string,
    private readonly transport: typeof fetch = fetch,
  ) {}
  async stage<T>(
    name: string,
    work: () => Promise<T>,
    metrics: (value: T) => StageMetrics = () => ({}),
  ): Promise<T> {
    const start = Date.now(),
      spanId = randomBytes(8).toString('hex'),
      parentId = this.context.getStore() ?? this.rootId;
    try {
      const result = await this.context.run(spanId, work);
      let measured: StageMetrics = {};
      try {
        measured = metrics(result);
      } catch {
        /* instrumentation is advisory */
      }
      this.events.push({ spanId, parentId, name, start, end: Date.now(), ok: true, metrics: measured });
      return result;
    } catch (error) {
      this.events.push({ spanId, parentId, name, start, end: Date.now(), ok: false, metrics: {} });
      throw error;
    }
  }
  payload(status: string) {
    const safe = (value: string) =>
      value.length <= 120 && /^[a-zA-Z0-9_.:/-]+$/.test(value) && redactText(value) === value;
    const attributes = (values: Record<string, string | number>) =>
      Object.entries(values).map(([key, value]) => ({
        key,
        value: typeof value === 'number' ? { intValue: String(value) } : { stringValue: value },
      }));
    const common = {
      'langfuse.trace.name': `nxtcommit.${this.kind}`,
      'langfuse.session.id': safe(this.runId) ? this.runId : 'invalid-run',
      'langfuse.trace.metadata.orchestrator': 'langgraph',
      'langfuse.trace.metadata.contract': 'agent-metadata-v1',
      ...(this.sourceHash && /^[a-f0-9]{64}$/.test(this.sourceHash)
        ? { 'langfuse.trace.metadata.sourceHash': this.sourceHash }
        : {}),
    };
    const span = (
      id: string,
      name: string,
      start: number,
      end: number,
      values: Record<string, string | number>,
      ok: boolean,
      parent?: string,
    ) => ({
      traceId: this.traceId,
      spanId: id,
      ...(parent ? { parentSpanId: parent } : {}),
      name,
      kind: 1,
      startTimeUnixNano: String(BigInt(start) * 1000000n),
      endTimeUnixNano: String(BigInt(end) * 1000000n),
      attributes: attributes({ ...common, ...values }),
      status: { code: ok ? 1 : 2 },
    });
    const spans = this.events.map((event) => {
      const values: Record<string, string | number> = {
        'langfuse.observation.type': event.metrics.generator === 'openai' ? 'generation' : 'span',
      };
      for (const key of ['generator', 'promptVersion', 'status'] as const)
        if (event.metrics[key] && safe(event.metrics[key]!))
          values[`langfuse.observation.metadata.${key}`] = event.metrics[key]!;
      if (event.metrics.model && safe(event.metrics.model))
        values['langfuse.observation.model.name'] = event.metrics.model;
      for (const key of ['passed', 'failed'] as const) {
        const value = event.metrics[key];
        if (Number.isSafeInteger(value) && value! >= 0)
          values[`langfuse.observation.metadata.${key}`] = value!;
      }
      const usage = Object.fromEntries(
        [
          ['input', event.metrics.inputTokens],
          ['output', event.metrics.outputTokens],
        ].filter(([, v]) => Number.isSafeInteger(v) && Number(v) >= 0),
      );
      if (Object.keys(usage).length) values['langfuse.observation.usage_details'] = JSON.stringify(usage);
      return span(
        event.spanId,
        safe(event.name) ? event.name : 'stage',
        event.start,
        event.end,
        values,
        event.ok,
        event.parentId,
      );
    });
    spans.unshift(
      span(
        this.rootId,
        `nxtcommit.${this.kind}`,
        this.started,
        Date.now(),
        {
          'langfuse.observation.type': 'span',
          'langfuse.trace.metadata.outcome': safe(status) ? status : 'unknown',
        },
        !['failed', 'cancelled', 'rolled-back', 'blocked'].includes(status),
      ),
    );
    return {
      resourceSpans: [
        {
          resource: { attributes: attributes({ 'service.name': 'nxtcommit-agents' }) },
          scopeSpans: [{ scope: { name: 'nxtcommit-agent-metadata', version: '1' }, spans }],
        },
      ],
    };
  }
  async flush(status: string): Promise<boolean> {
    if (process.env.AGENT_TRACING_ENABLED !== 'true') return false;
    let ok = false;
    try {
      const url = new URL(process.env.LANGFUSE_BASE_URL ?? '');
      // Agent monitoring is local-only; a changed endpoint cannot exfiltrate traces.
      if (
        url.origin !== 'http://127.0.0.1:4310' ||
        url.pathname !== '/' ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw Error('invalid_monitor');
      const publicKey = process.env.LANGFUSE_PUBLIC_KEY,
        secretKey = process.env.LANGFUSE_SECRET_KEY;
      if (!publicKey || !secretKey) throw Error('missing_monitor_credentials');
      const response = await this.transport(`${url.origin}/api/public/otel/v1/traces`, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(2000),
        headers: {
          'Content-Type': 'application/json',
          'x-langfuse-ingestion-version': '4',
          Authorization: `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}`,
        },
        body: JSON.stringify(this.payload(status)),
      });
      // OTLP can acknowledge HTTP 200 with rejected spans. Do not label that persisted.
      const body = await response.text();
      const partial = body ? JSON.parse(body).partialSuccess : undefined;
      ok = response.ok && !(Number(partial?.rejectedSpans) > 0);
    } catch {
      ok = false;
    }
    try {
      const directory = resolve('var/agents');
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      appendFileSync(
        join(directory, 'exports.jsonl'),
        JSON.stringify({
          runId: this.runId,
          traceId: this.traceId,
          accepted: ok,
          at: new Date().toISOString(),
        }) + '\n',
        { mode: 0o600 },
      );
    } catch {
      /* Monitoring never controls promotion. */
    }
    return ok;
  }
}
export function loadAgentMonitoring() {
  // LangSmith's implicit environment-based tracing is deliberately disabled.
  process.env.LANGSMITH_TRACING = 'false';
  process.env.LANGCHAIN_TRACING_V2 = 'false';
  if (existsSync('var/langfuse/.env')) process.loadEnvFile('var/langfuse/.env');
}

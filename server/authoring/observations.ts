import { randomBytes } from 'node:crypto';
import type { ObservationSink, TraceRecord, FeedbackRecord } from './assistance.js';
import { features } from './assistance.js';

export interface LangfuseConfiguration { baseUrl: string; publicKey: string; secretKey: string }
/** OTLP/HTTP JSON and Scores API; exports a strict metadata allowlist, never repository text. */
export class LangfuseObservations implements ObservationSink {
  constructor(private readonly configuration: LangfuseConfiguration, private readonly fetcher: typeof fetch = fetch) {}
  private async send(path: string, body: unknown): Promise<boolean> {
    const url = new URL(this.configuration.baseUrl);
    if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) return false;
    const response = await this.fetcher(`${url.href.replace(/\/$/, '')}/api/public/${path}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(1500),
      headers: { 'Content-Type': 'application/json', 'x-langfuse-ingestion-version': '4', Authorization: `Basic ${Buffer.from(`${this.configuration.publicKey}:${this.configuration.secretKey}`).toString('base64')}` }, body: JSON.stringify(body),
    });
    await response.body?.cancel(); return response.ok;
  }
  async trace(record: TraceRecord): Promise<boolean> {
    if (!/^[a-f0-9]{32}$/.test(record.traceId) || !features.includes(record.feature) || !['openai', 'demo', 'static'].includes(record.generator) || !/^[a-z-]+-v\d+$/.test(record.promptVersion)) return false;
    const end = record.endedAt ?? Date.now(), start = record.startedAt ?? end;
    if (![start, end].every(Number.isSafeInteger) || start < 0 || end < start) return false;
    const attributes: Record<string, string> = { 'langfuse.trace.name': record.feature, 'langfuse.observation.type': record.generator === 'openai' ? 'generation' : 'span', 'nxtcommit.prompt_version': record.promptVersion, 'nxtcommit.generator': record.generator };
    if (record.model && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/.test(record.model)) attributes['langfuse.observation.model.name'] = record.model;
    if (record.release && /^(?:local|[a-f0-9]{40})$/.test(record.release)) attributes['langfuse.release'] = record.release;
    if (record.outcome && ['success', 'unavailable', 'demo'].includes(record.outcome)) attributes['nxtcommit.outcome'] = record.outcome;
    if (record.responseId && /^resp_[a-zA-Z0-9_-]{1,120}$/.test(record.responseId)) attributes['nxtcommit.response_id'] = record.responseId;
    if (record.usage && [record.usage.inputTokens, record.usage.outputTokens, record.usage.totalTokens].every(n => Number.isSafeInteger(n) && n >= 0)) {
      attributes['langfuse.observation.usage_details'] = JSON.stringify({ input: record.usage.inputTokens, output: record.usage.outputTokens, total: record.usage.totalTokens });
    }
    return this.send('otel/v1/traces', { resourceSpans: [{ resource: { attributes: [{ key: 'service.name', value: { stringValue: 'nxtcommit' } }] }, scopeSpans: [{ scope: { name: 'nxtcommit-authoring', version: '1' }, spans: [{
      traceId: record.traceId, spanId: randomBytes(8).toString('hex'), name: record.feature, kind: 1, startTimeUnixNano: (BigInt(start) * 1_000_000n).toString(), endTimeUnixNano: (BigInt(end) * 1_000_000n).toString(),
      attributes: Object.entries(attributes).map(([key, stringValue]) => ({ key, value: { stringValue } })),
    }] }] }] });
  }
  async score(record: FeedbackRecord): Promise<boolean> {
    if (!/^[a-f0-9]{32}$/.test(record.traceId) || !features.includes(record.feature) || ![0, 1].includes(record.score) || record.actor !== 'local-demo-user' || !/^[a-z-]+-v\d+$/.test(record.version)) return false;
    return this.send('scores', { id: `${record.traceId}-${record.feature}-local`, traceId: record.traceId, name: 'human_helpfulness', value: record.score, dataType: 'BOOLEAN', metadata: { feature: record.feature, actor: 'local-demo-user', promptVersion: record.version } });
  }
}

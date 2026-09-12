/** Shared server-only OpenAI boundary for local Node and the Cloudflare container. */
export interface OpenAIResult {
  text: string;
  provenance: { generator: 'openai'; model: string; promptVersion: string; fallback: false; responseId: string; latencyMs: number; usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null };
}
export class OpenAIConnectionError extends Error {
  constructor(public readonly code: string, public readonly status?: number) { super(code); }
}
export function openAIConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey || !apiKey.startsWith('sk-')) throw new OpenAIConnectionError('openai_key_missing_or_invalid');
  return { apiKey, model: env.OPENAI_MODEL?.trim() || 'gpt-5-mini' };
}
export async function createOpenAIResponse(input: string, promptVersion: string, options: { env?: NodeJS.ProcessEnv; fetch?: typeof fetch } = {}): Promise<OpenAIResult> {
  if (!input.trim() || input.length > 12000 || !promptVersion.trim()) throw new OpenAIConnectionError('openai_input_invalid');
  const {apiKey, model} = openAIConfiguration(options.env);
  const started = performance.now();
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)('https://api.openai.com/v1/responses', {
      method: 'POST', headers: {'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({model, input, max_output_tokens: 1024, store: false}),
      signal: AbortSignal.timeout(45000),
    });
  } catch { throw new OpenAIConnectionError('openai_transport_failed'); }
  // Never forward provider error bodies, prompts or credentials into app errors/logs.
  if (!response.ok) throw new OpenAIConnectionError('openai_request_rejected', response.status);
  let data: any;
  try { data = await response.json(); } catch { throw new OpenAIConnectionError('openai_response_invalid'); }
  const text = (data.output ?? []).filter((item: any) => item.type === 'message').flatMap((item: any) => item.content ?? []).filter((item: any) => item.type === 'output_text' && typeof item.text === 'string').map((item: any) => item.text).join('\n');
  if (data.status !== 'completed' || !text || typeof data.id !== 'string') throw new OpenAIConnectionError('openai_response_incomplete');
  const usage = data.usage;
  return {text, provenance: {generator: 'openai', model: data.model ?? model, promptVersion, fallback: false, responseId: data.id, latencyMs: Math.round(performance.now()-started), usage: usage && [usage.input_tokens, usage.output_tokens, usage.total_tokens].every(Number.isFinite) ? {inputTokens:usage.input_tokens, outputTokens:usage.output_tokens, totalTokens:usage.total_tokens} : null}};
}

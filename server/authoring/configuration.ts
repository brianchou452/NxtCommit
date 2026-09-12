import type { AuthoringOptions } from './services.js';
import { LangfuseObservations } from './observations.js';
export function authoringConfiguration(env: NodeJS.ProcessEnv): AuthoringOptions {
  const result: AuthoringOptions = {};
  if (env.OPENAI_API_KEY && env.OPENAI_MODEL) {
    result.model = { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, baseUrl: env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1' };
  }
  if (env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY && env.LANGFUSE_BASE_URL) {
    result.observations = new LangfuseObservations({ publicKey: env.LANGFUSE_PUBLIC_KEY, secretKey: env.LANGFUSE_SECRET_KEY, baseUrl: env.LANGFUSE_BASE_URL });
  }
  return result;
}

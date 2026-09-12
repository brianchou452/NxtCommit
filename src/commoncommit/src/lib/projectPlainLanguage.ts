import type { ImpactCard, PlainLanguage, Project, TimeMachineFrame } from "../../shared/types.js";
import { api } from "./api.js";

/**
 * Project explanations can be real model calls, not ordinary JSON reads. Cards
 * therefore share a single-flight cache and a small global queue instead of
 * starting one request for every repeated shelf entry at once.
 */
export const PROJECT_EXPLAIN_CONCURRENCY = 2;

export type PlainLanguageFetcher<T = PlainLanguage> = (projectId: string) => Promise<T>;

export interface ProjectPlainLanguageLoader<T = PlainLanguage> {
  load(projectId: string): Promise<T>;
  clear(projectId?: string): void;
}

export function createProjectPlainLanguageLoader<T = PlainLanguage>(
  fetchPlainLanguage: PlainLanguageFetcher<T>,
  maxConcurrent = PROJECT_EXPLAIN_CONCURRENCY
): ProjectPlainLanguageLoader<T> {
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new Error("project explanation concurrency must be a positive integer");
  }

  const resolved = new Map<string, T>();
  const pending = new Map<string, Promise<T>>();
  const queue: Array<() => void> = [];
  let active = 0;

  const pump = () => {
    while (active < maxConcurrent) {
      const start = queue.shift();
      if (!start) return;
      active += 1;
      start();
    }
  };

  const load = (projectId: string): Promise<T> => {
    const cached = resolved.get(projectId);
    if (cached) return Promise.resolve(cached);

    const inFlight = pending.get(projectId);
    if (inFlight) return inFlight;

    let start!: () => void;
    const request = new Promise<T>((resolve, reject) => {
      start = () => {
        // Enter through a resolved promise so a synchronously throwing test
        // double (or future fetch adapter) follows the same cleanup path as a
        // rejected network promise.
        void Promise.resolve()
          .then(() => fetchPlainLanguage(projectId))
          .then((plain) => {
            resolved.set(projectId, plain);
            resolve(plain);
          }, reject)
          .finally(() => {
            pending.delete(projectId);
            active -= 1;
            pump();
          });
      };
    });

    pending.set(projectId, request);
    queue.push(start);
    pump();
    return request;
  };

  return {
    load,
    clear(projectId) {
      if (projectId === undefined) resolved.clear();
      else resolved.delete(projectId);
    },
  };
}

const sharedLoader = createProjectPlainLanguageLoader(async (projectId) => {
  const response = await api.explain(projectId);
  return response.plain;
});

export const loadProjectPlainLanguage = (projectId: string) => sharedLoader.load(projectId);
export const clearProjectPlainLanguageCache = (projectId?: string) => sharedLoader.clear(projectId);

export interface ProjectExplanationPayload {
  plain: PlainLanguage;
  impact: ImpactCard;
  timeline: TimeMachineFrame[];
}

/**
 * Marketplace cards need both the plain description and the "what breaks"
 * impact statement. Keep that richer response in its own shared queue so a
 * shelf of cards cannot fan out into unbounded model requests.
 */
const explanationLoader = createProjectPlainLanguageLoader<ProjectExplanationPayload>(
  (projectId) => api.explain(projectId)
);

export const loadProjectExplanation = (projectId: string) => explanationLoader.load(projectId);
export const clearProjectExplanationCache = (projectId?: string) => explanationLoader.clear(projectId);

/**
 * The v0.3.x marketplace payload predates `figuresMode`. A cached v0.4 frontend
 * can still receive that payload, so absence must mean authored demo data rather
 * than being inferred as live evidence.
 */
export function normalizedFiguresMode(
  mode: Project["figuresMode"] | null | undefined
): Project["figuresMode"] {
  return mode === "live" ? "live" : "demo";
}

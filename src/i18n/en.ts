import { authoringEn } from './authoring.js';
export const en = {
  ...authoringEn,
  product: 'NxtCommit', discover: 'Discover', new_mission: 'New Mission',
  profile: 'My Commitment', demo: 'Demo', skip: 'Skip to main content',
  reset: 'Reset demo data', reset_done: 'Demo data reset.',
  bootstrap_error: 'NxtCommit could not load its session data.',
  build_note: 'hackathon build',
  disclaimer: 'compute credits ≈ AI inference budget — not a currency',
  retry: 'Retry', language: 'Language', loading: 'Loading…',
  reset_error: 'Demo data could not be reset.', reset_pending: 'Resetting…',
  foundation_title: 'Shared foundation',
  foundation_notice: 'This route is a Phase 1 placeholder. Product workflows are not implemented yet.',
  unavailable: 'Execution unavailable', local_persona: 'Local demo persona',
  not_found: 'Page not found', back_home: 'Back to Discover',
  english: 'English', traditional_chinese: '繁體中文',
  wallet: 'Compute credits', demo_mode: 'Demo runner', llm_mode: 'LLM runner', codex_mode: 'Codex runner',
  no_isolation: 'No per-run OS isolation', isolated: 'Per-run OS isolation',
  truth: 'Local demo identities and compute credits. No authentication, payments or upstream publication.',
} as const;
export type Dictionary = { [Key in keyof typeof en]: string };

import { Assistance } from './assistance.js';
import type { Feature } from './assistance.js';

/** Authored regression inputs, not evidence of human-reviewed model superiority. */
export const authoringDataset = {
  name: 'nxtcommit-authoring-boundaries', version: '1',
  cases: [
    { id: 'issue-scope', feature: 'issue-triage', facts: { source: 'github', issue: 'Clarify the selected public issue; repository execution is unavailable.' } },
    { id: 'critic-authority', feature: 'campaign-critic', facts: { source: 'fixture', estimateAuthority: 'server', draftAuthority: 'server' } },
    { id: 'unknown-evidence', feature: 'evidence-explanation', facts: { source: 'demo', testsMeasured: false, criterionStatus: 'unknown' } },
    { id: 'shadow-nonauthority', feature: 'shadow-review', facts: { source: 'demo', affectedGate: false } },
    { id: 'metadata-provenance', feature: 'project-explanation', facts: { source: 'github', adoptionMeasured: false } },
  ],
} as const;

export async function evaluateAuthoring(options: { live?: boolean; assistance?: Assistance } = {}) {
  if (options.live && !options.assistance?.configuration) throw new Error('Live evaluation requires explicit model configuration.');
  const assistance = options.live ? options.assistance! : new Assistance();
  const results = [];
  for (const item of authoringDataset.cases) {
    const result = await assistance.explain(item.feature as Feature, item.facts, { en: 'Inspect the supplied facts; unknown observations remain unknown.', 'zh-TW': '請檢視提供的事實；未知觀察仍保持未知。' });
    results.push({ caseId: item.id, feature: item.feature, promptVersion: result.evidence.promptVersion, generator: result.evidence.generator, affectedGate: result.affectedGate, bilingual: Boolean(result.summary.en && result.summary['zh-TW']) });
  }
  return { dataset: authoringDataset.name, version: authoringDataset.version, mode: options.live ? 'live' : 'dry-run', results, promotionApproved: false };
}

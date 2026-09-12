import { redactEvidence, redactText } from './analyzer.js';
import type { LocalizedText } from '../../shared/primitives.js';

export const featureTasks = {
  'chaos-planner': 'Suggest one bounded experiment within the supplied scope; do not authorize execution.',
  'experiment-review': 'Explain the observed experiment result and one uncertainty without inventing measurements.',
  'safety-review': 'Identify one risk to check against supplied safety constraints; do not authorize execution.',
  'iteration-planner': 'Suggest one next check grounded in supplied results; do not promise an improvement.',
  'issue-triage': 'Name the selected issue scope and one concrete acceptance check; do not switch issues.',
  'campaign-generation': 'Write a proposal tagline: the selected problem and intended user benefit, not a claim of completed work.',
  'campaign-critic': 'Identify one actionable gap in the supplied draft or criteria using a concrete missing test example. Preserve the issue’s exact entities (for example, headers versus data values); do not certify quality or change the estimate.',
  'evidence-explanation': 'Explain one limitation of the supplied test evidence; distinguish authored demo from observed engine evidence and keep unknown criteria unknown.',
  'shadow-review': 'Compare the exact changed operations using their language semantics; suggest one concrete input to check. Do not speculate that an operation removes characters it cannot remove. Frame the result as a check, never an approval or asserted defect.',
  'project-explanation': 'Explain what the described project does for a nontechnical user; do not invent adoption, popularity or capabilities.',
} as const;
export type PromptFeature = keyof typeof featureTasks;

/** Preserve valid JSON, provenance and late fields instead of slicing serialized evidence. */
export function compactFacts(facts: unknown): unknown {
  const redacted = redactEvidence(facts);
  let remaining = 4500;
  let nodes = 100;
  const visit = (value: unknown, depth = 0): unknown => {
    if (depth > 5 || remaining <= 0 || --nodes < 0) return '[OMITTED]';
    if (typeof value === 'string') { const limit = Math.min(600, remaining); remaining -= Math.min(value.length, limit); return value.length > limit ? value.slice(0, limit) + ' [TRUNCATED]' : value; }
    if (Array.isArray(value)) {
      const selected = value.length > 6 ? [...value.slice(0, 2), '[OMITTED]', ...value.slice(-3)] : value;
      return selected.map(item => visit(item, depth + 1));
    }
    if (value && typeof value === 'object') {
      // Source/trust flags and criterion status survive large diff/body fields.
      const priority = ['source', 'testEvidenceSource', 'measured', 'status', 'criteria', 'gates', 'baseline', 'experiments'];
      const entries = Object.entries(value).sort(([a], [b]) => (priority.includes(a) ? priority.indexOf(a) : 99) - (priority.includes(b) ? priority.indexOf(b) : 99) || a.localeCompare(b));
      return Object.fromEntries(entries.filter(([key]) => key.length <= 80).slice(0, 24).map(([key, item]) => [key, visit(item, depth + 1)]));
    }
    return value;
  };
  return visit(redacted);
}

export function featurePrompt(feature: PromptFeature, facts: unknown): string {
  return `Feature: ${feature}\nTask: ${featureTasks[feature]}\nUse only supplied facts; omitted data is unknown. One sentence per language: English at most 28 words, Traditional Chinese at most 65 characters.\n<untrusted-evidence>\n${JSON.stringify(compactFacts(facts))}\n</untrusted-evidence>`;
}

export function validAdvice(value: unknown): value is LocalizedText {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 2 || !['en', 'zh-TW'].every(key => typeof record[key] === 'string' && record[key].trim().length > 0 && record[key].length <= 2000 && redactText(record[key]) === record[key])) return false;
  if (!/[A-Za-z]/.test(String(record.en)) || !/\p{Script=Han}/u.test(String(record['zh-TW']))) return false;
  if (record.en === record['zh-TW']) return false;
  return !/(?:tests? (?:passed|verified)|all criteria|merged|published|authenticated|測試已通過|已合併|已發布|已驗證身分)/i.test(JSON.stringify(value));
}

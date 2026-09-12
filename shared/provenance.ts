export type EvidenceSource = 'demo' | 'engine' | 'llm' | 'codex' | 'maintainer' | 'system';
export type DataMode = 'demo' | 'live';
export type EventProvenance =
  | { source: 'engine'; verified: boolean }
  | { source: Exclude<EvidenceSource, 'engine'>; verified: false };

export function assertProvenance(value: { source: string; verified: boolean }): asserts value is EventProvenance {
  const sources: readonly string[] = ['demo', 'engine', 'llm', 'codex', 'maintainer', 'system'];
  if (!sources.includes(value.source) || (value.verified && value.source !== 'engine')) {
    throw new Error('Only engine observations may be verified');
  }
}

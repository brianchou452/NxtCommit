import type { MissionStatus, TestSummary, ArtifactFile, ReviewabilityResult } from '../../shared/execution.js';

export class MissionError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
const transitions: Record<MissionStatus, readonly MissionStatus[]> = {
  funding: ['funded', 'stalled'], funded: ['executing'], executing: ['needs_review', 'failed', 'stalled'],
  needs_review: ['approved', 'changes_requested'], changes_requested: ['executing'], approved: ['released'],
  released: [], failed: ['executing'], stalled: ['funding'],
};
export function assertTransition(from: MissionStatus, to: MissionStatus): void {
  if (!transitions[from].includes(to)) throw new MissionError('invalid_transition', `Cannot transition ${from} to ${to}.`);
}
export function positiveInteger(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) throw new MissionError('invalid_amount', 'Amount must be a positive safe integer.');
}
export function allocateRefund(pool: number, contributions: { id: string; amount: number }[]): Map<string, number> {
  if (!Number.isSafeInteger(pool) || pool < 0) throw new MissionError('invalid_refund', 'Invalid refund pool.');
  const total = contributions.reduce((sum, item) => sum + item.amount, 0);
  if (pool > total) throw new MissionError('invalid_refund', 'Refund exceeds contributions.');
  const rows = contributions.map(item => {
    const numerator = BigInt(pool) * BigInt(item.amount);
    return { id: item.id, share: total ? Number(numerator / BigInt(total)) : 0, remainder: total ? numerator % BigInt(total) : 0n };
  }).sort((a, b) => a.remainder === b.remainder ? a.id.localeCompare(b.id) : a.remainder > b.remainder ? -1 : 1);
  let remaining = pool - rows.reduce((sum, row) => sum + row.share, 0);
  for (const row of rows) if (remaining-- > 0) row.share++;
  return new Map(rows.map(row => [row.id, row.share]));
}
export function computeReviewable(baseline: TestSummary, final: TestSummary, files: ArtifactFile[], integrity: boolean): ReviewabilityResult {
  const reasons: string[] = [];
  if (baseline.exitCode !== 0 || !baseline.passed || baseline.failed !== 0) reasons.push('baseline_not_green');
  if (final.exitCode !== 0 || !final.passed || final.failed !== 0) reasons.push('final_not_green');
  if (!files.length) reasons.push('empty_diff');
  if (files.length > 12 || files.reduce((sum, file) => sum + file.added + file.deleted, 0) > 800) reasons.push('change_too_large');
  if ((final.total ?? -1) < (baseline.total ?? 0)) reasons.push('test_count_reduced');
  if (!files.every(file => /\.(md|txt)$/.test(file.path)) && !files.some(file => /\.test\.mjs$/.test(file.path)) && (final.total ?? 0) <= (baseline.total ?? 0)) reasons.push('missing_test_growth');
  if (!integrity) reasons.push('protected_integrity');
  return { reviewable: reasons.length === 0, reasons };
}
export function redactEvidence(value: string): string {
  return value.replace(/(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,}|Bearer\s+[^\s"']+|(?:api[_-]?key|token|password)\s*[:=]\s*[^\s"']+)/gi, '[REDACTED]').slice(0, 16000);
}

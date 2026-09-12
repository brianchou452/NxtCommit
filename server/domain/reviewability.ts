import type { RunArtifact, ReviewabilityResult, ReviewDecision } from '../../shared/types.js';

/** Measured by the engine against its frozen verification/workspace baseline. */
export interface IntegrityEvidence {
  protectedInputsUnchanged: boolean;
  promptInjectionDetected: boolean;
  documentationOnly: boolean;
  newTestFileObserved: boolean;
}

export function computeReviewable(artifact: RunArtifact, integrity: IntegrityEvidence): ReviewabilityResult {
  const reasons: string[] = [];
  const baseline = artifact.dossier.baseline;
  const final = artifact.dossier.experiments.at(-1);
  if (artifact.testEvidenceSource !== 'engine') reasons.push('fresh_engine_evidence_required');
  if (!final || final.exitCode !== 0 || final.failed !== 0 || !Number.isSafeInteger(final.passed) || final.passed! <= 0) {
    reasons.push('green_nonempty_suite_required');
  }
  const validCount = (value: number | undefined): value is number => Number.isSafeInteger(value) && value! >= 0;
  if (!validCount(baseline.total) || !validCount(final?.total) || final.total < baseline.total) reasons.push('baseline_count_not_preserved');
  if (final && validCount(final.total) && validCount(final.passed) && validCount(final.failed) && final.total !== final.passed + final.failed) {
    reasons.push('inconsistent_final_counts');
  }
  const files = artifact.files;
  const validDiff = files.length > 0 && files.every(file => file.path.length > 0 && file.diff.trim().length > 0 && validCount(file.added) && validCount(file.deleted) && file.added + file.deleted > 0);
  if (!validDiff) reasons.push('nonempty_measured_diff_required');
  if (files.length > 12 || files.reduce((total, file) => total + file.added + file.deleted, 0) > 800) reasons.push('change_budget_exceeded');
  if (new Set(files.map(file => file.path)).size !== files.length) reasons.push('duplicate_file_evidence');
  if (!integrity.documentationOnly && !integrity.newTestFileObserved && !(validCount(baseline.total) && validCount(final?.total) && final.total > baseline.total)) {
    reasons.push('test_growth_required');
  }
  if (integrity.protectedInputsUnchanged !== true) reasons.push('protected_integrity_failed');
  if (integrity.promptInjectionDetected !== false) reasons.push('prompt_injection_or_unknown');
  if (artifact.dossier.qualityGates.some(gate => gate.status !== 'passed')) reasons.push('deterministic_gate_not_passed');
  return { reviewable: reasons.length === 0, reasons };
}

export function validateReviewDecision(runId: string, reviewerId: string, input: unknown): ReviewDecision {
  if (!input || typeof input !== 'object') throw new Error('Invalid review decision.');
  const body = input as Record<string, unknown>;
  if (body.decision !== 'approve' && body.decision !== 'request_changes') throw new Error('Invalid review decision.');
  if (body.comment !== undefined && (typeof body.comment !== 'string' || body.comment.length > 4000)) throw new Error('Invalid review comment.');
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  if (body.decision === 'request_changes') {
    if (!comment) throw new Error('Feedback is required when requesting changes.');
    return { runId, reviewerId, decision: 'request_changes', comment };
  }
  return { runId, reviewerId, decision: 'approve', ...(comment ? { comment } : {}) };
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RunArtifact } from '../shared/types.js';
import { computeReviewable, validateReviewDecision } from './domain/reviewability.js';

const integrity = { protectedInputsUnchanged: true, promptInjectionDetected: false, documentationOnly: false, newTestFileObserved: false };
function artifact(): RunArtifact {
  return {
    runId: 'test-run', testEvidenceSource: 'engine',
    files: [{ path: 'parser.ts', diff: '+ measured change', added: 1, deleted: 0 }],
    dossier: {
      baseline: { command: 'node --test', exitCode: 0, passed: 1, failed: 0, total: 1 },
      experiments: [{ command: 'node --test', exitCode: 0, passed: 2, failed: 0, total: 2 }],
      qualityGates: [{ id: 'integrity', status: 'passed', reason: 'Measured unchanged' }],
      criterionEvidence: [{ criterion: 'Unmeasured property', status: 'unknown', explanation: 'Not established by this suite' }],
    },
    review: { source: 'static', summary: 'Advisory only', affectedGate: false },
  };
}

test('reviewability admits measured green growth without promoting unknown criteria', () => {
  const evidence = artifact();
  const original = structuredClone(evidence);
  assert.equal(computeReviewable(evidence, integrity).reviewable, true);
  assert.deepEqual(evidence, original);
});

test('reviewability fails closed for seed, missing counts, empty suite/diff, and failed integrity', () => {
  const mutations: Array<(evidence: RunArtifact) => void> = [
    e => { e.testEvidenceSource = 'demo'; },
    e => { e.files = []; },
    e => { e.dossier.experiments = []; },
    e => { delete e.dossier.experiments[0]!.failed; },
    e => { e.dossier.experiments[0]!.passed = 0; },
    e => { e.dossier.experiments[0]!.exitCode = 1; },
    e => { e.dossier.experiments[0]!.total = 0; },
    e => { e.dossier.experiments[0]!.total = 100; },
    e => { e.dossier.qualityGates[0]!.status = 'unknown'; },
    e => { e.files[0]!.added = -1; },
    e => { e.files[0]!.added = 801; },
    e => { e.files = Array.from({ length: 13 }, (_, i) => ({ ...e.files[0]!, path: `${i}.ts` })); },
  ];
  for (const mutate of mutations) {
    const evidence = artifact(); mutate(evidence);
    assert.equal(computeReviewable(evidence, integrity).reviewable, false);
  }
  assert.equal(computeReviewable(artifact(), { ...integrity, protectedInputsUnchanged: false }).reviewable, false);
  assert.equal(computeReviewable(artifact(), { ...integrity, promptInjectionDetected: true }).reviewable, false);
});

test('test growth exceptions never waive count regression or integrity', () => {
  const evidence = artifact();
  evidence.dossier.baseline.total = 2;
  assert.equal(computeReviewable(evidence, integrity).reviewable, false);
  assert.equal(computeReviewable(evidence, { ...integrity, documentationOnly: true }).reviewable, true);
  assert.equal(computeReviewable(evidence, { ...integrity, newTestFileObserved: true }).reviewable, true);
  evidence.dossier.baseline.total = 3;
  assert.equal(computeReviewable(evidence, { ...integrity, newTestFileObserved: true }).reviewable, false);
});

test('review decision uses server identity and requires bounded nonblank feedback', () => {
  assert.throws(() => validateReviewDecision('run', 'server-persona', { decision: 'request_changes', comment: '  ' }));
  assert.throws(() => validateReviewDecision('run', 'server-persona', { decision: 'merge' }));
  assert.throws(() => validateReviewDecision('run', 'server-persona', { decision: 'approve', comment: 'x'.repeat(4001) }));
  assert.deepEqual(validateReviewDecision('run', 'server-persona', { decision: 'request_changes', comment: ' Add a test ', reviewerId: 'forged' }), {
    runId: 'run', reviewerId: 'server-persona', decision: 'request_changes', comment: 'Add a test',
  });
});

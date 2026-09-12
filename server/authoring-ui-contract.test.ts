import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider.js';
import { VerificationDossier, DiffViewer } from '../src/components/VerificationDossier.js';
import { ReviewControls } from '../src/components/ReviewControls.js';
import { startTestServer } from './test-support/http.js';
import { evaluateAuthoring } from './authoring/evaluations.js';

test('rendered evidence preserves unknown counts, criterion caveats, literal diff and seed provenance', async () => {
  const server = await startTestServer();
  try {
    const artifact = server.context.evidence!.getRunEvidence('review-demo-run')!.artifact!;
    const dossier = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(VerificationDossier, { artifact })));
    assert.match(dossier, /not fresh engine verification/); assert.match(dossier, /Unknown \/ not measured/); assert.match(dossier, /Passing suites do not prove every acceptance criterion/); assert.doesNotMatch(dossier, /passed: 0/);
    artifact.files[0]!.diff = '<script>untrusted</script>';
    const diff = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(DiffViewer, { artifact })));
    assert.match(diff, /&lt;script&gt;/); assert.doesNotMatch(diff, /<script>/); assert.match(diff, /no upstream pull request/);
  } finally { await server.stop(); }
});
test('read-only perspective contains no decision controls and failed gate disables reviewer controls', () => {
  const props = { status: 'failed', reviewable: false, providerPerspective: false, comment: '', pending: false, done: false, onComment() {}, onDecision() {} };
  const controls = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(ReviewControls, props)));
  assert.equal((controls.match(/<button[^>]*disabled/g) ?? []).length, 2);
  const provider = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(ReviewControls, { ...props, providerPerspective: true })));
  assert.doesNotMatch(provider, /<button|<textarea/); assert.match(provider, /not verified authorization/);
});
test('evaluation defaults to offline non-authorizing results and refuses live without configuration', async () => {
  const result = await evaluateAuthoring(); assert.equal(result.mode, 'dry-run'); assert.equal(result.results.length, 5); assert.equal(result.promotionApproved, false);
  assert.ok(result.results.every(item => item.generator === 'static' && item.bilingual && item.affectedGate === false));
  await assert.rejects(evaluateAuthoring({ live: true }), /requires explicit model configuration/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateChanges, runGithubImplementation, GithubRunFailure } from './github/runner.js';
import type { GithubWorkspace } from '../shared/github.js';
import { SOURCE, FIXED, TEST_SOURCE, gitSha } from './test-support/github.js';
const workspace: GithubWorkspace = { id: 'test', ownerId: 1, repository: 'PrimeIntellect-ai/prime-agent', base: 'main', commit: 'a'.repeat(40), tree: 'b'.repeat(40), changes: {}, revision: 0, analysis: { files: 2, bytes: 205, extensions: {}, dependencies: [] }, files: [{ path: 'math.mjs', content: SOURCE, mode: '100644', sha: gitSha(SOURCE), bytes: SOURCE.length }, { path: 'math.test.mjs', content: TEST_SOURCE, mode: '100644', sha: gitSha(TEST_SOURCE), bytes: TEST_SOURCE.length }] };
test('AI changes cannot replace tests, escape the snapshot, duplicate files or include secret-shaped content', () => {
  for (const changes of [[], [{ path: 'math.test.mjs', content: '' }], [{ path: '../escape', content: 'x' }], [{ path: 'math.mjs', content: SOURCE }], [{ path: 'math.mjs', content: FIXED }, { path: 'math.mjs', content: FIXED }], [{ path: 'math.mjs', content: "const token = 'credential-value';" }], [{ path: 'math.mjs', content: 'x'.repeat(60001) }]]) assert.throws(() => validateChanges(workspace, changes));
  assert.equal(validateChanges(workspace, [{ path: 'math.mjs', content: FIXED }])['math.mjs'], FIXED);
});
test('empty baseline blocks model spend and failed final retains measured usage and test evidence', async () => {
  let modelCalls = 0;
  const model = async () => { modelCalls++; return { text: JSON.stringify({ changes: [{ path: 'math.mjs', content: FIXED }] }), provenance: { generator: 'openai' as const, model: 'controlled', promptVersion: 'github-implementation-v1', fallback: false as const, responseId: 'controlled-response', latencyMs: 1, usage: null } }; };
  await assert.rejects(runGithubImplementation(workspace, { model, verify: async () => ({ exitCode: 0, tests: 0, output: '', command: 'controlled', isolation: 'docker' }) }), /empty_baseline/);
  assert.equal(modelCalls, 0);
  await assert.rejects(runGithubImplementation(workspace, { model, verify: async () => ({ exitCode: 1, tests: 1, output: 'failing measured suite', command: 'controlled', isolation: 'docker' }) }), error => {
    assert.ok(error instanceof GithubRunFailure); assert.equal(error.evidence.final.exitCode, 1); assert.equal(error.evidence.provenance.usage, null); return true;
  });
  assert.equal(modelCalls, 1);
});

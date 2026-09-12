import { createHash } from 'node:crypto';
export const SOURCE = 'export const add = (a, b) => a - b;\n';
export const FIXED = 'export const add = (a, b) => a + b;\n';
export const TEST_SOURCE = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from './math.mjs';\ntest('adds two numbers', () => assert.equal(add(2, 3), 5));\n";
export const gitSha = (content: string) => createHash('sha1').update(`blob ${Buffer.byteLength(content)}\0${content}`).digest('hex');
export function githubTransport() {
  const files = [{ path: 'math.mjs', content: SOURCE }, { path: 'math.test.mjs', content: TEST_SOURCE }];
  const calls: Array<{ path: string; method: string; body: any }> = [];
  let head = ''; let branch = ''; let draft = true; let opened = false; let commits = 0;
  const state = { failChecks: false, denied: false, truncated: false, wrongHead: false, losePrResponse: false, modelFailure: false, private: false };
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input)); const path = url.pathname + url.search; const method = init?.method ?? 'GET'; const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, method, body });
    const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    const commit = 'a'.repeat(40); const tree = 'b'.repeat(40); const root = '/repos/PrimeIntellect-ai/prime-agent';
    const pr = () => ({ html_url: 'https://github.com/PrimeIntellect-ai/prime-agent/pull/42', node_id: 'PR_test', state: 'open', draft, head: { sha: state.wrongHead ? commit : head }, base: { ref: 'main' } });
    if (path === '/user') return response({ id: new Headers(init?.headers).get('authorization')?.includes('second-user') ? 2 : 1, login: 'workspace-user' });
    if (path === root) return response({ private: state.private, default_branch: 'main', permissions: { push: !state.denied } });
    if (path === `${root}/commits/main`) return response({ sha: commit, commit: { tree: { sha: tree } } });
    if (path === `${root}/git/trees/${tree}?recursive=1`) return response({ truncated: state.truncated, tree: files.map(f => ({ path: f.path, sha: gitSha(f.content), type: 'blob', mode: '100644', size: Buffer.byteLength(f.content) })) });
    if (path.startsWith(`${root}/git/blobs/`)) { const f = files.find(f => path.endsWith(gitSha(f.content)))!; return response({ encoding: 'base64', content: Buffer.from(f.content).toString('base64') }); }
    if (path === `${root}/git/trees` && method === 'POST') return response({ sha: 'c'.repeat(40) });
    if (path === `${root}/git/commits` && method === 'POST') { commits++; return response({ sha: String(commits).repeat(40) }); }
    if (path.startsWith(`${root}/git/commits/`)) return response({ tree: { sha: tree } });
    if (path.startsWith(`${root}/git/matching-refs/`)) return response(head ? [{ ref: `refs/heads/${branch}`, object: { sha: head } }] : []);
    if (path === `${root}/git/refs` && method === 'POST') { head = body.sha; branch = body.ref.replace('refs/heads/', ''); return response({ object: { sha: head } }); }
    if (path.startsWith(`${root}/git/ref/heads/`)) return response({ object: { sha: head } });
    if (path.startsWith(`${root}/git/refs/heads/`) && method === 'PATCH') { head = body.sha; return response({ object: { sha: head } }); }
    if (path.startsWith(`${root}/pulls?`)) return response(opened ? [pr()] : []);
    if (path === `${root}/pulls` && method === 'POST') { opened = true; if (state.losePrResponse) { state.losePrResponse = false; throw new Error('uncertain transport'); } return response(pr()); }
    if (path === `${root}/pulls/42`) return response(pr());
    if (path.includes('/check-runs?')) return response({ total_count: 1, check_runs: [{ name: 'test', head_sha: head, status: 'completed', conclusion: state.failChecks ? 'failure' : 'success', app: { slug: 'github-actions' } }] });
    if (path === '/graphql') { draft = false; return response({ data: { markPullRequestReadyForReview: { pullRequest: { id: 'PR_test', isDraft: false } } } }); }
    throw new Error(`Unexpected fixture request ${method} ${path}`);
  };
  return { fetcher, calls, state, files, snapshot: () => ({ head, draft, opened, commits }) };
}

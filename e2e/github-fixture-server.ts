import express from 'express';
import { createApplication } from '../server/app.js';
import { githubTransport, FIXED } from '../server/test-support/github.js';
import { runGithubImplementation, verifyDocker, type Verification } from '../server/github/runner.js';
import { createOpenAIResponse } from '../server/services/openai.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
let transport = githubTransport();
// The default Docker-browser harness has no Docker socket. Its test-only verifier
// executes only this authored math fixture. The local full-stack mode uses real Docker.
const verify: typeof verifyDocker = process.env.GITHUB_E2E_REAL_DOCKER === '1' ? verifyDocker : async (w, changes) => {
  const dir = await mkdtemp(join(tmpdir(), 'github-e2e-'));
  try {
    for (const f of w.files) await writeFile(join(dir, f.path), changes[f.path] ?? f.content!);
    let output = ''; let code = 0;
    try { output = (await promisify(execFile)(process.execPath, ['--test', '--test-reporter=tap', 'math.test.mjs'], { cwd: dir })).stdout; }
    catch (e) { const error = e as { stdout: string; code: number }; output = error.stdout; code = error.code; }
    return { exitCode: code, tests: 1, output, command: 'test fixture Node subprocess', isolation: 'docker' } satisfies Verification;
  } finally { await rm(dir, { recursive: true, force: true }); }
};
const stateDirectory = await mkdtemp(join(tmpdir(), 'nxt-github-server-'));
const app = createApplication({ databasePath: join(stateDirectory, 'state.sqlite'), staticDirectory: 'dist', github: {
  enabled: true, requiredChecks: ['test'], fetcher: (input, init) => transport.fetcher(input, init),
  runner: w => runGithubImplementation(w, { verify, model: (input, version, options) => createOpenAIResponse(input, version, { ...options, env: { OPENAI_API_KEY: 'sk-fixture-not-a-real-key', OPENAI_MODEL: 'fixture-model' }, fetch: async () => new Response(JSON.stringify({ id: 'resp_fixture', status: 'completed', model: 'fixture-model', usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 }, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ changes: [{ path: 'math.mjs', content: transport.state.modelFailure ? 'export const add = () => 0;\n' : FIXED }] }) }] }] })) }) }),
} });
// Test controls are installed only in this fixture entrypoint, never in the application.
const outer = express(); outer.use(express.json());
outer.get('/__fixture/state', (_req, res) => res.json({ ...transport.snapshot(), calls: transport.calls }));
outer.post('/__fixture/config', (req, res) => { if (req.body.reset) transport = githubTransport(); Object.assign(transport.state, req.body); res.json({ ok: true }); });
outer.use(app.app);
const server = outer.listen(4202, '127.0.0.1');
process.once('SIGTERM', () => { server.close(() => { void app.close().then(() => rm(stateDirectory, { recursive: true, force: true })); }); server.closeAllConnections(); });

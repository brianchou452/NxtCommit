import { randomBytes, createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { Router } from 'express';
import { boundedJson, publicRepository, redactText } from '../authoring/analyzer.js';
import { runGithubImplementation, GithubRunFailure, type RunResult } from './runner.js';
import type { GithubWorkspace, GithubFile } from '../../shared/github.js';

class Failure extends Error { constructor(readonly code: string, readonly status = 400) { super(code); } }
export interface GithubOptions { fetcher?: typeof fetch; missions?: { create(workspace: GithubWorkspace, title: string, credits: number): string; pledge(id: string, amount: number, key: string): unknown }; requiredChecks?: string[]; runner?: (workspace: GithubWorkspace, signal: AbortSignal) => Promise<RunResult>; enabled?: boolean }
const sha = (value: unknown): string => { if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value)) throw new Failure('invalid_github_response'); return value; };
const safePath = (path: string) => path.length <= 500 && !path.split('/').some(p => !p || p === '.' || p === '..' || p.toLowerCase() === '.git') && !/[\\\x00-\x1f]/.test(path);
export function githubRoutes(db: DatabaseSync, options: GithubOptions = {}) {
  db.exec('CREATE TABLE IF NOT EXISTS github_workspaces (id TEXT PRIMARY KEY, owner INTEGER NOT NULL, data TEXT NOT NULL)');
  for (const row of db.prepare('SELECT id,data FROM github_workspaces').all()) { const w = JSON.parse(String(row.data)) as GithubWorkspace; if (w.phase === 'running') { w.phase = 'failed'; w.error = 'execution_interrupted'; db.prepare('UPDATE github_workspaces SET data=? WHERE id=?').run(JSON.stringify(w), row.id!); } }
  const sessions = new Map<string, { token: string; owner: number; login: string; expires: number }>();
  const expiry = setInterval(() => { for (const [id, session] of sessions) if (session.expires <= Date.now()) sessions.delete(id); }, 60000); expiry.unref();
  const locks = new Set<string>();
  const pending = new Set<Promise<void>>(); const timers = new Map<string, ReturnType<typeof setTimeout>>(); const polls = new Map<string, number>();
  const controller = new AbortController();
  const router = Router();
  async function api(token: string, path: string, body?: unknown, method?: string): Promise<any> {
    if (path !== '/user' && ![...sessions.values()].some(session => session.token === token && session.expires > Date.now())) throw new Failure('github_auth_required', 401);
    const response = await (options.fetcher ?? fetch)(`https://api.github.com${path}`, { method: method ?? (body === undefined ? 'GET' : 'POST'), redirect: 'error', signal: AbortSignal.timeout(20000), headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'NxtCommit', 'X-GitHub-Api-Version': '2022-11-28' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!response.ok) throw new Failure(response.status === 401 ? 'github_auth_required' : response.status === 403 || response.status === 429 ? 'github_permission_or_rate_limit' : 'github_request_failed',  response.status === 401 ? 401 : 502);
    return boundedJson(response, 8_000_000);
  }
  router.use((req, _res, next) => {
    // Browser mutations must be same-origin; non-browser clients still require the session cookie.
    if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`) return next(new Failure('origin_rejected', 403));
    if (req.headers['sec-fetch-site'] === 'cross-site') return next(new Failure('origin_rejected', 403));
    next();
  });
  const cookie = (req: import('express').Request) => /(?:^|;\s*)nxt_github=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1] ?? '';
  router.post('/session', async (req, res) => {
    const token = req.body?.token;
    if (typeof token !== 'string' || token.length < 10 || token.length > 300 || /\s/.test(token)) throw new Failure('github_auth_required', 401);
    const user = await api(token, '/user');
    if (!Number.isSafeInteger(user.id) || typeof user.login !== 'string') throw new Failure('github_auth_required', 401);
    for (const [key, session] of sessions) if (session.expires < Date.now()) sessions.delete(key);
    if (sessions.size >= 100) throw new Failure('session_capacity', 503);
    sessions.delete(cookie(req));
    const id = randomBytes(32).toString('hex'); sessions.set(id, { token, owner: user.id, login: user.login, expires: Date.now() + 3600000 });
    res.cookie('nxt_github', id, { httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/api/github', maxAge: 3600000 }); res.json({ login: user.login });
  });
  router.use((req, res, next) => {
    const session = sessions.get(cookie(req));
    if (!session || session.expires < Date.now()) { sessions.delete(cookie(req)); return next(new Failure('github_auth_required', 401)); }
    res.locals.session = session; next();
  });
  router.get('/session', (_req, res) => res.json({ login: res.locals.session.login }));
  router.post('/logout', (req, res) => { sessions.delete(cookie(req)); res.clearCookie('nxt_github', { path: '/api/github' }); res.json({ ok: true }); });
  const save = (workspace: GithubWorkspace) => db.prepare('INSERT INTO github_workspaces VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(workspace.id, workspace.ownerId, JSON.stringify(workspace));
  function load(id: string, owner: number): GithubWorkspace {
    const row = db.prepare('SELECT data FROM github_workspaces WHERE id=? AND owner=?').get(id, owner) as { data: string } | undefined;
    if (!row) throw new Failure('workspace_not_found', 404); return JSON.parse(row.data);
  }
  router.get('/workspaces', (_req, res) => res.json({ workspaces: (db.prepare('SELECT data FROM github_workspaces WHERE owner=?').all(res.locals.session.owner) as { data: string }[]).map(row => { const w = JSON.parse(row.data) as GithubWorkspace; return { id: w.id, repository: w.repository }; }) }));
  router.post('/workspaces', async (req, res) => {
    const count = db.prepare('SELECT count(*) AS n FROM github_workspaces WHERE owner=?').get(res.locals.session.owner)!;
    if (Number(count.n) >= 50) throw new Failure('workspace_capacity', 409);
    const identity = publicRepository(req.body?.url); const repository = `${identity.owner}/${identity.repo}`; const root = `/repos/${repository}`; const { token, owner } = res.locals.session;
    const repo = await api(token, root);
    if (repo.private !== false || typeof repo.default_branch !== 'string') throw new Failure('public_repository_required');
    const commit = await api(token, `${root}/commits/${encodeURIComponent(repo.default_branch)}`);
    const commitSha = sha(commit.sha); const treeSha = sha(commit.commit?.tree?.sha);
    const tree = await api(token, `${root}/git/trees/${treeSha}?recursive=1`);
    if (tree.truncated || !Array.isArray(tree.tree) || tree.tree.length > 3000) throw new Failure('repository_too_large');
    const entries = tree.tree.filter((entry: any) => entry.type !== 'tree');
    let bytes = 0; const files: GithubFile[] = [];
    for (const entry of entries) {
      if (typeof entry.path !== 'string' || !safePath(entry.path)) throw new Failure('unsafe_repository_path');
      if (entry.type !== 'blob') throw new Failure('submodules_not_supported');
      if (!Number.isSafeInteger(entry.size) || entry.size > 500000 || (bytes += entry.size) > 10_000_000) throw new Failure('repository_too_large');
      const blob = await api(token, `${root}/git/blobs/${sha(entry.sha)}`);
      if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw new Failure('invalid_github_response');
      const buffer = Buffer.from(blob.content, 'base64');
      if (createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex') !== entry.sha || buffer.length !== entry.size) throw new Failure('invalid_github_response');
      let content: string | null = null;
      try { content = new TextDecoder('utf-8', { fatal: true }).decode(buffer); if (content.includes('\0') || redactText(content) !== content) content = null; } catch { /* Binary files remain represented by immutable Git blobs. */ }
      files.push({ path: entry.path, mode: entry.mode, sha: entry.sha, bytes: buffer.length, content });
    }
    const extensions: Record<string, number> = Object.create(null); const dependencies: string[] = [];
    for (const file of files) {
      const ext = file.path.split('.').pop()!.slice(0, 30); extensions[ext] = (extensions[ext] ?? 0) + 1;
      if (/(^|\/)package.json$/.test(file.path) && file.content) try { const manifest = JSON.parse(file.content); dependencies.push(...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})); } catch { /* Invalid manifests are source data, never executed. */ }
    }
    const canonicalRepository = typeof repo.full_name === 'string' && repo.full_name.toLowerCase() === repository.toLowerCase() ? repo.full_name : repository;
    const workspace: GithubWorkspace = { id: randomBytes(16).toString('hex'), ownerId: owner, repository: canonicalRepository, base: repo.default_branch, commit: commitSha, tree: treeSha, files, changes: {}, revision: 0, analysis: { files: files.length, bytes, extensions, dependencies: [...new Set(dependencies)].sort() } };
    save(workspace); res.json({ workspace });
  });
  router.get('/workspaces/:id', (req, res) => res.json({ workspace: load(req.params.id, res.locals.session.owner) }));
  router.post('/workspaces/:id/pledge', async (req, res) => {
    const w = load(req.params.id, res.locals.session.owner); const { token } = res.locals.session;
    if (locks.has(w.id)) throw new Failure('workspace_locked', 409);
    if (w.prUrl) { res.json({ workspace: w }); return; }
    if (!options.enabled) throw new Failure('github_execution_not_configured', 503);
    if (pending.size >= 2) throw new Failure('execution_capacity', 503);
    const title = req.body?.title; const amount = req.body?.amount;
    if (!options.missions || typeof title !== 'string' || !title.trim() || title.length > 150 || redactText(title) !== title || !Number.isSafeInteger(amount) || amount <= 0) throw new Failure('invalid_publication');
    if (w.pledged && (w.pledged !== amount || w.title !== title)) throw new Failure('pledge_intent_conflict', 409);
    locks.add(w.id);
    try {
      const root = `/repos/${w.repository}`; const repo = await api(token, root);
      if (!repo.permissions?.push) throw new Failure('repository_write_required', 403);
      if (!w.branch) { const current = await api(token, `${root}/commits/${encodeURIComponent(w.base)}`); if (sha(current.sha) !== w.commit) throw new Failure('base_changed', 409); }
      if (!w.missionId) { w.missionId = options.missions.create(w, title, amount); w.title = title; save(w); }
      if (!w.pledged) { options.missions.pledge(w.missionId, amount, `github-${w.id}`); w.pledged = amount; save(w); }
      if (!w.branch) {
        const current = await api(token, `${root}/commits/${encodeURIComponent(w.base)}`);
        if (sha(current.sha) !== w.commit) throw new Failure('base_changed', 409);
        // GitHub needs a difference to open a draft PR. Record the funded task before implementation.
        const path = `.nxtcommit/tasks/${w.id}.md`;
        if (w.files.some(f => f.path === path)) throw new Failure('branch_conflict', 409);
        const tree = await api(token, `${root}/git/trees`, { base_tree: w.tree, tree: [{ path, mode: '100644', type: 'blob', content: `# ${w.title}\n\nSource: ${w.commit}\nStatus: funded; implementation pending.\nCredits are prototype units, not provider tokens.\n` }] });
        const commit = await api(token, `${root}/git/commits`, { message: `docs: plan ${w.title}`, tree: sha(tree.sha), parents: [w.commit] });
        w.publishedCommit = sha(commit.sha); w.branch = `nxtcommit/${w.id}`; save(w);
      }
      const refs = await api(token, `${root}/git/matching-refs/heads/${w.branch}`);
      const existing = Array.isArray(refs) ? refs.find((r: any) => r.ref === `refs/heads/${w.branch}`) : undefined;
      if (existing && existing.object?.sha !== w.publishedCommit) throw new Failure('branch_conflict', 409);
      if (!existing) await api(token, `${root}/git/refs`, { ref: `refs/heads/${w.branch}`, sha: w.publishedCommit });
      const pulls = await api(token, `${root}/pulls?state=all&head=${encodeURIComponent(w.repository.split('/')[0] + ':' + w.branch)}&base=${encodeURIComponent(w.base)}`);
      const pr = Array.isArray(pulls) && pulls.length ? pulls[0] : await api(token, `${root}/pulls`, { title: w.title, head: w.branch, base: w.base, draft: true, body: `Source commit: ${w.commit}\n\nFunded task; implementation and verification pending. Credits are prototype units, not provider tokens.` });
      if (typeof pr.html_url !== 'string' || !pr.html_url.startsWith(`https://github.com/${w.repository}/pull/`) || !/^\d+$/.test(pr.html_url.split('/').pop()!) || typeof pr.node_id !== 'string') throw new Failure('invalid_github_response');
      w.prUrl = pr.html_url; w.prNodeId = pr.node_id; w.phase = 'draft'; save(w); res.json({ workspace: w });
      setImmediate(() => launch(w.id, w.ownerId, token));
    } finally { locks.delete(w.id); }
  });
  async function submit(w: GithubWorkspace, token: string) {
      const root = `/repos/${w.repository}`;
      const ref = await api(token, `${root}/git/ref/heads/${w.branch}`);
      if (!w.implementationCommit) {
        if (sha(ref.object?.sha) !== w.publishedCommit) throw new Failure('branch_conflict', 409);
        const parent = await api(token, `${root}/git/commits/${w.publishedCommit}`);
        const tree = await api(token, `${root}/git/trees`, { base_tree: sha(parent.tree?.sha), tree: Object.entries(w.changes).map(([path, content]) => ({ path, mode: w.files.find(f => f.path === path)!.mode, type: 'blob', content })) });
        const commit = await api(token, `${root}/git/commits`, { message: `feat: ${w.title}`, tree: sha(tree.sha), parents: [w.publishedCommit] });
        w.implementationCommit = sha(commit.sha); save(w);
      }
      if (ref.object?.sha !== w.implementationCommit) {
        if (ref.object?.sha !== w.publishedCommit) throw new Failure('branch_conflict', 409);
        await api(token, `${root}/git/refs/heads/${w.branch}`, { sha: w.implementationCommit, force: false }, 'PATCH');
      }
  }
  async function ready(w: GithubWorkspace, token: string) {
    if (!w.prNodeId || !w.implementationCommit || !options.requiredChecks?.length) throw new Failure('verification_required', 409);
      const root = `/repos/${w.repository}`;
      const pr = await api(token, `${root}/pulls/${w.prUrl!.split('/').pop()}`);
      if (pr.state !== 'open' || pr.head?.sha !== w.implementationCommit || pr.base?.ref !== w.base) throw new Failure('branch_conflict', 409);
      const checks = await api(token, `${root}/commits/${w.implementationCommit}/check-runs?per_page=100&filter=latest`);
      if (checks.total_count > 100 || !Array.isArray(checks.check_runs) || !options.requiredChecks.every(name => checks.check_runs.some((c: any) => c.name === name && c.head_sha === w.implementationCommit && c.status === 'completed' && c.conclusion === 'success' && c.app?.slug === 'github-actions'))) throw new Failure('verification_required', 409);
      // Recheck after observing CI so a changed PR head cannot reuse stale results.
      const fresh = await api(token, `${root}/pulls/${w.prUrl!.split('/').pop()}`);
      if (fresh.head?.sha !== w.implementationCommit || fresh.state !== 'open') throw new Failure('branch_conflict', 409);
      const result = await api(token, '/graphql', { query: 'mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{id isDraft}}}', variables: { id: w.prNodeId } });
      if (result.errors || result.data?.markPullRequestReadyForReview?.pullRequest?.isDraft !== false) throw new Failure('github_request_failed', 502);
    w.ready = true; w.phase = 'ready'; delete w.error; save(w);
  }
  async function advance(id: string, owner: number, token: string) {
    if (locks.has(id)) return;
    locks.add(id);
    const w = load(id, owner);
    try {
      if (w.ready) return;
      if (!w.run) {
        w.phase = 'running'; delete w.error; save(w);
        const result = await (options.runner ?? ((workspace, signal) => runGithubImplementation(workspace, { signal })))(w, controller.signal);
        if (controller.signal.aborted) throw new Error('execution_interrupted');
        w.changes = result.changes; w.revision++; w.run = { baseline: result.baseline, final: result.final, provenance: result.provenance };
        w.phase = 'verified'; save(w);
      }
      await submit(w, token); w.phase = 'awaiting_ci'; save(w);
      await ready(w, token);
    } catch (error) {
      if (error instanceof GithubRunFailure) w.lastFailure = { baseline: error.evidence.baseline, final: error.evidence.final, provenance: error.evidence.provenance };
      const code = error instanceof Failure ? error.code : error instanceof Error && ['unsupported_test_suite', 'empty_baseline', 'model_context_limit', 'invalid_model_changes', 'verification_failed', 'sandbox_unavailable_or_timeout'].includes(error.message) ? error.message : 'implementation_failed';
      w.phase = code === 'verification_required' ? 'awaiting_ci' : 'failed'; w.error = code; save(w);
      if (code === 'verification_required' && !controller.signal.aborted && (polls.get(id) ?? 0) < 90) { polls.set(id, (polls.get(id) ?? 0) + 1); const timer = setTimeout(() => launch(id, owner, token), 10000); timer.unref(); timers.set(id, timer); }
    } finally { locks.delete(id); }
  }
  function launch(id: string, owner: number, token: string) {
    if (controller.signal.aborted) return;
    clearTimeout(timers.get(id)); timers.delete(id);
    const promise = advance(id, owner, token).catch(() => {}).finally(() => pending.delete(promise)); pending.add(promise);
  }
  router.post('/workspaces/:id/resume', (req, res) => {
    const w = load(req.params.id, res.locals.session.owner);
    if (pending.size >= 2) throw new Failure('execution_capacity', 503);
    if (!w.prUrl || !options.enabled) throw new Failure('draft_required', 409);
    polls.delete(w.id); setImmediate(() => launch(w.id, w.ownerId, res.locals.session.token));
    res.json({ workspace: w });
  });
  router.use((error: unknown, _req: import('express').Request, res: import('express').Response, _next: import('express').NextFunction) => res.status(error instanceof Failure ? error.status : 502).json({ code: error instanceof Failure ? error.code : 'github_request_failed' }));
  return { router, close: async () => { controller.abort(); clearInterval(expiry); for (const timer of timers.values()) clearTimeout(timer); timers.clear(); await Promise.allSettled([...pending]); sessions.clear(); } };
}

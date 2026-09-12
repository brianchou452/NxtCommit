import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleProvider.js';
import { productRequest, ProductError } from '../services/authoring.js';
import type { GithubWorkspace } from '../../shared/github.js';
import '../styles/authoring.css';

export function GithubWorkspacePage() {
  const { text } = useLocale(); const [search, setSearch] = useSearchParams();
  const [login, setLogin] = useState(''); const [token, setToken] = useState('');
  const [url, setUrl] = useState('https://github.com/PrimeIntellect-ai/prime-agent');
  const [title, setTitle] = useState(''); const [amount, setAmount] = useState(100);
  const [workspace, setWorkspace] = useState<GithubWorkspace>(); const [file, setFile] = useState('');
  const [history, setHistory] = useState<Array<{ id: string; repository: string }>>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const working = useRef(false);
  const request = <T,>(path: string, body?: unknown) => productRequest<T>(`/api/github${path}`, body);
  function failure(error: unknown) { setError(error instanceof ProductError ? error.code : 'github_request_failed'); }
  async function action(work: () => Promise<void>) { if (working.current) return; working.current = true; setBusy(true); setError(''); try { await work(); } catch (error) { failure(error); } finally { working.current = false; setBusy(false); } }
  const id = search.get('workspace');
  useEffect(() => { let active = true; void request<{ login: string }>('/session').then(result => { if (active) setLogin(result.login); }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => {
    if (!login) return; let active = true;
    void request<{ workspaces: typeof history }>('/workspaces').then(r => { if (active) setHistory(r.workspaces); }).catch(failure);
    if (id) void request<{ workspace: GithubWorkspace }>(`/workspaces/${id}`).then(r => { if (active) { setWorkspace(r.workspace); setFile(r.workspace.files[0]?.path ?? ''); } }).catch(failure);
    return () => { active = false; };
  }, [id, login]);
  useEffect(() => {
    if (!workspace?.prUrl || workspace.ready || workspace.phase === 'failed') return;
    let active = true;
    const timer = setInterval(() => { void request<{ workspace: GithubWorkspace }>(`/workspaces/${workspace.id}`).then(r => { if (active) setWorkspace(r.workspace); }).catch(failure); }, 1500);
    return () => { active = false; clearInterval(timer); };
  }, [workspace?.id, workspace?.phase, workspace?.ready]);
  const selected = workspace?.files.find(f => f.path === file);
  const evidence = workspace?.run ?? workspace?.lastFailure;
  const phase = workspace?.phase;
  const phaseText = phase ? ({ draft: text.gh_draft, running: text.gh_running, verified: text.gh_verified, awaiting_ci: text.gh_ci, ready: text.gh_ready, failed: text.gh_failed })[phase] : '';
  const errorText = error || workspace?.error;
  return <main id="main-content" className="c-wizard gh-workspace" tabIndex={-1}>
    <h1>{text.gh_title}</h1><p>{text.gh_intro}</p><p>{text.gh_limits}</p>
    {!login ? <form onSubmit={event => { event.preventDefault(); const value = token; setToken(''); void action(async () => { const r = await request<{ login: string }>('/session', { token: value }); setLogin(r.login); }); }}>
      <label>{text.gh_token}<input type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} required /></label><p>{text.gh_token_note}</p><button disabled={busy}>{text.gh_connect}</button>
    </form> : <>
      <p>{text.gh_connected} {login} <button disabled={busy} onClick={() => void action(async () => { await request('/logout', {}); setLogin(''); setWorkspace(undefined); setHistory([]); })}>{text.gh_disconnect}</button></p>
      <form onSubmit={e => { e.preventDefault(); void action(async () => { const r = await request<{ workspace: GithubWorkspace }>('/workspaces', { url }); setWorkspace(r.workspace); setSearch({ workspace: r.workspace.id }); }); }}>
        <label>{text.gh_url}<input value={url} onChange={e => setUrl(e.target.value)} type="url" required /></label><button disabled={busy}>{text.gh_import}</button>
      </form>
      {history.length > 0 && <label>{text.gh_history}<select value={id ?? ''} onChange={e => setSearch({ workspace: e.target.value })}><option value="">{text.gh_select}</option>{history.map(w => <option value={w.id} key={w.id}>{w.repository} · {w.id.slice(0, 8)}</option>)}</select></label>}
      {workspace && <section className="c-card" aria-label={text.gh_analysis}>
        <h2>{workspace.repository}</h2><p>{text.gh_commit} <code>{workspace.commit}</code></p>
        <p>{text.gh_files}: {workspace.analysis.files} · {text.gh_bytes}: {workspace.analysis.bytes}</p>
        <p>{text.gh_dependencies}: {workspace.analysis.dependencies.join(', ') || text.gh_none}</p>
        <label>{text.gh_file}<select value={file} onChange={e => setFile(e.target.value)}>{workspace.files.map(f => <option key={f.path}>{f.path}</option>)}</select></label>
        <pre style={{ maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{selected?.content ?? text.gh_hidden}</pre>
        {!workspace.prUrl && <form onSubmit={e => { e.preventDefault(); void action(async () => { const r = await request<{ workspace: GithubWorkspace }>(`/workspaces/${workspace.id}/pledge`, { title, amount }); setWorkspace(r.workspace); }); }}>
          <label>{text.gh_task}<textarea value={title} maxLength={150} onChange={e => setTitle(e.target.value)} required /></label>
          <label>{text.gh_amount}<input type="number" min={1} value={amount} onChange={e => setAmount(Number(e.target.value))} required /></label>
          <p>{text.gh_authorize}</p><button disabled={busy}>{text.gh_pledge}</button>
        </form>}
        {workspace.prUrl && <><p role="status">{phaseText}</p><a href={workspace.prUrl} target="_blank" rel="noreferrer">{text.gh_open_pr}</a>{workspace.missionId && <p><Link to={`/missions/${workspace.missionId}`}>{text.gh_mission}</Link></p>}
          {['failed', 'awaiting_ci'].includes(workspace.phase ?? '') && <button disabled={busy} onClick={() => void action(async () => { const r = await request<{ workspace: GithubWorkspace }>(`/workspaces/${workspace.id}/resume`, {}); setWorkspace({ ...r.workspace, phase: 'running' }); })}>{text.gh_resume}</button>}
        </>}
        {Object.entries(workspace.changes).map(([path, content]) => <details key={path}><summary>{text.gh_diff}: {path}</summary><h3>{text.gh_before}</h3><pre>{workspace.files.find(f => f.path === path)?.content}</pre><h3>{text.gh_after}</h3><pre>{content}</pre></details>)}
        {evidence && <section><h3>{text.gh_evidence}</h3><p>{text.gh_model}: {evidence.provenance.model} · {evidence.provenance.promptVersion}</p><p>{text.gh_usage}: {evidence.provenance.usage?.totalTokens ?? text.gh_unknown}</p><p>{text.gh_baseline}: {evidence.baseline.tests} / {evidence.baseline.exitCode} · {text.gh_final}: {evidence.final.tests} / {evidence.final.exitCode}</p><pre>{evidence.final.output}</pre></section>}
      </section>}
    </>}
    {busy && <p role="status">{text.loading}</p>}
    {errorText && <p role="alert">{text.gh_error} ({errorText})</p>}
  </main>;
}

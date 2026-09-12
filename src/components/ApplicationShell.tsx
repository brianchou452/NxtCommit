import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleProvider.js';
import { useApplicationSession } from './useApplicationSession.js';
import logo from '../../spec/assets/branding/nxtcommit-app-icon.svg';
import '../styles/shell.css';

function ShellIcon({ kind }: { kind: 'plus' | 'medal' | 'play' | 'globe' | 'wallet' | 'bolt' | 'flask' }) {
  const paths = {
    plus: 'M12 5v14M5 12h14',
    medal: 'M8 14 6 22l6-3 6 3-2-8M12 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z',
    play: 'm10 8 6 4-6 4ZM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
    globe: 'M2 12h20M12 2c6 5 6 15 0 20-6-5-6-15 0-20ZM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
    wallet: 'M20 7H5a2 2 0 0 1 0-4h13v4M20 7v14H5a2 2 0 0 1-2-2V5m17 7h-6v5h6',
    bolt: 'm14 2-10 12h7l-1 8 10-12h-7Z',
    flask: 'M9 2h6M10 2v7L4 20q-1 2 2 2h12q3 0 2-2L14 9V2M7 15h10',
  };
  return <svg className={`shell-icon shell-icon-${kind}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}

export function ApplicationShell({ children }: { children: ReactNode }) {
  const { text, locale, setLocale } = useLocale();
  const session = useApplicationSession();
  const navigate = useNavigate();
  const githubWorkspace = useLocation().pathname === '/github';
  const data = session.state.status === 'ready' ? session.state.data : undefined;
  const execution = data?.execution;
  const modeLabels = { demo: text.demo_mode, llm: text.llm_mode, codex: text.codex_mode };
  async function reset() {
    if (await session.reset()) navigate('/');
  }
  return <div className="application-shell">
    <a className="skip-link" href="#main-content">{text.skip}</a>
    <header className="shell-header" data-testid="shell-header">
      <div className="shell-row">
        <Link className="product" to="/"><img src={logo} width="32" height="32" alt="" />{text.product}</Link>
        <nav className="primary-navigation" aria-label={text.product}>
          <NavLink to="/" end>{text.discover}</NavLink>
          <NavLink to="/new"><ShellIcon kind="plus" />{text.new_mission}</NavLink>
          {data ? <NavLink to={`/contributors/${encodeURIComponent(data.currentUser.id)}`}><ShellIcon kind="medal" />{text.profile}</NavLink> : <span aria-disabled="true">{text.profile}</span>}
          <NavLink to="/assurance">{text.assurance_nav}</NavLink>
          <NavLink to="/demo"><ShellIcon kind="play" />{text.demo}</NavLink>
        </nav>
        <div className="shell-controls">
          {execution && !githubWorkspace && <span className={`mode-badge ${execution.resolved ? 'resolved' : 'refused'}`}>
            <ShellIcon kind="flask" />
            {execution.resolved ? modeLabels[execution.resolved] : text.unavailable}
          </span>}
          <label className="locale-control"><span className="sr-only">{text.language}</span>
            <ShellIcon kind="globe" />
            <select aria-label={text.language} value={locale} onChange={event => setLocale(event.target.value === 'zh-TW' ? 'zh-TW' : 'en')}>
              <option value="en">{text.english}</option><option value="zh-TW">{text.traditional_chinese}</option>
            </select>
          </label>
          <span className="wallet" aria-label={text.wallet}>
            <ShellIcon kind="wallet" /><ShellIcon kind="bolt" />
            {data ? new Intl.NumberFormat(locale).format(data.currentUser.walletBalance) : '—'}
          </span>
          {data && <span className="persona" title={`${text.local_persona}: ${data.currentUser.name}`} aria-label={`${text.local_persona}: ${data.currentUser.name}`}>
            {data.currentUser.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('')}
          </span>}
        </div>
      </div>
    </header>
    {execution?.error && !githubWorkspace && <p className="shell-container execution-refusal" role="alert">{execution.error}</p>}
    {session.state.status === 'loading' && <p className="shell-container" role="status">{text.loading}</p>}
    {session.state.status === 'error' && <div className="shell-container" role="alert">
      <p>{text.bootstrap_error}</p><button onClick={() => void session.reload()}>{text.retry}</button>
    </div>}
    {session.resetState === 'done' && <p className="shell-container" role="status">{text.reset_done}</p>}
    {session.resetState === 'error' && <p className="shell-container" role="alert">{text.reset_error}</p>}
    {children}
    <footer className="shell-footer"><div className="shell-container">
      <p>{text.product} · {text.build_note}</p><p>{text.disclaimer}</p>
      {session.state.status === 'ready' && session.state.data.demoProtected ? <p>{text.demo_protected}</p> : <button disabled={session.resetState === 'pending'} onClick={() => void reset()}>
        {session.resetState === 'pending' ? text.reset_pending : text.reset}
      </button>}
    </div></footer>
  </div>;
}

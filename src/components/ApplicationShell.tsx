import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleProvider.js';
import { useApplicationSession } from './useApplicationSession.js';
import logo from '../../spec/assets/branding/nxtcommit-app-icon.svg';
import '../styles/shell.css';

export function ApplicationShell({ children }: { children: ReactNode }) {
  const { text, locale, setLocale } = useLocale();
  const session = useApplicationSession();
  const navigate = useNavigate();
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
          <NavLink to="/new">{text.new_mission}</NavLink>
          {data ? <NavLink to={`/contributors/${encodeURIComponent(data.currentUser.id)}`}>{text.profile}</NavLink> : <span aria-disabled="true">{text.profile}</span>}
          <NavLink to="/assurance">{text.assurance_nav}</NavLink>
          <NavLink to="/demo">{text.demo}</NavLink>
        </nav>
        <div className="shell-controls">
          {execution && <span className={`mode-badge ${execution.resolved ? 'resolved' : 'refused'}`}>
            {execution.resolved ? modeLabels[execution.resolved] : text.unavailable}
          </span>}
          <label className="locale-control"><span className="sr-only">{text.language}</span>
            <select aria-label={text.language} value={locale} onChange={event => setLocale(event.target.value === 'zh-TW' ? 'zh-TW' : 'en')}>
              <option value="en">{text.english}</option><option value="zh-TW">{text.traditional_chinese}</option>
            </select>
          </label>
          <span className="wallet" aria-label={text.wallet}>
            {data ? new Intl.NumberFormat(locale).format(data.currentUser.walletBalance) : '—'}
          </span>
          {data && <span className="persona" title={`${text.local_persona}: ${data.currentUser.name}`} aria-label={`${text.local_persona}: ${data.currentUser.name}`}>
            {data.currentUser.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('')}
          </span>}
        </div>
      </div>
    </header>
    {execution?.error && <p className="shell-container execution-refusal" role="alert">{execution.error}</p>}
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

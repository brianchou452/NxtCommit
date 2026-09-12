import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleProvider.js';
import type { AssuranceSnapshot, AssuranceRun } from '../../shared/assurance.js';
import '../styles/assurance.css';

export function AssurancePage() {
  const {text, locale} = useLocale();
  const [data, setData] = useState<AssuranceSnapshot>();
  const [selected, select] = useState<string>();
  const [error, setError] = useState(false);
  useEffect(() => {
    const abort = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    const update = async () => {
      try {
        const response = await fetch('/api/assurance', {signal: abort.signal});
        if (!response.ok) throw Error('unavailable');
        setData(await response.json() as AssuranceSnapshot); setError(false);
      } catch { if (!abort.signal.aborted) setError(true); }
      if (!abort.signal.aborted) timer = setTimeout(() => void update(), 2000);
    };
    void update(); return () => {abort.abort(); clearTimeout(timer);};
  }, []);
  const run = data?.runs.find(row => row.id === selected) ?? data?.runs[0];
  const latest = data?.runs[0];
  const live = !error && latest?.status === 'running';
  const labels = {plan: text.assurance_plan, safety: text.assurance_safety, chaos: text.assurance_chaos, assess: text.assurance_assess, review: text.assurance_review, iterate: text.assurance_iterate};
  const statuses = {pending: text.assurance_pending, running: text.assurance_running, completed: text.assurance_completed, failed: text.assurance_failed, passed: text.assurance_passed, blocked: text.assurance_blocked, interrupted: text.assurance_interrupted};
  const time = (value?: string) => value ? new Date(value).toLocaleString(locale) : '—';
  return <main id="main-content" tabIndex={-1} className="assurance-page">
    <section className="assurance-hero">
      <div className="assurance-eyebrow">{text.assurance_eyebrow}</div>
      <h1>{text.assurance_title}</h1><p>{text.assurance_intro}</p>
      <div className={`assurance-live ${live ? 'is-live' : ''}`}><i aria-hidden="true" />{error ? text.assurance_disconnected : live ? text.assurance_running : text.assurance_idle}</div>
      <p className="assurance-boundary">{text.assurance_boundary}</p>
    </section>
    <section className="assurance-stats" aria-label={text.assurance_evidence}>
      <div><span>{text.assurance_last}</span><strong>{time(latest?.finishedAt ?? latest?.startedAt)}</strong></div>
      <div><span>{text.assurance_cadence}</span><strong>{data?.enabled ? `${data.intervalSeconds / 60} ${text.assurance_minutes}` : '—'}</strong></div>
      <div><span>{text.assurance_measured}</span><strong>{run?.report ? `${run.report.summary.passed} / ${run.report.summary.total}` : '—'}</strong></div>
      <div><span>{text.assurance_calls}</span><strong>{run?.modelCalls ?? '—'}</strong></div>
    </section>
    {error && <p role="alert">{text.assurance_disconnected}</p>}
    <section className="assurance-flow" aria-label={text.assurance_flow}>
      {Object.entries(labels).map(([name, label], index) => {
        const stage = run?.stages.find(s => s.name === name);
        return <article key={name} className={`assurance-stage ${stage?.status ?? 'pending'} ${error ? 'disconnected' : ''}`}>
          <span className="stage-number">0{index + 1}</span><h2>{label}</h2>
          <span className="stage-indicator" aria-hidden="true" /><p>{statuses[stage?.status ?? 'pending']}</p>
          {stage?.startedAt && <small>{time(stage.startedAt)}</small>}
        </article>;
      })}
    </section>
    <div className="assurance-columns">
      <section className="assurance-panel"><h2>{text.assurance_history}</h2>
        {!data?.runs.length && <p>{text.assurance_empty}</p>}
        <div className="assurance-history">{data?.runs.map(row => <button key={row.id} aria-pressed={row.id === run?.id} onClick={() => select(row.id)}>
          <span className={`run-status ${row.status}`}>{statuses[row.status]}</span><span>{time(row.startedAt)}</span><code>{row.id.slice(0, 8)}</code>
        </button>)}</div>
      </section>
      <section className="assurance-panel"><h2>{text.assurance_evidence}</h2>
        {run ? <>
          <dl className="assurance-facts"><dt>{text.assurance_run}</dt><dd><code>{run.id}</code></dd><dt>{text.assurance_commit}</dt><dd><code>{run.commit}</code></dd>
            <dt>{text.assurance_usage}</dt><dd>{run.knownInputTokens.toLocaleString(locale)} / {run.knownOutputTokens.toLocaleString(locale)} {run.unknownUsageCalls > 0 && `· ${text.assurance_unknown}: ${run.unknownUsageCalls}`}</dd>
            <dt>{text.assurance_comparison}</dt><dd>{run.report?.comparison.comparable ? `${text.assurance_baseline}: ${run.report.comparison.baselineId}` : text.assurance_no_baseline}</dd></dl>
          {run.failureCode && <p role="alert">{statuses[run.status]} · {run.failureCode}</p>}
          <Advice run={run} />
        </> : <p>{text.assurance_empty}</p>}
      </section>
    </div>
    {run?.report && <section className="assurance-panel"><h2>{text.assurance_cases}</h2><p>{text.assurance_cases_note}</p>
      <div className="assurance-table-wrap"><table><thead><tr><th>{text.assurance_case}</th><th>{text.assurance_result}</th><th>{text.assurance_duration}</th><th>{text.assurance_checks}</th></tr></thead>
        <tbody>{run.report.measurements.map(row => <tr key={`${row.scenario}-${row.repetition}`}><td>{row.scenario} · {row.repetition + 1}</td><td>{row.passed ? text.assurance_passed : text.assurance_failed}</td><td>{row.durationMs} ms</td><td>{Object.entries(row.checks).map(([name, pass]) => <span className={pass ? 'check-pass' : 'check-fail'} key={name}>{pass ? '✓' : '✕'} {name} </span>)}{row.error}</td></tr>)}</tbody></table></div>
    </section>}
    <section className="assurance-panel assurance-contract"><h2>{text.assurance_contract}</h2><p>{text.assurance_contract_note}</p><Link to="/">{text.discover} →</Link><p>{text.assurance_storage}</p><a href="/api/assurance" target="_blank" rel="noreferrer">{text.assurance_json} ↗</a></section>
  </main>;
}
function Advice({run}: {run: AssuranceRun}) {
  const {text, locale} = useLocale();
  const labels = {plan: text.assurance_plan, safety: text.assurance_safety, review: text.assurance_review, iterate: text.assurance_iterate};
  return <div className="assurance-advice">{(Object.keys(labels) as Array<keyof typeof labels>).map(role => {
    const result = run.advice[role]; if (!result) return null;
    return <details key={role} open={role === 'iterate'}><summary>{labels[role]} · {result.evidence.generator === 'openai' ? text.assurance_model : text.assurance_fallback}</summary>
      <p>{result.summary[locale]}</p><small>{result.evidence.model ?? text.assurance_fallback} · {result.evidence.promptVersion} · {result.evidence.latencyMs ?? '—'} ms</small>
      {result.evidence.responseId && <p><code>{result.evidence.responseId}</code></p>}
    </details>;
  })}</div>;
}

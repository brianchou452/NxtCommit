import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleProvider.js';
import type { AssuranceSnapshot, AssuranceRun } from '../../shared/assurance.js';
import '../styles/assurance.css';

const scenarioGroups = {
  response: ['healthy-model', 'truncated-completion', 'invalid-json', 'blank-advice', 'wrong-schema', 'unsupported-claim'],
  provider: ['timeout', 'rate-limit', 'provider-unavailable', 'oversized-response'],
  privacy: ['secret-output', 'trace-unavailable', 'trace-containment', 'invalid-usage'],
  recovery: ['malformed-request', 'oversized-request', 'reset-revokes-capability', 'worker-recovery', 'database-unavailable'],
};

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
  const notes = {plan:text.lab_plan_note,safety:text.lab_safety_note,chaos:text.lab_chaos_note,assess:text.lab_assess_note,review:text.lab_review_note,iterate:text.lab_iterate_note};
  const statuses = {pending: text.assurance_pending, running: text.assurance_running, completed: text.assurance_completed, failed: text.assurance_failed, passed: text.assurance_passed, blocked: text.assurance_blocked, interrupted: text.assurance_interrupted};
  const time = (value?: string) => value ? new Date(value).toLocaleString(locale) : '—';
  const report = run?.report;
  const active = latest?.stages.find(stage => stage.status === 'running');
  const groups = Object.entries(scenarioGroups).map(([key, ids]) => ({key, rows:report?.measurements.filter(row => ids.includes(row.scenario)) ?? []}));
  const known = Object.values(scenarioGroups).flat();
  const other = report?.measurements.filter(row => !known.includes(row.scenario)) ?? [];
  if (other.length) groups.push({key:'other',rows:other});
  const groupLabels = {response:text.lab_response,provider:text.lab_provider,privacy:text.lab_privacy,recovery:text.lab_recovery,other:text.lab_other};
  const groupNotes = {response:text.lab_response_note,provider:text.lab_provider_note,privacy:text.lab_privacy_note,recovery:text.lab_recovery_note,other:text.lab_other_note};
  const comparison = report?.comparison;
  const attention = run?.status === 'failed' || run?.status === 'blocked' || run?.status === 'interrupted' || (report?.summary.failed ?? 0) > 0 || (comparison?.regressions.length ?? 0) > 0;
  return <main id="main-content" tabIndex={-1} className="assurance-page">
    <section className="assurance-hero">
      <div><div className="assurance-eyebrow">{text.assurance_nav} / {text.lab_kicker}</div>
        <h1>{text.lab_title}</h1><p>{text.lab_intro}</p>
        <a className="assurance-inspect" href="#lab-results">{text.lab_inspect} ↓</a>
      </div>
      <aside className={`assurance-live-card ${live ? 'is-live' : ''}`}>
        <span className="assurance-eyebrow">{text.lab_current}</span>
        <div className={`assurance-live ${live ? 'is-live' : ''}`}><i aria-hidden="true" />{error ? text.assurance_disconnected : !data ? text.lab_loading : live ? text.assurance_running : text.assurance_idle}</div>
        <strong>{live && active ? labels[active.name] : latest ? statuses[latest.status] : '—'}</strong>
        <p>{live ? text.lab_live_note : text.assurance_last}</p><time>{time(latest?.finishedAt ?? latest?.startedAt)}</time>
        <small>{text.assurance_cadence}: {data?.enabled ? `${data.intervalSeconds / 60} ${text.assurance_minutes}` : '—'}</small>
      </aside>
    </section>
    {error && <p role="alert" className="assurance-alert">{text.assurance_disconnected}</p>}
    <div className="assurance-record-heading"><span>{text.lab_selected} · {run ? statuses[run.status] : text.lab_wait} · {time(run?.startedAt)}</span>
      {run && <span>{run.trigger === 'scheduled' ? text.lab_scheduled : text.lab_operator}</span>}
      {run && latest && run.id !== latest.id && <button onClick={() => select(undefined)}>{text.lab_latest}</button>}
    </div>
    <section className="assurance-summary" aria-label={text.assurance_evidence}>
      <article><span className="summary-index">01 / {text.lab_what}</span><h2>{text.lab_what_body}</h2>
        <p>{report ? `${new Set(report.measurements.map(row => row.scenario)).size} ${text.lab_distinct} · ${report.repetitions} ${text.lab_repetitions}` : text.lab_wait}</p>
      </article>
      <article className={`assurance-result ${report?.summary.failed ? 'has-failures' : ''}`}><span className="summary-index">02 / {text.lab_result}</span>
        <div className="assurance-result-number">{report ? <>{report.summary.passed}<span> / {report.summary.total}</span></> : '—'}</div>
        <strong>{report ? text.lab_checks : text.lab_wait}</strong>
        {report && report.summary.failed > 0 && <p className="check-fail">{report.summary.failed} {text.lab_failed_count}</p>}
        <p>{text.lab_no_certificate}</p>
      </article>
      <article><span className="summary-index">03 / {text.lab_next}</span><h2>{!report || run?.status === 'running' ? text.lab_next_wait : attention ? text.lab_next_fix : text.lab_next_clean}</h2>
        <p>{!comparison?.comparable ? text.lab_no_comparison : comparison.regressions.length ? `${comparison.regressions.length} ${text.lab_regressions}` : text.lab_no_regressions}</p>
      </article>
    </section>
    <div className="assurance-section-heading"><h2>{text.lab_how}</h2><p>{text.lab_how_note}</p></div>
    <section className="assurance-flow" aria-label={text.assurance_flow}>
      {Object.entries(labels).map(([name, label], index) => {
        const key = name as keyof typeof labels;
        const stage = run?.stages.find(s => s.name === key);
        return <article key={name} className={`assurance-stage ${stage?.status ?? 'pending'} ${error ? 'disconnected' : ''}`}>
          <span className="stage-number">0{index + 1}</span><span className="stage-indicator" aria-hidden="true" />
          <h3>{label}</h3><p className="stage-description">{notes[key]}</p>
          <span className="assurance-role">{key === 'chaos' || key === 'assess' ? text.lab_engine_role : run?.advice[key]?.evidence.generator === 'openai' ? text.lab_model_role : run?.advice[key] ? text.assurance_fallback : text.lab_model_role}</span>
          <p className="stage-state">{statuses[stage?.status ?? 'pending']}</p>
        </article>;
      })}
    </section>
    <section id="lab-results" className="assurance-results">
      <div className="assurance-section-heading"><h2>{text.lab_categories}</h2><p>{text.assurance_cases_note}</p></div>
      <div className="assurance-category-grid">{groups.map(({key,rows}) => <article key={key}>
        <div className="assurance-category-top"><span aria-hidden="true">{rows.length ? rows.every(row => row.passed) ? '✓' : '!' : '—'}</span><strong>{rows.length ? `${rows.filter(row => row.passed).length} / ${rows.length}` : '—'}</strong></div>
        <h3>{groupLabels[key as keyof typeof groupLabels]}</h3><p>{groupNotes[key as keyof typeof groupNotes]}</p>
        <small className={rows.some(row => !row.passed) ? 'check-fail' : ''}>{rows.length ? rows.every(row => row.passed) ? text.assurance_passed : text.assurance_blocked : text.lab_wait}</small>
      </article>)}</div>
    </section>
    <div className="assurance-columns">
      <section className="assurance-panel"><h2>{text.assurance_history}</h2>
        {!data?.runs.length && <p>{text.assurance_empty}</p>}
        <div className="assurance-history">{data?.runs.map(row => <button key={row.id} aria-pressed={row.id === run?.id} onClick={() => select(row.id)}>
          <span className={`run-status ${row.status}`}>{statuses[row.status]}</span><span>{time(row.startedAt)}</span><small>{row.trigger === 'scheduled' ? text.lab_scheduled : text.lab_operator}</small>
        </button>)}</div>
      </section>
      <section className="assurance-panel"><h2>{text.lab_advice}</h2>
        {run ? <><p>{run.modelCalls} {text.assurance_calls} · {text.lab_usage_note}</p><Advice run={run} />
          <details className="assurance-technical"><summary>{text.lab_trace}</summary>
            <dl className="assurance-facts"><dt>{text.assurance_run}</dt><dd><code>{run.id}</code></dd><dt>{text.assurance_commit}</dt><dd><code>{run.commit}</code></dd>
              <dt>{text.assurance_usage}</dt><dd>{run.knownInputTokens.toLocaleString(locale)} / {run.knownOutputTokens.toLocaleString(locale)} {run.unknownUsageCalls > 0 && `· ${text.assurance_unknown}: ${run.unknownUsageCalls}`}</dd>
              <dt>{text.assurance_comparison}</dt><dd>{comparison?.comparable ? `${text.assurance_baseline}: ${comparison.baselineId}` : text.assurance_no_baseline}</dd></dl>
            {run.failureCode && <p role="alert">{statuses[run.status]} · {run.failureCode}</p>}
          </details>
        </> : <p>{text.assurance_empty}</p>}
      </section>
    </div>
    {report && <details className="assurance-panel assurance-technical"><summary>{text.lab_details}</summary>
      <div className="assurance-table-wrap"><table><thead><tr><th>{text.assurance_case}</th><th>{text.assurance_result}</th><th>{text.assurance_duration}</th><th>{text.assurance_checks}</th></tr></thead>
        <tbody>{report.measurements.map(row => <tr key={`${row.scenario}-${row.repetition}`}><td>{row.scenario} · {row.repetition + 1}</td><td>{row.passed ? text.assurance_passed : text.assurance_failed}</td><td>{row.durationMs} ms</td><td>{Object.entries(row.checks).map(([name, pass]) => <span className={pass ? 'check-pass' : 'check-fail'} key={name}>{pass ? '✓' : '✕'} {name} </span>)}{row.error}</td></tr>)}</tbody></table></div>
    </details>}
    <section className="assurance-panel assurance-contract"><h2>{text.lab_boundary_title}</h2><p>{text.lab_boundary_body}</p><Link to="/">{text.discover} →</Link><p>{text.assurance_storage}</p><a href="/api/assurance" target="_blank" rel="noreferrer">{text.assurance_json} ↗</a></section>
  </main>;
}
function Advice({run}: {run: AssuranceRun}) {
  const {text, locale} = useLocale();
  const labels = {plan: text.assurance_plan, safety: text.assurance_safety, review: text.assurance_review, iterate: text.assurance_iterate};
  return <div className="assurance-advice">{(Object.keys(labels) as Array<keyof typeof labels>).map(role => {
    const result = run.advice[role]; if (!result) return null;
    return <details key={role}><summary>{labels[role]} · {result.evidence.generator === 'openai' ? text.assurance_model : text.assurance_fallback}</summary>
      <p>{result.summary[locale]}</p><small>{result.evidence.model ?? text.assurance_fallback} · {result.evidence.promptVersion} · {result.evidence.latencyMs ?? '—'} ms</small>
      {result.evidence.responseId && <p><code>{result.evidence.responseId}</code></p>}
    </details>;
  })}</div>;
}

import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { RepoAnalysis, CampaignDraft, AuthoredMission, AssistantResult } from '../../shared/authoring.js';
import { localize } from '../../shared/primitives.js';
import { useLocale } from '../i18n/LocaleProvider.js';
import { productRequest, ProductError } from '../services/authoring.js';
import { Advisory } from '../components/AuthoringEvidence.js';
import { CampaignAuthoring } from '../components/CampaignAuthoring.js';
import '../styles/authoring.css';

export function NewMission() {
  const { text, locale } = useLocale();
  const [search] = useSearchParams(); const guide = search.get('demo') === 'maintainer' ? '?demo=maintainer' : '';
  const [source, setSource] = useState<'fixture' | 'github'>('fixture');
  const [url, setUrl] = useState('https://github.com/PrimeIntellect-ai/prime-agent');
  const [analysis, setAnalysis] = useState<RepoAnalysis>(); const [issueId, setIssueId] = useState('');
  const [draft, setDraft] = useState<CampaignDraft>(); const [mission, setMission] = useState<AuthoredMission>();
  const [advice, setAdvice] = useState<AssistantResult>(); const [critic, setCritic] = useState<AssistantResult>();
  const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [expired, setExpired] = useState(false);
  const busy = useRef(false);
  async function action(work: () => Promise<void>) {
    if (busy.current) return; busy.current = true; setPending(true); setError('');
    try { await work(); } catch (failure) { const stale = failure instanceof ProductError && failure.code === 'capability_expired'; setExpired(stale); setError(stale ? text.c_expired : text.c_error); }
    finally { busy.current = false; setPending(false); }
  }
  function fresh() { setAnalysis(undefined); setDraft(undefined); setMission(undefined); setAdvice(undefined); setCritic(undefined); setIssueId(''); setExpired(false); setError(''); }
  const issue = analysis?.issues.find(issue => issue.id === issueId);
  const step = mission ? 3 : draft ? 2 : analysis ? 1 : 0;
  return <main id="main-content" tabIndex={-1} className="c-wizard">
    <ol className="c-stepper">{[text.c_repository, text.c_analysis, text.c_campaign, text.c_publish].map((label, index) => <li key={index} aria-current={step === index ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
    <h1>{mission ? text.c_published : text.c_create}</h1><p>{text.c_intro}</p>
    {!analysis && <form onSubmit={event => { event.preventDefault(); void action(async () => { const result = await productRequest<{ analysis: RepoAnalysis }>('/api/analyze', { source, ...(source === 'github' ? { url } : {}) }); setAnalysis(result.analysis); setIssueId(result.analysis.issues[0]?.id ?? ''); }); }}>
      <div className="c-source-grid">{(['fixture', 'github'] as const).map(value => <label key={value} className={`c-card c-source ${source === value ? 'selected' : ''}`}>
        <input type="radio" name="source" value={value} checked={source === value} onChange={() => setSource(value)} disabled={pending} />
        <strong>{value === 'fixture' ? text.c_fixture : text.c_github}</strong><p>{value === 'fixture' ? text.c_fixture_note : text.c_github_boundary}</p>
      </label>)}</div>
      {source === 'github' && <label className="c-field">{text.c_url}<input type="url" required value={url} onChange={event => setUrl(event.target.value)} disabled={pending} /></label>}
      <div className="c-actions"><button data-guide-target="analyze" data-guide-step="1" data-guide-title="guide_analyze" className="c-primary" disabled={pending}>{pending ? text.c_analyzing : text.c_analyze}</button></div>
    </form>}
    {analysis && !mission && <section className="c-card" aria-label={text.c_coverage}>
      <h2>{analysis.name}</h2><p>{analysis.description}</p><p className="c-boundary">{analysis.source === 'github' ? text.c_github_boundary : text.c_fixture_note}</p>
      <h3>{text.c_coverage}</h3><dl className="c-measurements"><div><dt>{text.c_metadata}</dt><dd>{analysis.measured.metadata ? text.c_yes : text.c_no}</dd></div><div><dt>{text.c_filesystem}</dt><dd>{analysis.measured.filesystem ? text.c_yes : text.c_no}</dd></div><div><dt>{text.c_fulltree}</dt><dd>{analysis.measured.fullTree ? text.c_yes : text.c_no}</dd></div><div><dt>{text.c_files}</dt><dd>{analysis.files ?? text.c_unknown}</dd></div><div><dt>{text.c_tests}</dt><dd>{text.c_no}</dd></div></dl>
      {analysis.commitSha && <code>{analysis.commitSha}</code>}
      {!draft && <><h3>{text.c_issues}</h3>{analysis.issues.length === 0 ? <p>{text.c_empty_issues}</p> : analysis.issues.map(item => <label className="c-issue" key={item.id}><input type="radio" name="issue" checked={issueId === item.id} disabled={pending} onChange={() => { setIssueId(item.id); setAdvice(undefined); }} />{item.title}</label>)}
      {issue && <><p>{issue.body}</p><p>{issue.feasibility.basis}</p><div className="c-actions">
        <button disabled={pending || expired} onClick={() => void action(async () => setAdvice((await productRequest<{ assistant: AssistantResult }>('/api/analysis/assist', { analysis, issueId })).assistant))}>{text.c_assist}</button>
        <button data-guide-target="next" data-guide-step="2" data-guide-title="c_generate" className="c-primary" disabled={pending || expired} onClick={() => void action(async () => setDraft((await productRequest<{ draft: CampaignDraft }>('/api/campaigns/generate', { analysis, issueId })).draft))}>{text.c_generate}</button>
        <button disabled={pending || expired} onClick={() => void action(async () => setDraft((await productRequest<{ draft: CampaignDraft }>('/api/campaigns/generate', { analysis, issueId, mode: 'demo' })).draft))}>{text.c_generate_demo}</button>
      </div></>}{advice && <Advisory result={advice} feature="issue-triage" />}</>}
    </section>}
    {analysis && draft && !mission && <CampaignAuthoring analysis={analysis} issueId={issueId} draft={draft} pending={pending} expired={expired} critic={critic}
      onCritique={() => void action(async () => setCritic((await productRequest<{ critique: AssistantResult }>('/api/campaigns/critique', { analysis, draft })).critique))}
      onPublish={() => void action(async () => setMission((await productRequest<{ mission: AuthoredMission }>('/api/missions', { analysis, draft })).mission))} />}

    {mission && <section className="c-card"><h2>{localize(mission.title, locale)}</h2><p>{text.c_publish_boundary}</p><p>{mission.project.executable ? text.mission_units : text.c_nonexecutable}</p><Link data-guide-target="next" data-guide-step="4" data-guide-title="c_open_mission" to={`/missions/${mission.id}${guide}`}>{text.c_open_mission}</Link></section>}
    {pending && <p role="status">{text.c_pending}</p>}{error && <p role="alert">{error}</p>}
    {analysis && <button disabled={pending} onClick={fresh}>{text.c_fresh}</button>}
  </main>;
}

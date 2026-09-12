import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { MissionDetail } from '../../shared/mission.js';
import type { LocalizedText } from '../../shared/types.js';
import { useLocale } from '../i18n/LocaleProvider.js';
import { useMissionSnapshot } from '../components/useMissionSnapshot.js';
import { MissionOverview } from '../components/MissionOverview.js';
import { PledgeDialog } from '../components/PledgeDialog.js';
import { fetchBootstrap } from '../services/api.js';
import { executeMission, MissionApiError, missionJson, missionPath } from '../services/mission.js';
import { CommentWall, CommunityVotes } from '../components/Community.js';
import '../styles/mission.css';

export function MissionDetailPage() { const { id = '' } = useParams(); return <main id="main-content" tabIndex={-1}><MissionDetailContent key={id} id={id} /></main>; }
export function MissionLoadState({ error, reload }: { error?: unknown; reload(): void }) {
  const { text } = useLocale();
  return <section className="mission-empty" role={error ? 'alert' : 'status'}><h1>{error ? error instanceof MissionApiError && error.status === 404 ? text.mission_missing : text.mission_load_error : text.loading}</h1>{Boolean(error) && <><button onClick={reload}>{text.retry}</button><Link to="/">{text.back_home}</Link></>}</section>;
}
export function MissionStateLabel({ mission }: { mission: MissionDetail }) {
  const { text } = useLocale();
  return <span className={`mission-status status-${mission.status}`} data-testid="mission-status">{text[`mission_${mission.status}_state`]}</span>;
}
type ProjectExplanation = {
  plain: { generator: 'openai' | 'demo' | 'static'; oneLiner: LocalizedText; technicalSummary: LocalizedText; useCases: LocalizedText[] };
  impact: { headline: LocalizedText; dataMode: string; basis: 'editorial' | 'measured' };
  timeline: { kind: 'past' | 'present' | 'future' }[];
};
function ProjectExplanationRegion({ path }: { path: string }) {
  const { text, locale } = useLocale();
  const [result, setResult] = useState<ProjectExplanation>();
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false); setResult(undefined);
    void missionJson<ProjectExplanation>(path, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setResult(value); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [path, revision]);
  return <section className="mission-story-section" data-testid="mission-explanation"><h2>{text.mission_explanation}</h2>
    {error ? <><p>{text.mission_explanation_unavailable}</p><button onClick={() => setRevision(value => value + 1)}>{text.retry}</button></> : result === undefined ? <p role="status">{text.loading}</p> : <div data-testid="project-explanation-content">
      <p className="mission-provenance">{text.c_generator}: {text[`c_${result.plain.generator}`]}</p>
      <p className="mission-story-copy">{result.plain.oneLiner[locale]}</p>
      {result.plain.useCases.length > 0 && <ul>{result.plain.useCases.map((item, index) => <li key={index}>{item[locale]}</li>)}</ul>}
      <details><summary>{text.project_technical}</summary><p>{result.plain.technicalSummary[locale]}</p></details>
      <h3>{text.project_impact}</h3><p>{result.impact.headline[locale]}</p>
      <p className="mission-provenance">{text.mission_data}: {result.impact.dataMode} · {result.impact.basis === 'measured' ? text.project_measured : text.project_editorial}</p>
      <h3>{text.project_timeline}</h3><ol>{result.timeline.map(frame => <li key={frame.kind}><strong>{text[`project_${frame.kind}`]}</strong><p>{text[`project_${frame.kind}_note`]}</p></li>)}</ol>
    </div>}
  </section>;
}
function MissionDetailContent({ id }: { id: string }) {
  const { locale, text } = useLocale();
  const [search] = useSearchParams(); const guide = ['provider', 'maintainer'].includes(search.get('demo') ?? '') ? `?demo=${search.get('demo')}` : '';
  const { data, error, disconnected, reload } = useMissionSnapshot(id);
  const [pledgeOpen, setPledgeOpen] = useState(false);
  const [wallet, setWallet] = useState<number>();
  const [pending, setPending] = useState(false);
  const [mutationError, setMutationError] = useState('');
  const alive = useRef(true);
  const visit = useRef<AbortController | undefined>(undefined);
  const pendingIntent = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    visit.current = controller;
    // Browser history can reactivate a previous route before passive cleanup runs.
    // A dispatch response belongs to its original visit even when the URL returns.
    const leaveVisit = () => controller.abort();
    window.addEventListener('popstate', leaveVisit);
    window.addEventListener('pagehide', leaveVisit);
    void fetchBootstrap(controller.signal).then(value => { if (alive.current) setWallet(value.currentUser.walletBalance); }).catch(() => {});
    return () => { alive.current = false; controller.abort(); window.removeEventListener('popstate', leaveVisit); window.removeEventListener('pagehide', leaveVisit); };
  }, []);
  const mission = data?.mission;
  if (!mission) return <MissionLoadState error={error} reload={() => void reload()} />;
  async function execute() {
    if (pendingIntent.current) return;
    pendingIntent.current = true; setPending(true); setMutationError('');
    const signal = visit.current?.signal;
    try { await executeMission(id, signal); if (alive.current && !signal?.aborted) navigate(`/missions/${encodeURIComponent(id)}/run${guide}`); }
    catch (failure) { if (alive.current) setMutationError(failure instanceof Error ? failure.message : text.mission_dispatch_error); }
    finally { pendingIntent.current = false; if (alive.current) setPending(false); }
  }
  const githubWorkspaceId = mission.project.workspace.kind === 'github' && /^[a-f0-9]{32}$/.test(mission.project.workspace.path ?? '') ? mission.project.workspace.path : undefined;
  const fixture = mission.project.workspace.kind === 'fixture';
  const canPledge = mission.status === 'funding' && mission.project.workspace.kind !== 'none';
  const canExecute = fixture && ['funded', 'failed', 'changes_requested'].includes(mission.status);
  const runLink = `/missions/${encodeURIComponent(id)}/run${guide}`;
  const storyKeys = ['what', 'why', 'whoBenefits', 'approach'] as const;
  const storyTitles = [text.mission_what, text.mission_why, text.mission_benefits, text.mission_approach];
  return <div className="mission-page">
    <nav className="mission-breadcrumb"><Link to="/">{text.discover}</Link> / {mission.project.name}</nav>
    {disconnected && <p role="status">{text.mission_reconnecting}</p>}{Boolean(error) && <p role="alert">{text.mission_partial_error} <button onClick={() => void reload()}>{text.retry}</button></p>}
    {githubWorkspaceId && <p><Link to={`/github?workspace=${githubWorkspaceId}`}>{text.gh_title}</Link></p>}
    <MissionOverview mission={mission} />
    <nav className="mission-section-nav" aria-label={text.mission_campaign}><a href="#mission-story">{text.mission_what}</a><a href="#mission-plan">{text.mission_approach}</a><a href="#mission-delivery">{text.mission_evidence}</a><a href="#mission-community">{text.mission_wall}</a></nav>
    <div className="mission-columns"><article className="mission-narrative">
      {storyKeys.map((key, index) => <section className={`mission-story-section mission-story-${key}`} id={index === 0 ? 'mission-story' : undefined} key={key}><p className="mission-kicker"><span>0{index + 1}</span> {storyTitles[index]}</p><h2>{mission.story[key][locale]}</h2>{index === 0 && <p className="mission-story-copy">{mission.project.description[locale]}</p>}{index === 1 && <div className="mission-impact-note"><span className="mission-kicker">{text.mission_project}</span><p>{mission.tagline[locale]}</p></div>}{index === 2 && <div className="mission-benefit-pair"><div className="mission-impact-note"><span className="mission-kicker">{text.mission_project}</span><h3>{mission.project.name}</h3></div><p>{mission.tagline[locale]}</p></div>}<p className="mission-provenance">{text.mission_generator}: {mission.generator}</p></section>)}
      <section className="mission-story-section" id="mission-plan"><h2>{text.mission_criteria}</h2><div className="mission-card">{mission.acceptanceCriteria.map(criterion => <p key={criterion.id}>✓ {criterion.text[locale]} <span className="mission-status">{text[`mission_${criterion.status}`]}</span></p>)}</div><h2>{text.mission_milestones}</h2><div className="mission-milestones">{mission.milestones.map(milestone => <div className="mission-card" key={milestone.id}><h3>{milestone.title[locale]}</h3><p>{(milestone.share * 100).toFixed(0)}%</p><span>{milestone.status}</span></div>)}</div><h3>{text.mission_risk}</h3><p>{text.mission_boundary}</p></section>
      <ProjectExplanationRegion key={mission.project.id} path={`/api/projects/${encodeURIComponent(mission.project.id)}/explain`} />
      <section className="mission-story-section" id="mission-delivery"><p className="mission-kicker">{text.mission_evidence}</p><h2>{text.mission_delivery}</h2><div className="mission-delivery-metrics"><div><span>{text.mission_pledged}</span><strong>{mission.computePledged.toLocaleString()}</strong></div><div><span>{text.mission_used}</span><strong>{mission.computeConsumed.toLocaleString()}</strong></div><div><span>{text.mission_backers}</span><strong>{new Set(mission.pledges.map(pledge => pledge.contributorId)).size}</strong></div></div><div className="mission-delivery-track">{(['funding', 'development', 'verification', 'adoption'] as const).map(dimension => <div className={`mission-track-${dimension}`} key={dimension}><span>{text[`mission_${dimension}`]}</span><strong>{(mission.progress[dimension] * 100).toFixed(0)}%</strong><progress aria-label={text[`mission_${dimension}`]} max={1} value={mission.progress[dimension]} /></div>)}</div><p className="mission-provenance">{text.mission_units} · {text.mission_data}: {mission.dataMode}</p>{mission.latestRun ? <Link className="mission-evidence-link" to={runLink}>{text.mission_history} →</Link> : <p>{text.mission_idle_note}</p>}{mission.artifact?.testEvidenceSource === 'demo' && <p className="mission-provenance">{text.mission_seed}</p>}</section>
      <section className="mission-story-section" id="mission-community"><p className="mission-kicker">{text.mission_backers}</p><h2>{text.mission_community}</h2><div data-testid="mission-wall"><CommentWall key={id} missionId={id} /></div><CommunityVotes /></section>
    </article><aside className="mission-action-card" data-testid="mission-actions"><p className="mission-kicker">{mission.title[locale]}</p><MissionStateLabel mission={mission} /><h2>{text.mission_funding}</h2><p><strong>{mission.computePledged}</strong> / {mission.computeGoal} {text.mission_credits}</p><progress max={mission.computeGoal} value={mission.computePledged} /><p>{text.mission_units}</p>
      {canPledge && <button data-guide-target={pledgeOpen ? undefined : "next"} data-guide-step="2" data-guide-title="mission_pledge" className="mission-primary" disabled={wallet === undefined} onClick={() => setPledgeOpen(true)}>{text.mission_pledge}</button>}
      {canExecute && <button data-guide-target="next" data-guide-step="3" data-guide-title="mission_execute" className="mission-primary" disabled={pending} onClick={() => void execute()}>{pending ? text.mission_dispatching : mission.status === 'failed' ? text.mission_restart : text.mission_execute}</button>}
      {mission.status === 'executing' && <Link className="mission-button" to={runLink}>{text.mission_watch}</Link>}
      {mission.status === 'needs_review' && <Link className="mission-button" data-guide-target="next" data-guide-step="4" data-guide-title="mission_review" to={`/missions/${encodeURIComponent(id)}/review${guide}`}>{text.mission_review}</Link>}
      {['approved', 'changes_requested', 'failed', 'stalled'].includes(mission.status) && <Link to={runLink}>{text.mission_history}</Link>}
      {mission.status === 'released' && <Link to={runLink}>{text.mission_release}</Link>}
      {!fixture && <p data-testid="execution-refusal">{text.mission_boundary}</p>}
      {mission.artifact?.testEvidenceSource === 'demo' && <p>{text.mission_seed}</p>}
      {mutationError && <p role="alert">{mutationError}</p>}
    </aside></div>
    {pledgeOpen && wallet !== undefined && <PledgeDialog mission={mission} wallet={wallet} onClose={() => setPledgeOpen(false)} onSuccess={result => { setWallet(result.wallet); setPledgeOpen(false); void reload(); if (result.executionStarting) navigate(runLink); }} />}
  </div>;
}

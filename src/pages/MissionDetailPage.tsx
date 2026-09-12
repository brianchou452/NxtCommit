import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { MissionDetail } from '../../shared/mission.js';
import { useLocale } from '../i18n/LocaleProvider.js';
import { useMissionSnapshot } from '../components/useMissionSnapshot.js';
import { MissionOverview } from '../components/MissionOverview.js';
import { PledgeDialog } from '../components/PledgeDialog.js';
import { fetchBootstrap } from '../services/api.js';
import { executeMission, MissionApiError, missionJson, missionPath } from '../services/mission.js';
import '../styles/mission.css';

export function MissionDetailPage() { const { id = '' } = useParams(); return <MissionDetailContent key={id} id={id} />; }
export function MissionLoadState({ error, reload }: { error?: unknown; reload(): void }) {
  const { text } = useLocale();
  return <section className="mission-empty" role={error ? 'alert' : 'status'}><h1>{error ? error instanceof MissionApiError && error.status === 404 ? text.mission_missing : text.mission_load_error : text.loading}</h1>{Boolean(error) && <><button onClick={reload}>{text.retry}</button><Link to="/">{text.back_home}</Link></>}</section>;
}
export function MissionStateLabel({ mission }: { mission: MissionDetail }) {
  const { text } = useLocale();
  return <span className={`mission-status status-${mission.status}`} data-testid="mission-status">{text[`mission_${mission.status}_state`]}</span>;
}
function OptionalRegion({ path, title, unavailable, wall = false }: { path: string; title: string; unavailable: string; wall?: boolean }) {
  const { text } = useLocale();
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    void missionJson<unknown>(path, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setResult(value); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [path, revision]);
  return <section className="mission-story-section" data-testid={wall ? 'mission-wall' : 'mission-explanation'}><h2>{title}</h2>
    {error ? <><p>{unavailable}</p><button onClick={() => setRevision(value => value + 1)}>{text.retry}</button></> : result === undefined ? <p role="status">{text.loading}</p> : <pre>{JSON.stringify(result, null, 2)}</pre>}
    {wall && <p className="mission-provenance">{text.mission_wall_note}</p>}
  </section>;
}
function MissionDetailContent({ id }: { id: string }) {
  const { locale, text } = useLocale();
  const { data, error, disconnected, reload } = useMissionSnapshot(id);
  const [pledgeOpen, setPledgeOpen] = useState(false);
  const [wallet, setWallet] = useState<number>();
  const [pending, setPending] = useState(false);
  const [mutationError, setMutationError] = useState('');
  const alive = useRef(true);
  const pendingIntent = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void fetchBootstrap(controller.signal).then(value => { if (alive.current) setWallet(value.currentUser.walletBalance); }).catch(() => {});
    return () => { alive.current = false; controller.abort(); };
  }, []);
  const mission = data?.mission;
  if (!mission) return <MissionLoadState error={error} reload={() => void reload()} />;
  async function execute() {
    if (pendingIntent.current) return;
    pendingIntent.current = true; setPending(true); setMutationError('');
    try { await executeMission(id); if (alive.current) navigate(`/missions/${encodeURIComponent(id)}/run`); }
    catch (failure) { if (alive.current) setMutationError(failure instanceof Error ? failure.message : text.mission_dispatch_error); }
    finally { pendingIntent.current = false; if (alive.current) setPending(false); }
  }
  const fixture = mission.project.workspace.kind === 'fixture';
  const canPledge = ['funding', 'stalled'].includes(mission.status);
  const canExecute = fixture && ['funded', 'failed'].includes(mission.status);
  const runLink = `/missions/${encodeURIComponent(id)}/run`;
  const storyKeys = ['what', 'why', 'whoBenefits', 'approach'] as const;
  const storyTitles = [text.mission_what, text.mission_why, text.mission_benefits, text.mission_approach];
  return <div className="mission-page">
    <nav className="mission-breadcrumb"><Link to="/">{text.discover}</Link> / {mission.project.name}</nav>
    {disconnected && <p role="status">{text.mission_reconnecting}</p>}{Boolean(error) && <p role="alert">{text.mission_partial_error} <button onClick={() => void reload()}>{text.retry}</button></p>}
    <MissionOverview mission={mission} />
    <div className="mission-columns"><article className="mission-narrative">
      {storyKeys.map((key, index) => <section className="mission-story-section" key={key}><p className="mission-kicker">0{index + 1} · {storyTitles[index]}</p><h2>{storyTitles[index]}</h2><p className="mission-story-copy">{mission.story[key][locale]}</p><p className="mission-provenance">{text.mission_generator}: {mission.generator}</p></section>)}
      <section className="mission-story-section" id="mission-plan"><h2>{text.mission_criteria}</h2><div className="mission-card">{mission.acceptanceCriteria.map(criterion => <p key={criterion.id}>✓ {criterion.text[locale]} <span className="mission-status">{text[`mission_${criterion.status}`]}</span></p>)}</div><h2>{text.mission_milestones}</h2><div className="mission-milestones">{mission.milestones.map(milestone => <div className="mission-card" key={milestone.id}><h3>{milestone.title[locale]}</h3><p>{(milestone.share * 100).toFixed(0)}%</p><span>{milestone.status}</span></div>)}</div><h3>{text.mission_risk}</h3><p>{text.mission_boundary}</p></section>
      <OptionalRegion key={mission.project.id} path={`/api/projects/${encodeURIComponent(mission.project.id)}/explain`} title={text.mission_explanation} unavailable={text.mission_explanation_unavailable} />
      <OptionalRegion path={`${missionPath(id)}/wall`} title={text.mission_wall} unavailable={text.mission_wall_unavailable} wall />
    </article><aside className="mission-action-card" data-testid="mission-actions"><p className="mission-kicker">{mission.title[locale]}</p><MissionStateLabel mission={mission} /><h2>{text.mission_funding}</h2><p><strong>{mission.computePledged}</strong> / {mission.computeGoal} {text.mission_credits}</p><progress max={mission.computeGoal} value={mission.computePledged} /><p>{text.mission_units}</p>
      {canPledge && <button className="mission-primary" disabled={wallet === undefined} onClick={() => setPledgeOpen(true)}>{text.mission_pledge}</button>}
      {canExecute && <button className="mission-primary" disabled={pending} onClick={() => void execute()}>{pending ? text.mission_dispatching : mission.status === 'failed' ? text.mission_restart : text.mission_execute}</button>}
      {mission.status === 'executing' && <Link className="mission-button" to={runLink}>{text.mission_watch}</Link>}
      {mission.status === 'needs_review' && <Link className="mission-button" to={`/missions/${encodeURIComponent(id)}/review`}>{text.mission_review}</Link>}
      {['approved', 'changes_requested', 'failed', 'stalled'].includes(mission.status) && <Link to={runLink}>{text.mission_history}</Link>}
      {mission.status === 'released' && <Link to={runLink}>{text.mission_release}</Link>}
      {!fixture && <p data-testid="execution-refusal">{text.mission_boundary}</p>}
      {mission.artifact?.testEvidenceSource === 'demo' && <p>{text.mission_seed}</p>}
      {mutationError && <p role="alert">{mutationError}</p>}
    </aside></div>
    {pledgeOpen && wallet !== undefined && <PledgeDialog mission={mission} wallet={wallet} onClose={() => setPledgeOpen(false)} onSuccess={result => { setWallet(result.wallet); setPledgeOpen(false); void reload(); if (result.executionStarting) navigate(runLink); }} />}
  </div>;
}

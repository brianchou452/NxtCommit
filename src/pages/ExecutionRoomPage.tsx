import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleProvider.js';
import { useMissionSnapshot } from '../components/useMissionSnapshot.js';
import { ExecutionActivity } from '../components/ExecutionActivity.js';
import { MissionLoadState, MissionStateLabel } from './MissionDetailPage.js';
import { executeMission } from '../services/mission.js';
import { fetchBootstrap } from '../services/api.js';
import type { ExecutionCapability } from '../../shared/bootstrap.js';
import '../styles/mission.css';

export function ExecutionRoomPage() { const { id = '' } = useParams(); return <main id="main-content" tabIndex={-1}><ExecutionRoomContent key={id} id={id} /></main>; }
function ExecutionRoomContent({ id }: { id: string }) {
  const { locale, text } = useLocale();
  const [search] = useSearchParams(); const guide = ['provider', 'maintainer'].includes(search.get('demo') ?? '') ? `?demo=${search.get('demo')}` : '';
  const { data, error, evidenceError, disconnected, reload } = useMissionSnapshot(id, true);
  const [pending, setPending] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const [capability, setCapability] = useState<ExecutionCapability>();
  const live = useRef(true);
  const submitting = useRef(false);
  useEffect(() => {
    live.current = true;
    const controller = new AbortController();
    void fetchBootstrap(controller.signal).then(value => { if (live.current) setCapability(value.execution); }).catch(() => {});
    return () => { live.current = false; controller.abort(); };
  }, []);
  if (!data) return <MissionLoadState error={error} reload={() => void reload()} />;
  const { mission, events, request } = data;
  const run = mission.latestRun;
  const activeQueue = request && ['queued', 'leased'].includes(request.status);
  const canExecute = mission.project.workspace.kind === 'fixture' && ['funded', 'failed', 'changes_requested'].includes(mission.status) && !activeQueue;
  const artifact = mission.artifact?.runId === run?.id ? mission.artifact : undefined;
  const reviewable = mission.status === 'needs_review' && run?.status === 'succeeded' && artifact;
  const payloadFacts = (types: string[]) => events.filter(event => types.includes(event.type) && event.runId === run?.id && event.missionId === id);
  const factEvidence = (types: string[]) => payloadFacts(types).map(event => <div key={event.id}><p>{text.mission_source}: {event.source} · {event.verified ? text.mission_verified : text.mission_unverified}</p><pre>{JSON.stringify(event.payload, null, 2)}</pre></div>);
  async function start() {
    if (submitting.current) return;
    const runId = run?.id;
    submitting.current = true; setPending(true); setDispatchError('');
    try { await executeMission(id); if (live.current) await reload(); }
    catch (failure) { if (live.current && runId === run?.id) setDispatchError(failure instanceof Error ? failure.message : text.mission_dispatch_error); }
    finally { submitting.current = false; if (live.current) setPending(false); }
  }
  return <div className="execution-page">
    <Link to={`/missions/${encodeURIComponent(id)}`}>← {mission.title[locale]}</Link>
    <header className="execution-heading"><h1>{text.mission_execution}</h1><MissionStateLabel mission={mission} />{run && <><span className="mission-status">{run.mode}</span><span className="mission-status" data-testid="run-status">{run.status}</span></>}</header>
    {disconnected && <p role="status">{text.mission_reconnecting}</p>}
    {Boolean(error || evidenceError) && <p role="alert">{text.mission_partial_error}</p>}
    <div className="execution-actions"><button onClick={() => void reload()}>{text.mission_reload}</button>{canExecute && <button className="mission-primary" disabled={pending} onClick={() => void start()}>{pending ? text.mission_dispatching : text.mission_execute}</button>}{reviewable && <Link className="mission-button" data-guide-target="next" data-guide-step="4" data-guide-title="mission_review" to={`/missions/${encodeURIComponent(id)}/review${guide}`}>{text.mission_review}</Link>}</div>
    {dispatchError && <p role="alert">{dispatchError}</p>}
    {mission.project.workspace.kind !== 'fixture' && <p data-testid="execution-refusal">{text.mission_boundary}</p>}
    {artifact?.testEvidenceSource === 'demo' && <p className="mission-provenance">{text.mission_seed}</p>}
    <div className={run ? 'execution-columns' : ''}><ExecutionActivity {...(run ? { run } : {})} events={events} {...(request !== undefined ? { request } : {})} />
    {run && <aside className="execution-facts" data-testid="execution-facts" data-run-id={run.id}>
      <section className="mission-card"><h2>{text.mission_state}</h2><MissionStateLabel mission={mission} /><p>{text.mission_outcome}: {run.status}</p><code>{run.id}</code>{run.endedAt && <p><time>{run.endedAt}</time></p>}{run.status !== 'running' && run.status !== 'succeeded' && <p>{text.mission_recovery}</p>}</section>
      <section className="mission-card"><h2>{text.mission_budget}</h2><p><strong>{run.computeUsed}</strong> / {run.computeBudget} {text.mission_used}</p><progress value={run.computeUsed} max={run.computeBudget} /><p>{run.computeBudget - run.computeUsed} {text.mission_left}</p><p>{text.mission_units}</p></section>
      <section className="mission-card"><h2>{text.mission_tests}</h2>{payloadFacts(['test-result']).length ? factEvidence(['test-result']) : artifact ? <pre>{JSON.stringify(artifact.dossier.experiments, null, 2)}</pre> : <p>{text.mission_unknown}</p>}</section>
      <section className="mission-card"><h2>{text.mission_files}</h2>{artifact ? artifact.files.map(file => <details key={file.path}><summary>{file.path}</summary><pre>{file.diff}</pre></details>) : payloadFacts(['file-change', 'diff']).length ? factEvidence(['file-change', 'diff']) : <p>{text.mission_unknown}</p>}</section>
      <section className="mission-card"><h2>{text.mission_environment}</h2>{capability && <><p>{text.mission_configured}: {capability.configured}</p><p>{text.mission_resolved}: {capability.resolved ?? text.mission_unknown}</p><p>{text.mission_validated}: {capability.llmValidated ? text.mission_yes : text.mission_no}</p><p>{text.mission_isolation}: {capability.isolation.osIsolated ? text.mission_yes : text.mission_no}</p></>}{factEvidence(['environment'])}</section>
      <section className="mission-card"><h2>{text.mission_guards}</h2>{artifact ? artifact.dossier.qualityGates.map(gate => <p key={gate.id}>{gate.id}: {gate.status} — {gate.reason}</p>) : <p>{text.mission_unknown}</p>}<p>{text.mission_readonly}</p></section>
    </aside>}</div>
    {request && <p>{text.mission_queue_state}: {request.status} · {request.id}. {text.mission_queue_boundary}</p>}
  </div>;
}

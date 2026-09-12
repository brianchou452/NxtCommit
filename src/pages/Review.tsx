import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { AuthoredMission, AssistantResult } from '../../shared/authoring.js';
import type { ExecutionEvidence, ReviewabilityResult } from '../../shared/types.js';
import { useLocale } from '../i18n/LocaleProvider.js';
import { productRequest } from '../services/authoring.js';
import { VerificationDossier, DiffViewer } from '../components/VerificationDossier.js';
import { Advisory } from '../components/AuthoringEvidence.js';
import { ReviewControls } from '../components/ReviewControls.js';
import '../styles/authoring.css';
export interface ReviewSnapshot { mission: AuthoredMission; evidence?: ExecutionEvidence; reviewability: ReviewabilityResult }

export function Review() {
  const { id = '' } = useParams(); const { text } = useLocale();
  const [search] = useSearchParams();
  const [snapshot, setSnapshot] = useState<ReviewSnapshot>(); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [comment, setComment] = useState(''); const [pending, setPending] = useState(false); const [done, setDone] = useState(false);
  const [explanation, setExplanation] = useState<AssistantResult>(); const [shadow, setShadow] = useState<AssistantResult>();
  const [reconnecting, setReconnecting] = useState(false); const generation = useRef(0); const busy = useRef(false);
  const latestRequest = useRef(0); const activeRun = useRef<string | undefined>(undefined);
  const reload = useCallback(async (signal?: AbortSignal) => {
    const sequence = ++latestRequest.current;
    try {
      const next = await productRequest<ReviewSnapshot>(`/api/missions/${encodeURIComponent(id)}`, undefined, signal);
      if (signal?.aborted || sequence !== latestRequest.current) return;
      if (activeRun.current !== next.evidence?.run.id) { generation.current++; setExplanation(undefined); setShadow(undefined); activeRun.current = next.evidence?.run.id; }
      setSnapshot(next); setError('');
    } catch { if (!signal?.aborted && sequence === latestRequest.current) setError(text.c_no_evidence); }
    finally { if (!signal?.aborted && sequence === latestRequest.current) setLoading(false); }
  }, [id, text.c_no_evidence]);
  useEffect(() => {
    generation.current++; setSnapshot(undefined); setExplanation(undefined); setShadow(undefined); setComment(''); setDone(false); setLoading(true);
    const controller = new AbortController(); void reload(controller.signal);
    let stream: EventSource | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      if (controller.signal.aborted) return;
      stream = new EventSource(`/api/missions/${encodeURIComponent(id)}/stream`);
      stream.onopen = () => { setReconnecting(false); void reload(controller.signal); };
      const refresh = () => void reload(controller.signal);
      stream.addEventListener('mission_update', refresh); stream.addEventListener('run_update', refresh); stream.onmessage = refresh;
      stream.onerror = () => {
        stream?.close(); setReconnecting(true);
        if (!timer) timer = setTimeout(() => { timer = undefined; void reload(controller.signal); connect(); }, 1000);
      };
    };
    connect();
    return () => { generation.current++; latestRequest.current++; controller.abort(); stream?.close(); if (timer) clearTimeout(timer); };
  }, [id, reload]);
  async function action(work: () => Promise<void>) {
    if (busy.current) return; busy.current = true; setPending(true); setError('');
    try { await work(); } catch { setError(text.c_error); } finally { busy.current = false; setPending(false); }
  }
  const artifact = snapshot?.evidence?.artifact; const runId = snapshot?.evidence?.run.id;
  async function decide(decision: 'approve' | 'request_changes') {
    if (decision === 'request_changes' && !comment.trim()) { setError(text.c_required); return; }
    await action(async () => {
      await productRequest(`/api/runs/${encodeURIComponent(runId!)}/review`, { decision, comment });
      setDone(true); await reload();
    });
  }
  async function advice(kind: 'explain' | 'shadow-review') {
    const epoch = generation.current;
    await action(async () => {
      const result = await productRequest<{ explanation?: AssistantResult; shadow?: AssistantResult }>(`/api/runs/${encodeURIComponent(runId!)}/${kind}`);
      if (epoch !== generation.current) return;
      if (kind === 'explain') setExplanation(result.explanation); else setShadow(result.shadow);
    });
  }
  return <main id="main-content" tabIndex={-1} className="c-review"><h1>{text.c_review}</h1><p>{text.c_review_boundary}</p>
    {loading && <p role="status">{text.loading}</p>}{reconnecting && <p role="status">{text.c_reconnecting}</p>}
    {!loading && !artifact && <p>{text.c_no_evidence}</p>}
    {artifact && <div className="c-review-grid"><div>
      <VerificationDossier artifact={artifact} /><DiffViewer artifact={artifact} />
      <section className="c-card" data-testid="advisory"><h2>{text.c_advice}</h2><p>{artifact.review.source} · {artifact.review.summary}</p><p>{text.c_affected}</p>
        <div className="c-actions"><button disabled={pending} onClick={() => void advice('explain')}>{text.c_explain}</button><button disabled={pending} onClick={() => void advice('shadow-review')}>{text.c_shadow}</button></div>
        {explanation && <Advisory result={explanation} feature="evidence-explanation" />}{shadow && <Advisory result={shadow} feature="shadow-review" />}
      </section>
    </div><ReviewControls status={snapshot.mission.status} reviewable={snapshot.reviewability.reviewable} providerPerspective={search.get('perspective') === 'provider'} comment={comment} pending={pending} done={done} onComment={setComment} onDecision={decision => void decide(decision)} /></div>}
    {error && <p role="alert">{error}</p>}<div className="c-actions"><button onClick={() => void reload()}>{text.c_refresh}</button><Link to={`/missions/${id}`}>{text.c_open_mission}</Link></div>
  </main>;
}

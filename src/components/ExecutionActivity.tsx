import type { ExecutionEvent, RunSummary } from '../../shared/execution.js';
import type { RunRequest } from '../../shared/mission.js';
import { useLocale } from '../i18n/LocaleProvider.js';
import { ownedEvents } from '../services/mission.js';

export function ExecutionActivity({ run, events, request }: { run?: RunSummary; events: ExecutionEvent[]; request?: RunRequest | null }) {
  const { text, locale } = useLocale();
  const ordered = run ? ownedEvents(events, run.missionId, run.id) : [];
  if (!run) return <section className="mission-empty" data-testid="execution-idle"><h2>{request && ['queued', 'leased'].includes(request.status) ? text.mission_queued : text.mission_idle}</h2><p>{request ? text.mission_queue_note : text.mission_idle_note}</p>{request && <p>{text.mission_queue_state}: <strong>{request.status}</strong> · {request.id}</p>}</section>;
  const latest = ordered.at(-1);
  return <section className="execution-activity" data-testid="execution-activity" data-run-id={run.id}>
    <div className="execution-phase"><span>{text.mission_phase}</span><strong>{latest?.type ?? text.mission_waiting}</strong>{run.status === 'running' && <span className="execution-pulse" data-testid="running-pulse">● {text.mission_active}</span>}</div>
    <div className="execution-timeline"><header><h2>{text.mission_timeline}</h2><span>{ordered.length}</span></header>
      {ordered.length === 0 && <p className="mission-empty">{text.mission_waiting}</p>}
      <ol>{ordered.map(event => {
        const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload) ? event.payload : {};
        const title = typeof payload.title === 'string' ? payload.title : event.type;
        const detail = typeof payload.detail === 'string' ? payload.detail : undefined;
        return <li key={event.id} data-testid="execution-event" data-event-id={event.id} data-run-id={event.runId}>
          <div className="execution-event-meta"><time>{new Date(event.ts).toLocaleTimeString(locale, { timeZone: 'Asia/Taipei', hour12: false })}</time><span>{event.type}</span><span className={`event-source source-${event.source}`}>{text.mission_source}: {event.source}</span><span>{event.verified ? text.mission_verified : text.mission_unverified}</span></div>
          <h3>{title}</h3>{detail && <p>{detail}</p>}
          {event.payload !== undefined && <details><summary>{text.mission_payload}</summary><pre>{JSON.stringify(event.payload, null, 2)}</pre></details>}
        </li>;
      })}</ol>
    </div>
  </section>;
}

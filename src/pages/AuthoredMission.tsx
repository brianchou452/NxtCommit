import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { localize } from '../../shared/primitives.js';
import { useLocale } from '../i18n/LocaleProvider.js';
import { productRequest } from '../services/authoring.js';
import type { ReviewSnapshot } from './Review.js';
import '../styles/authoring.css';
/** C publication receipt; B replaces the mission route with its lifecycle page at integration. */
export function AuthoredMission() {
  const { id = '' } = useParams(); const { text, locale } = useLocale(); const [snapshot, setSnapshot] = useState<ReviewSnapshot>(); const [error, setError] = useState(false);
  useEffect(() => { const controller = new AbortController(); setSnapshot(undefined); setError(false); productRequest<ReviewSnapshot>(`/api/missions/${encodeURIComponent(id)}`, undefined, controller.signal).then(setSnapshot).catch(() => { if (!controller.signal.aborted) setError(true); }); return () => controller.abort(); }, [id]);
  return <main id="main-content" tabIndex={-1} className="c-wizard"><h1>{snapshot ? localize(snapshot.mission.title, locale) : text.c_status}</h1>
    {!snapshot && !error && <p>{text.loading}</p>}{error && <p role="alert">{text.c_no_evidence}</p>}
    {snapshot && <section className="c-card"><p>{text.c_status}: <strong>{snapshot.mission.status}</strong></p><p>{text.c_publish_boundary}</p><p>{text.c_nonexecutable}</p><p>{snapshot.mission.project.repoUrl}</p>{snapshot.evidence && <Link to={`/missions/${id}/review`}>{text.c_review}</Link>}</section>}
    <Link to="/new">{text.c_create}</Link>
  </main>;
}

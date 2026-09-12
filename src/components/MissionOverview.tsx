import type { MissionDetail } from '../../shared/mission.js';
import { useLocale } from '../i18n/LocaleProvider.js';
export function MissionOverview({ mission }: { mission: MissionDetail }) {
  const { locale, text } = useLocale();
  const percent = Math.min(100, mission.progress.funding * 100);
  const documentProject = /pdf/i.test(mission.project.name);
  return <section data-testid="mission-overview" className="mission-overview">
    <div className="mission-project"><a href={mission.project.repoUrl} target="_blank" rel="noreferrer">{mission.project.name} ↗</a><span>{text.mission_data}: {mission.project.figuresMode}</span></div>
    <p className="mission-kicker">{text.mission_campaign} · {mission.id}</p>
    <h1>{mission.title[locale]}</h1><p className="mission-tagline">{mission.tagline[locale]}</p>
    <div className={`mission-feature ${documentProject ? 'mission-feature-document' : ''}`}><span className="mission-kicker">{text.mission_project}</span><h2>{mission.project.name}</h2>
      <div className="mission-concept" aria-label={text.mission_concept}>
        <span className="mission-concept-label">{documentProject ? text.mission_document_input : text.mission_concept_input}</span><span className="mission-concept-arrow" aria-hidden="true">→</span>
        <span className="mission-concept-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none">{documentProject ? <><path d="M14 5h15l8 8v29H14V5Z" stroke="currentColor" strokeWidth="2.5"/><path d="M28 5v10h9M20 32h11M20 37h7" stroke="currentColor" strokeWidth="2.5"/><circle cx="21" cy="22" r="5" stroke="currentColor" strokeWidth="2.5"/><path d="m25 26 5 5" stroke="currentColor" strokeWidth="2.5"/></> : <><path d="m16 12-12 12 12 12m16-24 12 12-12 12M28 8l-8 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></>}</svg></span>
        <span className="mission-concept-arrow" aria-hidden="true">→</span><span className="mission-concept-label">{documentProject ? text.mission_document_output : text.mission_concept_output}</span>
      </div><p>{mission.project.description[locale]}</p><div className="mission-feature-facts"><span>{text.mission_backers}<strong>{(mission.backerCount ?? new Set(mission.pledges.map(pledge => pledge.contributorId)).size)}</strong></span><span>{text.mission_generator}<strong>{mission.generator}</strong></span><span>{text.mission_data}<strong>{mission.project.figuresMode}</strong></span></div></div>
    <div className="mission-funding"><p className="mission-kicker">{text.mission_funding}</p><div className="mission-funding-numbers"><span><strong>{mission.computePledged.toLocaleString()}</strong> / {mission.computeGoal.toLocaleString()} {text.mission_credits}</span><b>{percent.toFixed(1)}%</b></div><progress aria-label={text.mission_funding} max={mission.computeGoal} value={mission.computePledged} /><p>{text.mission_units}</p></div>
    <p className="mission-provenance">{text.mission_provenance} {text.mission_generator}: {mission.generator} · {text.mission_data}: {mission.dataMode}</p>
  </section>;
}

import type { MissionDetail } from '../../shared/mission.js';
import { useLocale } from '../i18n/LocaleProvider.js';
export function MissionOverview({ mission }: { mission: MissionDetail }) {
  const { locale, text } = useLocale();
  const percent = Math.min(100, mission.progress.funding * 100);
  return <section data-testid="mission-overview" className="mission-overview">
    <div className="mission-project"><a href={mission.project.repoUrl} target="_blank" rel="noreferrer">{mission.project.name} ↗</a><span>{text.mission_data}: {mission.project.figuresMode}</span></div>
    <p className="mission-kicker">{text.mission_campaign} · {mission.id}</p>
    <h1>{mission.title[locale]}</h1><p className="mission-tagline">{mission.tagline[locale]}</p>
    <div className="mission-feature"><span className="mission-kicker">{text.mission_project}</span><h2>{mission.project.name}</h2><div className="mission-feature-symbol" aria-hidden="true">◇</div><p>{mission.project.description[locale]}</p><div className="mission-feature-facts"><span>{text.mission_backers}<strong>{new Set(mission.pledges.map(pledge => pledge.contributorId)).size}</strong></span><span>{text.mission_generator}<strong>{mission.generator}</strong></span><span>{text.mission_data}<strong>{mission.project.figuresMode}</strong></span></div></div>
    <div className="mission-funding"><p className="mission-kicker">{text.mission_funding}</p><div className="mission-funding-numbers"><span><strong>{mission.computePledged.toLocaleString()}</strong> / {mission.computeGoal.toLocaleString()} {text.mission_credits}</span><b>{percent.toFixed(1)}%</b></div><progress aria-label={text.mission_funding} max={mission.computeGoal} value={mission.computePledged} /><p>{text.mission_units}</p></div>
    <p className="mission-provenance">{text.mission_provenance} {text.mission_generator}: {mission.generator} · {text.mission_data}: {mission.dataMode}</p>
  </section>;
}

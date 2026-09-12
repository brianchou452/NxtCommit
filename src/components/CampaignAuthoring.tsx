import type { RepoAnalysis, CampaignDraft, AssistantResult } from '../../shared/authoring.js';
import { localize } from '../../shared/primitives.js';
import { useLocale } from '../i18n/LocaleProvider.js';
import { Advisory, Generator } from './AuthoringEvidence.js';

export interface CampaignAuthoringProps {
  analysis: RepoAnalysis; issueId: string; draft: CampaignDraft;
  pending: boolean; expired: boolean; critic: AssistantResult | undefined;
  onCritique(): void; onPublish(): void;
}
export function CampaignAuthoring({ analysis, issueId, draft, pending, expired, critic, onCritique, onPublish }: CampaignAuthoringProps) {
  const { text, locale } = useLocale();
  if (!analysis.issues.some(issue => issue.id === issueId) || draft.issueId !== issueId) return <p role="alert">{text.c_expired}</p>;
  return <section className="c-card" aria-label={text.c_campaign}>
      <Generator evidence={draft.evidence} /><h2>{localize(draft.title, locale)}</h2><p>{localize(draft.tagline, locale)}</p>
      <div className="c-source-grid">{Object.entries(draft.story).map(([key, value]) => <p key={key}>{localize(value, locale)}</p>)}</div>
      <h3>{text.c_criteria}</h3><ul>{draft.criteria.map((criterion, i) => <li key={i}>{localize(criterion, locale)}</li>)}</ul>
      <h3>{text.c_milestones}</h3><ol>{draft.milestones.map((milestone, i) => <li key={i}>{localize(milestone.title, locale)} · {milestone.allocation}%</li>)}</ol>
      <h3>{text.c_risk}</h3><p>{localize(draft.risk, locale)}</p>
      <h3>{text.c_estimate}</h3><strong>{draft.estimate.total.toLocaleString()} {text.wallet}</strong><p>{draft.estimate.low}–{draft.estimate.high} · {draft.estimate.confidence}</p>
      <dl className="c-measurements">{draft.estimate.breakdown.map(part => <div key={part.label}><dt>{part.label}</dt><dd>{part.credits}</dd></div>)}</dl><p>{text.c_allowance}</p><small>{draft.estimate.basis}</small>
      <div className="c-actions"><button disabled={pending || expired} onClick={onCritique}>{text.c_critic}</button></div>
      {critic && <Advisory result={critic} feature="campaign-critic" />}
      <p className="c-boundary">{text.c_publish_boundary}</p><button className="c-primary" disabled={pending || expired} onClick={onPublish}>{text.c_publish_action}</button>
    </section>;
}

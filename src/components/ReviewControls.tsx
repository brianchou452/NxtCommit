import { useLocale } from '../i18n/LocaleProvider.js';
export interface ReviewControlsProps {
  status: string; reviewable: boolean; providerPerspective: boolean;
  comment: string; pending: boolean; done: boolean;
  onComment(value: string): void; onDecision(value: 'approve' | 'request_changes'): void;
}
export function ReviewControls(props: ReviewControlsProps) {
  const { text } = useLocale();
  return <aside className="c-card c-decision" data-testid="review-controls"><h2>{text.c_status}</h2><p data-testid="mission-status">{props.status}</p><p className="c-boundary">{text.c_review_boundary}</p>
    {props.providerPerspective ? <p data-guide-complete="true">{text.c_provider_boundary}</p> : <>
      {!props.reviewable && <p>{text.c_ineligible}</p>}
      <label className="c-field">{text.c_comment}<textarea value={props.comment} onChange={event => props.onComment(event.target.value)} maxLength={4000} disabled={props.pending || !props.reviewable} /></label>
      <div className="c-actions"><button data-guide-target={props.reviewable ? "next" : undefined} data-guide-step="5" data-guide-title="c_approve" className="c-primary" disabled={props.pending || !props.reviewable} onClick={() => props.onDecision('approve')}>{text.c_approve}</button><button disabled={props.pending || !props.reviewable} onClick={() => props.onDecision('request_changes')}>{text.c_changes}</button></div>
    </>}
    {props.done && <p role="status" data-guide-complete="true">{text.c_decision_done}</p>}
  </aside>;
}

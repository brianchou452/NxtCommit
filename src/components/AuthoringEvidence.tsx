import { useState } from 'react';
import type { AssistantResult, AiEvidence } from '../../shared/authoring.js';
import { localize } from '../../shared/primitives.js';
import { useLocale } from '../i18n/LocaleProvider.js';
import { productRequest } from '../services/authoring.js';

export function Generator({ evidence }: { evidence: AiEvidence }) {
  const { text } = useLocale();
  const labels = { demo: text.c_demo, static: text.c_static, openai: text.c_openai };
  return <p className="c-provenance">{text.c_generator}: {labels[evidence.generator]} · {evidence.promptVersion}{evidence.model ? ` · ${evidence.model}` : ''}{evidence.fallbackReason ? ` · ${evidence.fallbackReason}` : ''}</p>;
}
export function Advisory({ result, feature }: { result: AssistantResult; feature: string }) {
  const { text, locale } = useLocale(); const [feedback, setFeedback] = useState('');
  async function score(helpful: boolean) {
    try { await productRequest('/api/ai/feedback', { feature, traceId: result.evidence.traceId, helpful }); setFeedback(text.c_feedback); }
    catch { setFeedback(text.c_error); }
  }
  return <section className="c-advisory"><h3>{text.c_advice}</h3><p>{localize(result.summary, locale)}</p><Generator evidence={result.evidence} /><p>{text.c_affected}</p>
    {result.scope && <p>{localize(result.scope, locale)}</p>}
    {result.criteria && <ul>{result.criteria.map((criterion, index) => <li key={index}>{localize(criterion, locale)}</li>)}</ul>}
    {result.checks?.map(check => <p key={check.kind}>{check.kind} · {check.status}: {localize(check.explanation, locale)}</p>)}
    {result.facts && <dl>{result.facts.map(fact => <div key={fact.field}><dt>{fact.field}</dt><dd>{fact.value}</dd></div>)}</dl>}
    {result.caveats?.map((caveat, index) => <p key={index}>{localize(caveat, locale)}</p>)}
    {result.evidence.traceId && <div className="c-actions"><button onClick={() => void score(true)}>{text.c_helpful}</button><button onClick={() => void score(false)}>{text.c_unhelpful}</button></div>}
    <p role="status">{feedback}</p>
  </section>;
}

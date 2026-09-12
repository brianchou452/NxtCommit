import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleProvider.js';
import '../styles/workflow-story.css';

/** A labelled interactive product walkthrough, never an execution receipt. */
export function WorkflowStory() {
  const { text } = useLocale();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  const stages = text.workflow_stages.split(' | ');
  const details = text.workflow_details.split(' | ');
  useEffect(() => {
    if (!playing) return;
    if (step >= 7) { setPlaying(false); return; }
    const timer = setTimeout(() => setStep(step + 1), 3000);
    return () => clearTimeout(timer);
  }, [playing, step]);
  function choose(index: number) { setPlaying(false); setStep(index); }
  return <section id="workflow" className="workflow-story" aria-labelledby="workflow-title">
    <header>
      <p className="kicker">{text.workflow_eyebrow}</p>
      <h2 id="workflow-title">{text.workflow_title}</h2>
      <p>{text.workflow_intro}</p>
      <span className="badge">{text.workflow_demo}</span>
    </header>
    <div className="workflow-loops">
      <article><span>01</span><h3>{text.workflow_task_title}</h3><p>{text.workflow_task_loop}</p><strong>{text.workflow_task_goal}</strong></article>
      <article><span>02</span><h3>{text.workflow_repo_title}</h3><p>{text.workflow_repo_loop}</p><strong>{text.workflow_repo_goal}</strong></article>
    </div>
    <div className="workflow-controls">
      <h3>{text.workflow_example}</h3>
      <button onClick={() => { if (step >= 7) setStep(0); setPlaying(!playing); }} aria-pressed={playing}>{playing ? text.workflow_pause : text.workflow_play}</button>
    </div>
    <ol className="workflow-rail" aria-label={text.workflow_sequence}>
      {stages.map((label, index) => <li key={label} className={index === step ? 'current' : ''}>
        <button aria-current={index === step ? 'step' : undefined} onClick={() => choose(index)}><span>{String(index + 1).padStart(2, '0')}</span>{label}</button>
      </li>)}
    </ol>
    <div ref={scene} tabIndex={-1} className="workflow-scene" aria-live="polite" aria-atomic="true">
      <span className="workflow-scene-number" aria-hidden="true">{String(step + 1).padStart(2, '0')}</span>
      <div><p className="kicker">{text.workflow_example}</p><h3>{stages[step]}</h3><p>{details[step]}</p>
      {step === 8 && <strong>{confirmed ? text.workflow_next_active : text.workflow_next_pending}</strong>}</div>
    </div>
    <div className="workflow-rule-grid">
      <article className="workflow-local"><p className="kicker">{text.workflow_local_label}</p><h3>{text.workflow_local_example}</h3><p>{text.workflow_local_note}</p></article>
      <article className="workflow-rule">
        <p className="kicker">{confirmed ? text.workflow_active : text.workflow_proposal}</p>
        <h3>{text.workflow_rule_title}</h3>
        <dl>
          <div><dt>{text.workflow_source}</dt><dd>{text.workflow_source_value}</dd></div>
          <div><dt>{text.workflow_scope}</dt><dd>{text.workflow_scope_value}</dd></div>
          <div><dt>{text.workflow_version}</dt><dd>{confirmed ? 'v2' : 'v1 → v2'}</dd></div>
          <div><dt>{text.workflow_gate}</dt><dd>{text.workflow_gate_value}</dd></div>
        </dl>
        <p>{text.workflow_confirmation_note}</p>
        <button className="button primary" disabled={confirmed} onClick={() => { setConfirmed(true); choose(8); scene.current?.focus(); scene.current?.scrollIntoView({block:'center'}); }}>{confirmed ? text.workflow_confirmed : text.workflow_confirm}</button>
      </article>
    </div>
    <footer><p>{text.workflow_boundary}</p><Link to="/assurance">{text.workflow_live_evidence} →</Link><button onClick={() => {setConfirmed(false); choose(0);}}>{text.workflow_reset}</button></footer>
  </section>;
}

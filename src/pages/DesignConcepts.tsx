import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authoringEn, authoringZh } from '../i18n/authoring.js';
import '../styles/authoring.css';
const concepts = ['editorial', 'kickstarter', 'network', 'hybrid'];
export function DesignConcepts() {
  const params = useParams(); const concept = concepts.includes(params.concept ?? '') ? params.concept! : 'editorial';
  const campaign = params['*'] === 'campaign'; const [language, setLanguage] = useState<'en' | 'zh-TW'>('en'); const [amount, setAmount] = useState(500); const [preview, setPreview] = useState(false);
  const text = { en: authoringEn, 'zh-TW': authoringZh }[language];
  return <div className={`c-concept c-concept-${concept}`} lang={language}>
    <nav className="c-concept-nav" aria-label={text.c_concepts}><strong>{text.c_concepts}</strong>{concepts.map(item => <Link key={item} to={`/concepts/${item}`} aria-current={item === concept ? 'page' : undefined}>{item}</Link>)}</nav>
    <header className="c-concept-header"><Link to={`/concepts/${concept}`}>NxtCommit</Link><Link to={`/concepts/${concept}`}>{text.c_explore}</Link><button onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}>{text.c_language_toggle}</button></header>
    <main id="main-content" tabIndex={-1}><section className="c-concept-hero"><div><p className="c-provenance">{text.c_concepts}</p><h1>{text.c_mock_title}</h1><p>{text.c_mock_intro}</p><div className="c-actions"><Link className="c-primary" to={`/concepts/${concept}/campaign`}>{text.c_mock_campaign}</Link><a href="#concept-flow">{text.c_how}</a></div></div>
      <div className="c-concept-art" aria-hidden="true"><strong>{concept === 'editorial' ? '04' : '128 → AI → 4.0'}</strong><p>{text.c_mock_flow}</p></div>
    </section>
    {campaign ? <section className="c-card c-mock-backing"><h2>{text.c_mock_campaign}</h2><label className="c-field">{text.c_amount}<input type="range" min="100" max="2000" step="100" value={amount} onChange={event => { setAmount(Number(event.target.value)); setPreview(false); }} /></label><output>{amount}</output><button onClick={() => setPreview(true)}>{text.c_mock_back}</button>{preview && <p role="status">{text.c_mock_done}</p>}</section> : <section className="c-concept-campaigns"><h2>{text.c_next}</h2><div className="c-concept-cards">{['WhisperX', 'OpenHands', 'Docling'].map((name, index) => <article key={name}><div className="c-mock-logo">{name.slice(0, 2).toUpperCase()}</div><h3>{name}</h3><p>{text.c_mock_intro}</p><progress value={[74, 52, 89][index]} max="100" /><Link to={`/concepts/${concept}/campaign`}>{text.c_mock_campaign}</Link></article>)}</div></section>}
    <section id="concept-flow" className="c-concept-flow"><h2>{text.c_how}</h2><p>{text.c_mock_flow}</p><p>{text.c_mock_intro}</p></section></main>
    <footer>{text.c_concept_disclosure}</footer>
  </div>;
}

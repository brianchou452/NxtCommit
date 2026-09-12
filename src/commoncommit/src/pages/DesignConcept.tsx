import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDot,
  Download,
  Github,
  GitBranch,
  GitPullRequest,
  Heart,
  Languages,
  MessageCircle,
  MoveUpRight,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";

type ConceptKey = "editorial" | "kickstarter" | "network" | "hybrid";
type Language = "en" | "zh";
type Concept = {
  key: ConceptKey;
  letter: string;
  name: string;
  note: string;
};

const CONCEPTS: Concept[] = [
  { key: "editorial", letter: "A", name: "Editorial Momentum", note: "價值與發現" },
  { key: "kickstarter", letter: "B", name: "Release Kickstarter", note: "募集與達標" },
  { key: "network", letter: "C", name: "Living Network", note: "流動與共同完成" },
  { key: "hybrid", letter: "D", name: "Living Backing", note: "動態首頁 × 綠色群募" },
];

const CAMPAIGNS = [
  {
    project: "WhisperX",
    title: "Make Chinese subtitles finally feel natural",
    blurb: "Help ship the release that improves sentence breaks and timing for Chinese creators.",
    pct: 74,
    pledged: "7,480",
    goal: "10,000",
    backers: 128,
    tone: "sky",
    tag: "Speech infrastructure",
  },
  {
    project: "OpenHands",
    title: "Give coding agents a safer way to browse",
    blurb: "A bounded browser layer with clearer permissions, evidence and repeatable tests.",
    pct: 52,
    pledged: "8,320",
    goal: "16,000",
    backers: 86,
    tone: "peach",
    tag: "Agent framework",
  },
  {
    project: "Docling",
    title: "Read complex tables without losing context",
    blurb: "Move a long-requested table extraction milestone into the next release.",
    pct: 89,
    pledged: "6,230",
    goal: "7,000",
    backers: 214,
    tone: "lilac",
    tag: "Document intelligence",
  },
];

function Brand() {
  return (
    <Link to="/concepts/editorial" className="dc-brand" aria-label="NxtCommit concepts home">
      <span className="dc-brand-mark"><GitBranch size={17} /></span>
      <span>NxtCommit</span>
    </Link>
  );
}

function ConceptNav({ concept, page, language = "en", onLanguageChange }: { concept: Concept; page: "home" | "campaign"; language?: Language; onLanguageChange?: (language: Language) => void }) {
  const zh = concept.key === "hybrid" && language === "zh";
  return (
    <>
      <div className="dc-preview-bar">
        <span className="dc-preview-label">DESIGN CONCEPTS · DEMO DATA</span>
        <div className="dc-concept-tabs" aria-label="Choose a design concept">
          {CONCEPTS.map((item) => (
            <Link
              key={item.key}
              className={item.key === concept.key ? "is-active" : ""}
              to={`/concepts/${item.key}${page === "campaign" ? "/campaign" : ""}`}
            >
              <b>{item.letter}</b><span>{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
      <header className="dc-header">
        <Brand />
        <nav>
          <Link to={`/concepts/${concept.key}`}>{zh ? "發現提案" : "Discover"}</Link>
          <a href="#how">{zh ? "運作方式" : "How it works"}</a>
          <a href="#community">{zh ? "社群" : "Community"}</a>
        </nav>
        <div className="dc-header-actions">
          {concept.key === "hybrid" && page === "campaign" && onLanguageChange && <div className="dc-language-switch" aria-label="Language"><button className={language === "en" ? "is-active" : ""} onClick={() => onLanguageChange("en")}>EN</button><button className={language === "zh" ? "is-active" : ""} onClick={() => onLanguageChange("zh")}>中文</button></div>}
          <button aria-label="Search"><Search size={18} /></button>
          <span className="dc-wallet"><Zap size={15} /> 12,400</span>
          <span className="dc-avatar">PS</span>
        </div>
      </header>
    </>
  );
}

function CampaignCard({ item, concept, featured = false }: { item: typeof CAMPAIGNS[number]; concept: Concept; featured?: boolean }) {
  return (
    <Link to={`/concepts/${concept.key}/campaign`} className={`dc-campaign-card dc-tone-${item.tone} ${featured ? "is-featured" : ""}`}>
      <div className="dc-card-art" aria-hidden="true">
        <div className="dc-art-orbit" />
        <span className="dc-art-project">{item.project.slice(0, 2).toUpperCase()}</span>
        <span className="dc-art-tag">{item.tag}</span>
      </div>
      <div className="dc-card-copy">
        <div className="dc-card-kicker"><span>{item.project}</span><span>Next release</span></div>
        <h3>{item.title}</h3>
        <p>{item.blurb}</p>
        <div className="dc-card-progress"><i style={{ width: `${item.pct}%` }} /></div>
        <div className="dc-card-stats">
          <b>{item.pct}% funded</b>
          <span>{item.pledged} / {item.goal} compute</span>
          <span><Users size={14} /> {item.backers}</span>
        </div>
      </div>
    </Link>
  );
}

function FlowGraphic({ compact = false, language = "en" }: { compact?: boolean; language?: Language }) {
  const zh = language === "zh";
  return (
    <div className={`dc-flow ${compact ? "is-compact" : ""}`} data-label="COMMUNITY COMPUTE IN MOTION" aria-label={zh ? "社群算力流向下一個版本" : "Community compute flows into a release"}>
      <div className="dc-flow-node source"><Users size={18} /><span>{zh ? "128 位贊助者" : "128 backers"}</span></div>
      <div className="dc-flow-line one"><i /></div>
      <div className="dc-flow-node plan"><Sparkles size={18} /><span>{zh ? "AI 執行計畫" : "AI plan"}</span></div>
      <div className="dc-flow-line two"><i /></div>
      <div className="dc-flow-node release"><GitBranch size={18} /><span><strong>{zh ? "版本 4.0" : "Release 4.0"}</strong>{compact && <small>{zh ? "中文自然斷句" : "Natural Chinese captions"}</small>}</span></div>
      <span className="dc-flow-pulse p1" /><span className="dc-flow-pulse p2" /><span className="dc-flow-pulse p3" />
    </div>
  );
}

function HomeConcept({ concept }: { concept: Concept }) {
  return (
    <div className="dc-page">
      <ConceptNav concept={concept} page="home" />
      <main>
        <section className="dc-home-hero">
          <div className="dc-hero-copy">
            <span className="dc-eyebrow"><CircleDot size={13} /> OPEN SOURCE, BACKED BY ALL OF US</span>
            <h1>Put your idle AI compute behind the <em>next release.</em></h1>
            <p>Discover the open source behind products you use, understand what is holding it back, and help its next release happen.</p>
            <div className="dc-hero-actions">
              <a href="#campaigns" className="dc-primary">Explore releases <ArrowRight size={17} /></a>
              <a href="#how" className="dc-secondary">How backing works</a>
            </div>
            <div className="dc-social-proof">
              <span className="dc-avatar-stack"><i>A</i><i>M</i><i>K</i><i>+</i></span>
              <span><b>2,148 builders</b> moved open source forward this month</span>
            </div>
          </div>
          <div className="dc-hero-visual">
            {concept.key === "editorial" && (
              <div className="dc-editorial-cover">
                <span>THE NEXT RELEASE</span><strong>04</strong>
                <h2>Open source doesn’t run on stars.<br />It runs on committed resources.</h2>
                <div className="dc-cover-footer"><span>FIELD NOTE 001</span><MoveUpRight /></div>
              </div>
            )}
            {concept.key === "kickstarter" && <CampaignCard item={CAMPAIGNS[0]} concept={concept} featured />}
            {(concept.key === "network" || concept.key === "hybrid") && <FlowGraphic />}
          </div>
        </section>

        <section className="dc-ticker" aria-label="Platform activity">
          <span>24 releases funded</span><span>312k compute committed</span><span>1,480 tests verified</span><span>8 releases shipped</span>
        </section>

        <section id="campaigns" className="dc-section dc-discover">
          <div className="dc-section-head">
            <div><span className="dc-eyebrow">RELEASES TO BACK</span><h2>Make the next one happen.</h2></div>
            <a href="#all">View all campaigns <ArrowRight size={16} /></a>
          </div>
          <div className="dc-campaign-grid">
            {CAMPAIGNS.map((item, index) => <CampaignCard key={item.project} item={item} concept={concept} featured={index === 0} />)}
          </div>
        </section>

        <section id="how" className="dc-section dc-how">
          <div className="dc-section-head"><div><span className="dc-eyebrow">HOW IT WORKS</span><h2>From idle tokens to a real release.</h2></div></div>
          <div className="dc-how-grid">
            {[
              ["01", "Understand", "AI translates the repo, its impact and its open roadmap into plain language."],
              ["02", "Back", "Commit compute to a release you care about. See exactly how far you move it."],
              ["03", "Verify", "Follow the plan, tests and maintainer review—not a black-box progress bar."],
              ["04", "Ship together", "The release lands. Your personal impact becomes part of its story."],
            ].map(([n, title, copy]) => <article key={n}><b>{n}</b><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </section>
      </main>
      <footer className="dc-footer"><Brand /><span>Design exploration · not a live funding service</span></footer>
    </div>
  );
}

function SourceChip({ children, kind }: { children: React.ReactNode; kind?: "issue" | "discussion" | "roadmap" }) {
  const Icon = kind === "issue" ? CircleDot : kind === "discussion" ? MessageCircle : kind === "roadmap" ? GitBranch : Check;
  return <span className="dc-source-chip"><Icon size={13} />{children}</span>;
}

function HybridCampaignStory({ zh, amount, contribution, after }: { zh: boolean; amount: number; contribution: number; after: number }) {
  const journey = zh
    ? ["Repository Analysis", "Research", "Coding", "Testing", "Pull Request", "Owner Review", "Merge", "Release", "Impact Report"]
    : ["Repository Analysis", "Research", "Coding", "Testing", "Pull Request", "Owner Review", "Merge", "Release", "Impact Report"];
  const messages = zh
    ? ["我每週都在用 WhisperX，很期待中文支援真的往前一步。", "為台灣的課程創作者贊助這個 Release。", "閒置 token 就該拿來完成這種真正有用的事。"]
    : ["I use WhisperX every week—excited to see Chinese support improve.", "Backing this for our course creators in Taiwan.", "This is exactly what unused tokens should be doing."];
  const audienceOutcomes = zh ? [
    { context: "WHEN YOU WATCH", scenario: "看中文訪談時，字幕在一句話說完的地方換行，不用重新猜上下句。", core: "WhisperX 把每個字對回聲音出現的時間。", release: "改善中文句子邊界，減少不自然的斷句。" },
    { context: "WHEN YOU LEARN", scenario: "暫停、快轉再播放後，字幕仍跟得上老師正在說的那一句。", core: "精準時間軸讓字幕、搜尋結果與播放位置對得起來。", release: "讓中文長句用更自然的單位顯示與搜尋。" },
    { context: "WHEN YOU PUBLISH", scenario: "訪談剪完後，不必再把每一句字幕拖回聲音出現的位置。", core: "逐字時間戳提供剪輯與產生字幕的共同基礎。", release: "減少人工修正中文斷句與標點的時間。" },
  ] : [
    { context: "WHEN YOU WATCH", scenario: "Watch a Chinese interview with captions breaking where each sentence actually ends.", core: "WhisperX aligns every word with the moment it is spoken.", release: "Improves Chinese sentence boundaries and reduces awkward breaks." },
    { context: "WHEN YOU LEARN", scenario: "Pause, skip and resume while captions still follow the sentence being taught.", core: "A precise timeline keeps captions, search results and playback aligned.", release: "Makes long Chinese sentences easier to display and search." },
    { context: "WHEN YOU PUBLISH", scenario: "Finish an interview without dragging every caption back to the moment it was spoken.", core: "Word-level timestamps give editing and captioning a shared foundation.", release: "Reduces manual correction of Chinese breaks and punctuation." },
  ];
  const repoSignals = [
    { issue: "#829", author: "creativeidiot123", date: "JUN 2024", quote: "Random sentence cuts that felt unnatural.", translation: "字幕會在奇怪的位置切開，讀起來不自然。", href: "https://github.com/m-bain/whisperX/issues/829" },
    { issue: "#519", author: "Ganya-A", date: "OCT 2023", quote: "Is it possible to split the overly long subtitles at the punctuation?", translation: "能不能利用標點，把過長的字幕切開？", href: "https://github.com/m-bain/whisperX/issues/519" },
    { issue: "#200", author: "seset", date: "APR 2023", quote: "The subtitles of each paragraph are too long.", translation: "每一段字幕都太長，很難直接閱讀。", href: "https://github.com/m-bain/whisperX/issues/200" },
  ];
  const developmentPlan = zh ? [
    { phase: "DISCOVERY", title: "Research", task: "盤點社群回報的中文斷句案例", deliverable: "中文斷句 failure cases 與驗收條件", gate: "Owner 確認案例與範圍", compute: "1,000", share: 10 },
    { phase: "IMPLEMENTATION", title: "Build", task: "實作能辨識語言的句子分組", deliverable: "句子分組模組與可執行的 Pull Request", gate: "PR 可在測試環境執行", compute: "5,000", share: 50 },
    { phase: "VALIDATION", title: "Test", task: "執行六種語言的回歸測試", deliverable: "六種語言的 regression report", gate: "既有語言沒有新增 regression", compute: "2,000", share: 20 },
    { phase: "MAINTAINER GATE", title: "Owner Review", task: "回應維護者意見並完成修正", deliverable: "已回應 Review 的 merge-ready PR", gate: "Owner 決定 Merge 或 Revise", compute: "2,000", share: 20 },
  ] : [
    { phase: "DISCOVERY", title: "Research", task: "Audit reported Chinese boundary cases", deliverable: "Chinese failure-case set and acceptance criteria", gate: "Owner confirms cases and scope", compute: "1,000", share: 10 },
    { phase: "IMPLEMENTATION", title: "Build", task: "Implement language-aware sentence grouping", deliverable: "Sentence-grouping module and runnable pull request", gate: "PR runs in the test environment", compute: "5,000", share: 50 },
    { phase: "VALIDATION", title: "Test", task: "Run regression suite across six languages", deliverable: "Six-language regression report", gate: "No new regression in supported languages", compute: "2,000", share: 20 },
    { phase: "MAINTAINER GATE", title: "Owner Review", task: "Respond to maintainer feedback", deliverable: "Reviewed, merge-ready pull request", gate: "Owner decides Merge or Revise", compute: "2,000", share: 20 },
  ];

  return <>
    <nav className="dc-story-nav"><a href="#what">{zh ? "它推動什麼" : "What it powers"}</a><a href="#why">{zh ? "為何重要" : "Why it matters"}</a><a href="#who">{zh ? "你的體驗" : "What changes for you"}</a><a href="#release">{zh ? "下一個 Release" : "Next release"}</a><a href="#impact">{zh ? "我的贊助" : "Your back"}</a></nav>

    <section id="what" className="dc-story-section dc-what">
      <div className="dc-story-intro"><span className="dc-index">01</span><div><span className="dc-eyebrow">WHAT IT POWERS</span><h2>{zh ? "Podcast、YouTube 與線上課程字幕，都需要一層技術讓文字跟上聲音。" : "Podcasts, YouTube and online courses all need a layer that keeps words in sync with sound."}</h2></div></div>
      <div className="dc-story-body"><p className="dc-story-lead">{zh ? "當一段錄音變成可以搜尋、剪輯、上字幕的文字，WhisperX 就藏在中間。它把語音辨識結果對回時間軸，讓每個字知道自己該在什麼時候出現。" : "When a recording becomes searchable, editable, captioned text, WhisperX sits in the middle. It aligns speech recognition with the timeline so every word knows when to appear."}</p><div className="dc-stat-trio"><article><strong>18.4k</strong><Star aria-hidden="true" /><span>GitHub stars</span></article><article><strong>1.2m</strong><Download aria-hidden="true" /><span>monthly downloads</span></article><article><strong>42</strong><Languages aria-hidden="true" /><span>languages supported</span></article></div></div>
    </section>

    <section id="why" className="dc-story-section dc-why">
      <div className="dc-story-intro"><span className="dc-index">02</span><div><span className="dc-eyebrow">WHY IT MATTERS</span><h2>{zh ? "你不必知道 WhisperX，也能在字幕準時出現時感受到它。" : "You do not need to know WhisperX to feel it when captions appear on time."}</h2></div></div>
      <div className="dc-technology-stack">
        <div className="is-core"><span>TECHNOLOGY BEHIND PRODUCTS</span><strong>WhisperX</strong></div>
        <i><ArrowRight size={18} /></i>
        <div><span>WHAT PEOPLE EXPERIENCE</span><strong>{zh ? "字幕跟上每一句話" : "Captions that keep up with every word"}</strong><small>Podcast · YouTube · Courses</small></div>
        <p>{zh ? "許多產品不必各自重做語音對時，就能把同一項開源技術帶給更多人。核心技術往前一步，使用這些產品的人也一起受益。" : "Many products can bring the same open-source capability to more people without rebuilding speech alignment. When the core moves forward, the people using those products benefit too."}</p>
      </div>
    </section>

    <section id="who" className="dc-story-section dc-who">
      <div className="dc-story-intro"><span className="dc-index">03</span><div><span className="dc-eyebrow">WHAT CHANGES FOR YOU</span><h2>{zh ? "同一項核心技術，會在觀看、學習與發布內容時，少掉不同的麻煩。" : "The same core technology removes different friction when you watch, learn and publish."}</h2></div></div>
      <div className="dc-audience-outcomes">{audienceOutcomes.map((item, i) => <article key={item.context}>
        <div className="dc-outcome-context"><span>{String(i + 1).padStart(2, "0")}</span><b>{item.context}</b></div>
        <h3>{item.scenario}</h3>
        <div className="dc-outcome-delta"><div><span>CORE TECHNOLOGY</span><p>{item.core}</p></div><div className="is-release"><span>THIS RELEASE</span><p>{item.release}</p></div></div>
      </article>)}</div>
    </section>

    <section id="release" className="dc-story-section dc-release-scope">
      <div className="dc-story-intro"><span className="dc-index">04</span><div><span className="dc-eyebrow">THE NEXT RELEASE</span><h2>{zh ? "這次贊助的標的，是把中文斷句從反覆出現的需求，變成可測試的 Release。" : "This campaign turns a recurring request for Chinese sentence boundaries into a testable release."}</h2></div></div>
      <div className="dc-evidence-card is-github">
        <header className="dc-evidence-origin"><Github size={28} /><div><span>GITHUB EVIDENCE</span><strong>{zh ? "真實 Issue 原文，直接來自 WhisperX 公開 repo" : "Real issue excerpts from the public WhisperX repository"}</strong></div><aside className="dc-evidence-counts" aria-label={zh ? "引用證據統計" : "Cited evidence counts"}><span><CircleDot size={13} /><b>3</b><small>CITED ISSUES</small></span><span className="is-gap"><GitPullRequest size={14} /><b>0</b><small>LINKED PRs</small></span></aside></header>
        <div className="dc-repo-quotes">{repoSignals.map((signal) => <a href={signal.href} target="_blank" rel="noreferrer" key={signal.issue}>
          <div className="dc-repo-quote-meta"><span><CircleDot size={13} /> ISSUE {signal.issue}</span><b>{signal.author} · {signal.date}</b></div>
          <blockquote>“{signal.quote}”</blockquote>
          <p>{zh ? signal.translation : "Open the original issue on GitHub."}</p>
          <MoveUpRight size={16} />
        </a>)}</div>
        <section className="dc-evidence-governance">
          <div className="dc-governance-intro"><span>FROM EVIDENCE TO SCOPE</span><strong>{zh ? "AI 整理需求；Owner 決定 Roadmap。" : "AI organizes the evidence; the owner decides the roadmap."}</strong></div>
          <div className="dc-governance-step"><Sparkles size={18} /><span><b>AI SYNTHESIS</b><small>{zh ? "從引用 Issues 找出共同問題，草擬範圍與驗收條件。" : "Finds the shared problem and drafts scope and acceptance criteria."}</small></span></div>
          <ArrowRight className="dc-governance-arrow" size={18} />
          <div className="dc-governance-step is-owner"><ShieldCheck size={18} /><span><b>OWNER DECISION</b><small>{zh ? "Owner 可修改範圍，並保留 Review 與 Merge 的決定權。" : "The owner can edit scope and retains review and merge authority."}</small></span></div>
        </section>
      </div>
      <div className="dc-plan-grid">
        <div className="dc-plan-steps dc-development-plan">
          <header className="dc-development-head"><div><span>DEVELOPMENT PLAN</span><strong>{zh ? "4 個可驗收的 Milestones" : "4 verifiable milestones"}</strong></div><aside><span>TOTAL COMPUTE TOKENS</span><b>10,000</b><small>1,000 + 5,000 + 2,000 + 2,000</small></aside></header>
          <div className="dc-budget-allocation"><div className="dc-allocation-bar">{developmentPlan.map((milestone) => <i key={milestone.phase} style={{ flex: milestone.share }} />)}</div><div className="dc-allocation-legend">{developmentPlan.map((milestone, i) => <span key={milestone.phase}><i /><b>{String(i + 1).padStart(2, "0")} {milestone.title}</b><small>{milestone.compute} · {milestone.share}%</small></span>)}</div></div>
          <div className="dc-milestone-list">{developmentPlan.map((milestone, i) => <article key={milestone.phase}>
            <div className="dc-milestone-marker"><span>{String(i + 1).padStart(2, "0")}</span></div>
            <div className="dc-milestone-body"><div className="dc-milestone-title"><div><span className="dc-milestone-phase">MILESTONE {String(i + 1).padStart(2, "0")} · {milestone.phase}</span><h3>{milestone.title}</h3></div><aside><b>{milestone.compute}</b><span>TOKENS · {milestone.share}%</span></aside></div><p>{milestone.task}</p><div className="dc-milestone-output"><div><span>DELIVERABLE</span><strong>{milestone.deliverable}</strong></div><div><span>COMPLETION GATE</span><strong>{milestone.gate}</strong></div></div></div>
          </article>)}</div>
        </div>
      </div>
    </section>

    <section id="impact" className="dc-story-section dc-back-impact">
      <div className="dc-story-intro"><span className="dc-index">05</span><div><span className="dc-eyebrow">YOUR BACK IN MOTION</span><h2>{zh ? "你的贊助，不會停在進度條上。它會沿著每一步，走到 Release。" : "Your backing does not stop at a progress bar. It moves through every step to a release."}</h2></div></div>
      <div className="dc-impact-bridge"><div><span>{zh ? "你的贊助" : "YOUR BACK"}</span><strong>{amount.toLocaleString()} compute</strong></div><ArrowRight size={22} /><div><span>{zh ? "推進幅度" : "CAMPAIGN MOVED"}</span><strong>+{contribution}%</strong></div><ArrowRight size={22} /><div><span>{zh ? "新的進度" : "NEW PROGRESS"}</span><strong>{after}%</strong></div></div>
      <div className="dc-journey-board"><div className="dc-journey-head"><span>FROM BACK TO RELEASE</span><p>{zh ? "達標後，你可以一路看到算力如何變成研究、程式碼、測試與最後的影響。" : "After funding, follow compute as it becomes research, code, tests and measurable impact."}</p></div><div className="dc-journey-track">{journey.map((step, i) => <article className={i >= 7 ? "is-outcome" : ""} key={step}><span>{String(i + 1).padStart(2, "0")}</span><b>{step}</b>{i < journey.length - 1 && <ArrowRight size={14} />}</article>)}</div></div>
    </section>

    <section id="community" className="dc-story-section dc-community">
      <div className="dc-story-intro"><span className="dc-index">+</span><div><span className="dc-eyebrow">MAKE IT HAPPEN TOGETHER</span><h2>{zh ? "不是一個人多做一點，而是 128 位贊助者一起讓它發生。" : "Not one person doing more—128 backers making it happen together."}</h2></div></div>
      <div className="dc-community-field">
        <aside className="dc-community-signal">
          <div className="dc-signal-kicker"><CircleDot size={14} /> LIVE COMMUNITY SIGNAL</div>
          <div className="dc-signal-summary"><span><b>128</b>{zh ? "位贊助者" : "BACKERS"}</span><span><b>7,480</b>{zh ? "已投入算力" : "COMPUTE"}</span></div>
          <div className="dc-goal-convergence" aria-label={zh ? "贊助者算力從四面八方匯入版本目標" : "Backer compute converging on the release goal"}>
            <i className="dc-converge-ray r1" /><i className="dc-converge-ray r2" /><i className="dc-converge-ray r3" /><i className="dc-converge-ray r4" />
            <span className="dc-backer-stream s1"><b>Alex</b><small>+1,000</small></span>
            <span className="dc-backer-stream s2"><b>Yun</b><small>+500</small></span>
            <span className="dc-backer-stream s3"><b>Mika</b><small>+250</small></span>
            <span className="dc-backer-stream s4"><b>+125</b><small>BACKERS</small></span>
            <div className="dc-goal-core"><small>GOAL</small><strong>{zh ? "版本 4.0" : "Release 4.0"}</strong><span>{zh ? "中文自然斷句" : "Natural Chinese captions"}</span></div>
          </div>
          <div className="dc-signal-compute"><Zap size={17} /><div><strong>{zh ? "每一筆算力，都匯入同一個 Goal" : "Every contribution moves the same goal"}</strong><small>{zh ? "本週新增 2,480" : "+2,480 this week"}</small></div></div>
        </aside>
        <div className="dc-support-stream"><div className="dc-stream-head"><div><span>SUPPORT STREAM</span><small>{zh ? "每一筆贊助，都帶著一則支持" : "Messages travel with every backing"}</small></div><b><i /> LIVE</b></div><div className="dc-stream-list">{messages.map((message, i) => <article className="dc-stream-message" key={message}><span className="dc-avatar">{["AL", "YC", "MK"][i]}</span><div><div className="dc-message-meta"><b>{["Alex Lin", "Yun Chen", "Mika K."][i]}</b><span>{["1,000", "500", "250"][i]} {zh ? "算力" : "compute"} · {zh ? ["2 分鐘前", "18 分鐘前", "1 小時前"][i] : `${["2m", "18m", "1h"][i]} ago`}</span></div><p>{message}</p></div></article>)}</div><button className="dc-add-signal"><MessageCircle size={18} /><span><b>{zh ? "贊助並留下你的支持" : "Back & add your signal"}</b><small>{zh ? "讓你的訊息和算力一起前進。" : "Your message travels with your compute."}</small></span><ArrowRight size={18} /></button></div>
      </div>
    </section>
  </>;
}

function HybridFundingProgress({ zh }: { zh: boolean }) {
  const progress = 74.8;
  const milestones = [
    { name: "Research", value: 10, tokens: "1,000" },
    { name: "Build", value: 60, tokens: "6,000" },
    { name: "Test", value: 80, tokens: "8,000" },
    { name: "Owner Review", value: 100, tokens: "10,000" },
  ];
  return <section className="dc-funding-status" aria-label={zh ? "贊助進度" : "Funding progress"}>
    <header><div><span>FUNDING PROGRESS</span><h2>7,480 <small>/ 10,000 COMPUTE</small></h2></div><div className="dc-funding-stats"><span><b>74.8%</b>{zh ? "已贊助" : "FUNDED"}</span><span><b>12</b>{zh ? "天後截止" : "DAYS LEFT"}</span></div></header>
    <div className="dc-funding-rail"><div className="dc-funding-fill" style={{ width: `${progress}%` }}><i /></div>{milestones.map((milestone) => <div className={`dc-funding-milestone ${milestone.value <= progress ? "is-reached" : ""} ${milestone.value === 80 ? "is-next" : ""}`} style={{ left: `${milestone.value}%` }} key={milestone.name}><i /><b>{milestone.name}</b><small>{milestone.tokens}</small></div>)}</div>
    <footer><span><Check size={14} /> {zh ? "Research 與 Build 已解鎖" : "Research and Build unlocked"}</span><strong>{zh ? "NEXT · 再 520 tokens 解鎖 Test" : "NEXT · 520 more tokens unlock Test"} <ArrowRight size={14} /></strong></footer>
  </section>;
}

function CampaignConcept({ concept }: { concept: Concept }) {
  const [amount, setAmount] = useState(500);
  const [language, setLanguage] = useState<Language>(concept.key === "hybrid" ? "zh" : "en");
  const zh = concept.key === "hybrid" && language === "zh";
  useEffect(() => {
    document.documentElement.lang = zh ? "zh-Hant-TW" : "en";
  }, [zh]);
  const contribution = Math.round((amount / 10000) * 1000) / 10;
  const after = Math.min(100, 74.8 + contribution);
  return (
    <div className="dc-page">
      <ConceptNav concept={concept} page="campaign" language={language} onLanguageChange={setLanguage} />
      <main className="dc-campaign-page">
        <div className="dc-breadcrumb"><Link to={`/concepts/${concept.key}`}>{zh ? "發現提案" : "Discover"}</Link><ChevronRight size={14} /><span>WhisperX</span><ChevronRight size={14} /><b>{zh ? "版本 4.0" : "Release 4.0"}</b></div>
        <section className="dc-campaign-hero">
          <div className="dc-release-story">
            <div className="dc-repo-line"><span className="dc-repo-mark">WX</span><span><b>WhisperX</b><small>{zh ? "開源語音處理基礎設施" : "Open-source speech infrastructure"}</small></span><span className="dc-owner-approved"><ShieldCheck size={14} /> {zh ? "維護者確認" : "Maintainer approved"}</span></div>
            <span className="dc-eyebrow">CAMPAIGN · RELEASE 4.0</span>
            <h1>{concept.key === "hybrid" ? (zh ? "讓 Podcast、YouTube 與線上課程字幕，跟上每一句話的核心技術。" : "The core technology keeping podcasts, YouTube and course captions in sync with every word.") : "Make Chinese subtitles finally feel natural."}</h1>
            <p className="dc-lede">{concept.key === "hybrid" ? (zh ? "WhisperX 讓一段聲音變成每個字都對得上時間的字幕。這次 Campaign，要一起完成它的中文支援下一步。" : "WhisperX turns speech into captions where every word meets the timeline. This campaign backs the next step for Chinese support.") : "Help ship the release that improves sentence breaks, punctuation and timing for Chinese creators."}</p>
            {concept.key === "hybrid" ? <div className="dc-release-momentum"><div className="dc-release-art"><FlowGraphic compact language={language} /></div><HybridFundingProgress zh={zh} /></div> : <div className="dc-release-art">
              {concept.key === "network" ? <FlowGraphic compact language={language} /> : <><span>你好，歡迎回來</span><i /><span>HELLO, WELCOME BACK</span><div className="dc-waveform">{Array.from({ length: 26 }).map((_, i) => <b key={i} style={{ height: `${16 + ((i * 17) % 42)}%` }} />)}</div></>}
            </div>}
          </div>

          <aside className="dc-backing-panel">
            {concept.key === "hybrid" ? <><div className="dc-backing-target"><span>YOU ARE BACKING</span><div><b>{zh ? "版本 4.0" : "Release 4.0"}</b><strong>{zh ? "讓中文字幕在自然句點換行" : "Natural sentence breaks for Chinese captions"}</strong></div></div><div className="dc-backing-prompt"><span className="dc-panel-label">CHOOSE YOUR BACKING</span><h2>{zh ? "你想推動多少？" : "How much do you want to move?"}</h2><p>{zh ? "選擇一筆 compute，立即看到它讓這個 Release 往前多少。" : "Choose an amount and see how far it moves this release."}</p></div></> : <><span className="dc-panel-label">COMPUTE COMMITTED</span><div className="dc-big-number">7,480 <small>/ 10,000</small></div><div className="dc-main-progress"><i style={{ width: "74.8%" }} /></div><div className="dc-funding-meta"><b>74.8% funded</b><span>128 backers</span><span>12 days left</span></div></>}
            <div className="dc-impact-preview">
              <span>{zh ? "你的影響力" : "Your impact"}</span>
              <strong>{zh ? `${amount.toLocaleString()} 算力，讓版本再往前一步` : `${amount.toLocaleString()} compute moves this release`}</strong>
              <div><b>74.8%</b><ArrowRight size={15} /><b>{after}%</b></div>
            </div>
            <div className="dc-amounts">
              {[250, 500, 1000].map((n) => <button key={n} className={amount === n ? "is-active" : ""} onClick={() => setAmount(n)}>{n.toLocaleString()}</button>)}
            </div>
            <button className="dc-back-button"><Zap size={17} /> {zh ? "贊助這個 Release" : "Back this release"}</button>
            <button className="dc-message-button"><MessageCircle size={16} /> {zh ? "贊助並留下訊息" : "Back & leave a message"}</button>
            <p className="dc-fineprint"><ShieldCheck size={13} /> {zh ? "目前為展示算力；達標後才會開始執行。" : "Demo compute credits · execution begins only when fully funded."}</p>
          </aside>
        </section>

        {concept.key === "hybrid" ? <HybridCampaignStory zh={zh} amount={amount} contribution={contribution} after={after} /> : <>
        <nav className="dc-story-nav"><a href="#what">What it is</a><a href="#why">Why it matters</a><a href="#challenge">The challenge</a><a href="#plan">AI plan</a><a href="#community">Community</a></nav>

        <section id="what" className="dc-story-section dc-what">
          <div className="dc-story-intro"><span className="dc-index">01</span><div><span className="dc-eyebrow">WHAT IS WHISPERX?</span><h2>{zh ? "它讓字幕，精準跟上每一句話的節奏。" : "The timing layer behind subtitles people actually want to watch."}</h2></div></div>
          <div className="dc-story-body"><p className="dc-story-lead">{zh ? "WhisperX 把原始語音轉成與時間軸精準對齊的文字。Podcast 剪輯者、教育工作者與影音團隊，都用它產生準確字幕，不必再逐句手動校正。" : "WhisperX turns raw speech into time-aligned words. Podcast editors, educators and video teams use it to make accurate subtitles without aligning every sentence by hand."}</p><div className="dc-stat-trio"><article><strong>18.4k</strong><span>GitHub stars</span></article><article><strong>1.2m</strong><span>monthly downloads</span></article><article><strong>42</strong><span>languages supported</span></article></div></div>
        </section>

        <section id="why" className="dc-story-section dc-why">
          <div className="dc-story-intro"><span className="dc-index">02</span><div><span className="dc-eyebrow">WHY IT MATTERS</span><h2>{zh ? "它藏在產品背後，卻讓成千上萬個故事被看懂。" : "One invisible dependency. Thousands of visible stories."}</h2></div></div>
          <div className="dc-use-cases"><article><span>01</span><h3>{zh ? "內容創作者" : "Creators"}</h3><p>{zh ? "不用花數小時手動對時，也能發布精準的多語字幕。" : "Publish accurate multilingual captions without hours of manual timing."}</p></article><article><span>02</span><h3>{zh ? "教育工作者" : "Education"}</h3><p>{zh ? "讓課程內容可以被搜尋，也能跨語言被更多人理解。" : "Make lectures searchable and accessible across languages."}</p></article><article><span>03</span><h3>{zh ? "媒體團隊" : "Media teams"}</h3><p>{zh ? "把訪談快速轉成可編輯、可重複運用的逐字稿。" : "Turn interviews into editable, reusable transcripts at scale."}</p></article></div>
        </section>

        <section id="challenge" className="dc-story-section dc-challenge">
          <div className="dc-story-intro"><span className="dc-index">03</span><div><span className="dc-eyebrow">WHAT'S HOLDING IT BACK?</span><h2>{zh ? "需求一直都在，缺的是一筆能集中完成它的算力。" : "The demand is clear. The focused compute is missing."}</h2></div></div>
          <div className="dc-evidence-card">
            <div><strong>27</strong><span>{zh ? "社群需求" : "community requests"}</span></div><div><strong>12</strong><span>{zh ? "相關 Issues" : "related issues"}</span></div><div><strong>3</strong><span>{zh ? "Roadmap 提及" : "roadmap references"}</span></div>
            <p>{zh ? "社群持續提出中文斷句問題，但研究、實作與回歸測試，至今還沒有被整合成一個獲得完整資源支持的版本目標。" : "Chinese sentence boundaries are repeatedly requested, but research, implementation and regression testing have not yet been funded as one focused release."}</p>
            <div className="dc-sources"><SourceChip>Issue #923</SourceChip><SourceChip>Discussion #184</SourceChip><SourceChip>Roadmap Q3</SourceChip></div>
          </div>
        </section>

        <section id="plan" className="dc-story-section dc-plan">
          <div className="dc-story-intro"><span className="dc-index">04</span><div><span className="dc-eyebrow">GROUNDED AI PLAN</span><h2>{zh ? "這份計畫來自 repo，不是 AI 憑空想像。" : "A plan built from the repo—not invented around it."}</h2></div></div>
          <div className="dc-plan-grid">
            <div className="dc-plan-steps">
              {(zh ? [
                ["研究", "盤點社群回報的中文斷句案例", "1,000"],
                ["開發", "實作能辨識語言的句子分組", "5,000"],
                ["測試", "執行六種語言的回歸測試", "2,000"],
                ["審查緩衝", "回應維護者意見並完成修正", "2,000"],
              ] : [
                ["Research", "Audit reported Chinese boundary cases", "1,000"],
                ["Build", "Implement language-aware sentence grouping", "5,000"],
                ["Test", "Run regression suite across six languages", "2,000"],
                ["Review buffer", "Respond to maintainer feedback", "2,000"],
              ]).map(([name, copy, cost], i) => <article key={name}><span>{i + 1}</span><div><h3>{name}</h3><p>{copy}</p></div><b>{cost}</b></article>)}
            </div>
            <aside className="dc-trust-card"><ShieldCheck size={25} /><h3>{zh ? "為什麼值得相信？" : "Why trust this plan?"}</h3><p>{zh ? "每個里程碑都能回到 repo 找到依據，並且必須經過維護者審查。" : "Every milestone links back to repository evidence and stays subject to maintainer review."}</p><ul><li><Check size={14} /> {zh ? "已分析 16 份來源" : "16 sources analyzed"}</li><li><Check size={14} /> {zh ? "範圍經 Owner 調整" : "Scope edited by owner"}</li><li><Check size={14} /> {zh ? "募資前先定義測試" : "Tests defined before funding"}</li></ul><a href="#sources">{zh ? "查看分析依據" : "View analysis evidence"} <ArrowRight size={14} /></a></aside>
          </div>
        </section>

        <section id="community" className="dc-story-section dc-community">
          <div className="dc-story-intro"><span className="dc-index">05</span><div><span className="dc-eyebrow">MAKE IT HAPPEN TOGETHER</span><h2>128 people are already behind this release.</h2></div></div>
          <div className="dc-community-grid">
            {["I use WhisperX every week—excited to see Chinese support improve.", "Backing this for our course creators in Taiwan.", "This is exactly what unused tokens should be doing."].map((message, i) => <article key={message}><div><span className="dc-avatar">{["AL", "YC", "MK"][i]}</span><span><b>{["Alex Lin", "Yun Chen", "Mika K."][i]}</b><small>backed {["1,000", "500", "250"][i]} compute</small></span></div><p>“{message}”</p><button><Heart size={14} /> {[18, 12, 9][i]}</button></article>)}
          </div>
        </section>
        </>}
      </main>
      <footer className="dc-footer"><Brand /><span>{zh ? "Campaign 概念展示 · 所有數據與人物皆為示意" : "Campaign concept · all metrics and identities are demo data"}</span></footer>
    </div>
  );
}

export default function DesignConcept() {
  const { concept: rawConcept, "*": tail } = useParams();
  const concept = useMemo(() => CONCEPTS.find((c) => c.key === rawConcept) ?? CONCEPTS[0], [rawConcept]);
  const isCampaign = tail === "campaign";
  return <div className={`dc-root dc-${concept.key}`}>{isCampaign ? <CampaignConcept concept={concept} /> : <HomeConcept concept={concept} />}</div>;
}

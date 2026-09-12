import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  FlaskConical,
  Github,
  Inbox,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useI18n, type TKey } from "../i18n/index.js";
import { useApp } from "../state/AppContext.js";
import {
  isCurrentAnalyzeRequest,
  type MissionSource,
} from "../lib/analysisRequests.js";
import { api } from "../lib/api.js";
import { apiErrorText } from "../lib/errors.js";
import { demoTourRole, publishDemoTour } from "../lib/demoTour.js";
import { fmtCompact, fmtInt, fmtPct } from "../lib/format.js";
import { licenseLabel } from "../lib/license.js";
import {
  Btn,
  Card,
  Credits,
  EmptyState,
  GeneratorBadge,
  HealthRing,
  RiskBadge,
  Skeleton,
} from "../components/ui.js";
import type {
  AnalyzedIssue,
  CampaignDraft,
  CampaignCritiqueResult,
  IssueAssistantResult,
  L10n,
  Locale,
  MissionWithProject,
  RepoAnalysis,
} from "../../shared/types.js";

type Step = 1 | 2 | 3 | 4;
type Source = MissionSource;

const STEP_KEYS: readonly TKey[] = ["wiz.step1", "wiz.step2", "wiz.step3", "wiz.step4"];

/**
 * Short labels for the feasibility signals. Kept client-side on purpose: the
 * server publishes stable machine keys plus the quoted evidence, and the UI owns
 * the wording — the same split as everywhere else in this codebase.
 */
const SIGNAL_LABELS: Record<string, { en: string; "zh-TW": string }> = {
  expected_vs_actual: { en: "expected vs actual", "zh-TW": "有預期/實際對比" },
  reproduction: { en: "repro steps", "zh-TW": "有重現步驟" },
  code_sample: { en: "code sample", "zh-TW": "有程式碼範例" },
  concrete_values: { en: "concrete values", "zh-TW": "有具體數值" },
  error_text: { en: "quoted error", "zh-TW": "引用了錯誤訊息" },
  single_surface: { en: "single surface", "zh-TW": "單一程式面" },
  design_question: { en: "asks for a decision", "zh-TW": "在徵求決策" },
  breaking_change: { en: "breaking change", "zh-TW": "破壞性變更" },
  epic_scope: { en: "umbrella scope", "zh-TW": "傘狀範圍" },
  cross_repo: { en: "cross-repo", "zh-TW": "跨程式庫" },
  environment_specific: { en: "env-specific", "zh-TW": "環境相關" },
  needs_credentials: { en: "needs services", "zh-TW": "需外部服務" },
  no_detail: { en: "too little detail", "zh-TW": "細節不足" },
};

function signalLabel(key: string, locale: "en" | "zh-TW"): string {
  if (key.startsWith("label:")) return key.slice(6);
  return SIGNAL_LABELS[key]?.[locale] ?? key;
}

/**
 * Three neutral steps of ONE hue, deliberately.
 *
 * These used to borrow `verif` (the token for verification PASSED) and `danger`.
 * Those tokens carry certainty earned by a different, much stronger claim — an
 * engine-run test suite. Painting a 42%-automatable band red, or a 79% band in
 * the same green as a green test suite, imports confidence this heuristic has not
 * earned. Measured band rates are 79% / 64% / 54% against a 65% base rate, which
 * is a gradient, not a verdict — so the styling is a gradient too.
 */
const FEASIBILITY_STYLES: Record<AnalyzedIssue["feasibility"]["level"], string> = {
  high: "border-fund/40 bg-fund/10 text-fund",
  medium: "border-line bg-bg3 text-mut",
  low: "border-line bg-bg2 text-dim",
};

// ── stepper header ───────────────────────────────────────────────────────────

function Stepper({ step }: { step: Step }) {
  const { t } = useI18n();
  return (
    <ol className="mb-10 flex items-center">
      {STEP_KEYS.map((key, i) => {
        const n = (i + 1) as Step;
        const done = n < step;
        const current = n === step;
        return (
          <li key={key} className={`flex items-center ${i > 0 ? "flex-1" : ""}`}>
            {i > 0 && (
              <span className={`mx-3 h-px flex-1 transition-colors ${step >= n ? "bg-verif/40" : "bg-line"}`} />
            )}
            <span className="flex items-center gap-2" aria-current={current ? "step" : undefined}>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold transition-colors ${
                  done
                    ? "border-verif/50 bg-verif/10 text-verif"
                    : current
                      ? "border-fund bg-fund/10 text-fund"
                      : "border-line2 text-dim"
                }`}
              >
                {done ? <Check size={13} strokeWidth={3} /> : n}
              </span>
              <span
                className={`hidden text-sm font-semibold sm:inline ${
                  done ? "text-verif" : current ? "text-fund" : "text-dim"
                }`}
              >
                {t(key)}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ── which generator will write the campaign ─────────────────────────────────

function GeneratorNote({ real }: { real: boolean }) {
  const { t } = useI18n();
  return real ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dev/30 bg-dev/5 px-2.5 py-1 text-[14px] font-semibold text-dev">
      <Sparkles size={12} /> {t("wiz.generate.real")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn/5 px-2.5 py-1 text-[14px] font-semibold text-warn">
      <FlaskConical size={12} /> {t("wiz.generate.demo")}
    </span>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function NewMission() {
  const { t, lt, locale } = useI18n();
  const { boot, pushToast } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const guidedRole = demoTourRole(`?${searchParams.toString()}`);
  const maintainerDemo = guidedRole === "maintainer";

  const [step, setStep] = useState<Step>(1);

  // step 1 — repository source
  const [source, setSource] = useState<Source>("fixture");
  const [githubUrl, setGithubUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const analyzeRequestToken = useRef(0);
  const sourceRef = useRef<Source>("fixture");

  // step 2 — analysis + issue selection
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [issueId, setIssueId] = useState<string | null>(null);
  const [assistant, setAssistant] = useState<IssueAssistantResult | null>(null);
  const [assisting, setAssisting] = useState(false);

  // step 3 — generated campaign draft
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [critique, setCritique] = useState<CampaignCritiqueResult | null>(null);
  const [critiquing, setCritiquing] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<Locale>(locale);

  // step 4 — publish
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [created, setCreated] = useState<MissionWithProject | null>(null);

  // Guard: boot not loaded yet -> assume demo generator.
  const llmReal = boot?.execution.llmValidated === true;

  /** Preview-only L10n resolver — honours the local en/中文 toggle, not the app locale. */
  const plt = (v: L10n | undefined): string =>
    v === undefined ? "" : typeof v === "string" ? v : v[previewLocale];

  const canAnalyze = !analyzing && (source === "fixture" || githubUrl.trim().length > 0);

  const runAnalyze = async () => {
    if (!canAnalyze) return;
    const requestToken = ++analyzeRequestToken.current;
    const requestSource = source;
    const isCurrentRequest = () =>
      isCurrentAnalyzeRequest(requestToken, requestSource, analyzeRequestToken.current, sourceRef.current);

    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await api.analyze(requestSource, requestSource === "github" ? githubUrl.trim() : undefined);
      if (!isCurrentRequest()) return;
      setAnalysis(res.analysis);
      setIssueId(null);
      setAssistant(null);
      setStep(2);
    } catch (e) {
      if (!isCurrentRequest()) return;
      setAnalyzeError(apiErrorText(e, t));
    } finally {
      if (isCurrentRequest()) setAnalyzing(false);
    }
  };

  const invalidateAnalyzeRequest = () => {
    analyzeRequestToken.current += 1;
    setAnalyzing(false);
    setAnalyzeError(null);
    setAnalysis(null);
    setIssueId(null);
    setAssistant(null);
  };

  const selectSource = (nextSource: Source) => {
    if (sourceRef.current === nextSource) return;

    // The request itself may not be abortable, but its result must become inert
    // as soon as the user chooses a different repository source.
    sourceRef.current = nextSource;
    setSource(nextSource);
    invalidateAnalyzeRequest();
  };

  const updateGithubUrl = (nextUrl: string) => {
    setGithubUrl(nextUrl);
    // A GitHub URL is part of the request identity. Even though the broad source
    // remains "github", a response for the previous repository is now stale.
    invalidateAnalyzeRequest();
  };

  const runGenerate = useCallback(async (a: RepoAnalysis, issue: string) => {
    setGenerating(true);
    setGenerateError(null);
    setDraft(null);
    try {
      const res = await api.generateCampaign(a, issue); // mode omitted — the server picks
      setDraft(res.draft);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, []);

  const regenerate = () => {
    if (analysis && issueId) void runGenerate(analysis, issueId);
  };

  const runAssist = async () => {
    if (!analysis || !issueId) return;
    setAssisting(true);
    try { setAssistant((await api.assistIssue(analysis, issueId)).assistant); }
    catch (e) { pushToast({ kind: "error", message: apiErrorText(e, t) }); }
    finally { setAssisting(false); }
  };

  const runCritique = async () => {
    if (!analysis || !draft) return;
    setCritiquing(true);
    try { setCritique((await api.critiqueCampaign(analysis, draft)).critique); }
    catch (e) { pushToast({ kind: "error", message: apiErrorText(e, t) }); }
    finally { setCritiquing(false); }
  };

  const scoreAssistant = async (traceId: string | undefined, feature: string, helpful: boolean) => {
    if (!traceId) return;
    try { await api.aiFeedback(traceId, feature, helpful); pushToast({ kind: "info", message: t("ai.feedback.recorded") }); }
    catch (e) { pushToast({ kind: "error", message: apiErrorText(e, t) }); }
  };

  const goGenerate = () => {
    if (!analysis || !issueId) return;
    setStep(3);
    void runGenerate(analysis, issueId);
  };

  const runPublish = useCallback(async (a: RepoAnalysis, d: CampaignDraft) => {
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await api.createMission(a, d);
      setCreated(res.mission);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : String(e));
    } finally {
      setPublishing(false);
    }
  }, []);

  const retryPublish = () => {
    if (analysis && draft) void runPublish(analysis, draft);
  };

  const goPublish = () => {
    if (!analysis || !draft) return;
    setStep(4);
    void runPublish(analysis, draft);
  };

  // The guide points at the next real control. It never clicks for the user:
  // state only advances after the control's normal handler succeeds.
  useEffect(() => {
    if (!maintainerDemo) return;
    const point = (stepNumber: number, title: string, detail: string, selector?: string, state: "running" | "waiting" = "waiting") =>
      publishDemoTour({ role: "maintainer", step: stepNumber, total: 5, title, detail, state, anchorSelector: selector });

    if (analyzeError || generateError || publishError) {
      publishDemoTour({
        role: "maintainer",
        step: Math.min(step, 4),
        total: 5,
        title: t("common.error"),
        detail: analyzeError ?? generateError ?? publishError ?? t("common.requestFailed"),
        state: "error",
      });
    } else if (analyzing || generating || publishing) {
      point(Math.min(step, 4), t("demo.guide.wait"), t("demo.guide.wait.body"), undefined, "running");
    } else if (step === 1 && !analyzing) {
      point(1, t("demo.guide.analyze"), t("demo.guide.analyze.body"), '[data-demo-action="analyze"]');
    } else if (step === 2 && analysis && issueId === null) {
      point(2, t("demo.guide.issue"), t("demo.guide.issue.body"), '[data-demo-action="issue"]');
    } else if (step === 2 && issueId !== null) {
      point(3, t("demo.guide.generate"), t("demo.guide.generate.body"), '[data-demo-action="generate"]');
    } else if (step === 3 && draft && !generating) {
      point(4, t("demo.guide.publish"), t("demo.guide.publish.body"), '[data-demo-action="publish"]');
    } else if (step === 4 && created && !publishing) {
      point(5, t("demo.guide.open"), t("demo.guide.open.body"), '[data-demo-action="open-mission"]');
    }
  }, [
    analysis,
    analyzeError,
    analyzing,
    maintainerDemo,
    created,
    draft,
    generateError,
    generating,
    issueId,
    publishError,
    publishing,
    step,
    t,
  ]);

  // Facts for step 2. Every entry is conditional: `undefined` means the analysis
  // did not measure it, and rendering a 0 there would be a false measurement
  // claim (the GitHub path reported "0 files / 0 lines of code" for years).
  const facts: { label: string; value: string }[] = analysis
    ? [
        ...(analysis.files !== undefined
          ? [{ label: t("wiz.analysis.files"), value: fmtInt(analysis.files, locale) }]
          : []),
        ...(analysis.linesOfCode !== undefined
          ? [{ label: t("wiz.analysis.loc"), value: fmtInt(analysis.linesOfCode, locale) }]
          : []),
        ...(analysis.testFiles !== undefined
          ? [{ label: t("wiz.analysis.tests"), value: fmtInt(analysis.testFiles, locale) }]
          : []),
        ...(analysis.language ? [{ label: t("common.language"), value: analysis.language }] : []),
        ...(licenseLabel(analysis.license, locale)
          ? [{ label: t("common.license"), value: licenseLabel(analysis.license, locale)! }]
          : []),
        ...(analysis.stars !== undefined
          ? [{ label: t("common.stars"), value: fmtCompact(analysis.stars, locale) }]
          : []),
        ...(analysis.weeklyDownloads !== undefined
          ? [{ label: t("common.weeklyDownloads"), value: fmtCompact(analysis.weeklyDownloads, locale) }]
          : []),
        ...(analysis.dependents !== undefined
          ? [{ label: t("common.dependents"), value: fmtCompact(analysis.dependents, locale) }]
          : []),
      ]
    : [];

  const storySections: { key: TKey; value: L10n }[] = draft
    ? [
        { key: "msn.story.what", value: draft.story.what },
        { key: "msn.story.why", value: draft.story.why },
        { key: "msn.story.who", value: draft.story.whoBenefits },
        { key: "msn.story.approach", value: draft.story.approach },
      ]
    : [];

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <Stepper step={step} />

      {/* ── STEP 1 · repository ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight">{t("wiz.title")}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-mut">{t("wiz.sub")}</p>
          </div>

          <fieldset>
            <legend className="sr-only">{t("wiz.step1")}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  {
                    key: "fixture" as Source,
                    icon: <Package size={18} />,
                    title: t("wiz.source.fixture"),
                    desc: t("wiz.source.fixture.desc"),
                  },
                  {
                    key: "github" as Source,
                    icon: <Github size={18} />,
                    title: t("wiz.source.github"),
                    desc: t("wiz.source.github.desc"),
                  },
                ] as const
              ).map((opt) => {
                const selected = source === opt.key;
                const inputId = `mission-source-${opt.key}`;
                return (
                  <div key={opt.key} className="relative">
                    <input
                      id={inputId}
                      type="radio"
                      name="mission-source"
                      value={opt.key}
                      checked={selected}
                      onChange={() => selectSource(opt.key)}
                      className="peer sr-only"
                    />
                    <label
                      htmlFor={inputId}
                      className={`block h-full cursor-pointer rounded-xl border p-4 text-left transition-all peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fund ${
                        selected ? "border-fund bg-fund/5" : "border-line bg-bg1 hover:border-line2 hover:bg-bg2"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            selected ? "bg-fund/15 text-fund" : "bg-bg3 text-mut"
                          }`}
                        >
                          {opt.icon}
                        </span>
                        <span className="flex-1 text-sm font-bold text-ink">{opt.title}</span>
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            selected ? "border-fund" : "border-line2"
                          }`}
                        >
                          {selected && <span className="h-2 w-2 rounded-full bg-fund" />}
                        </span>
                      </span>
                      <span className="mt-2.5 block text-xs leading-relaxed text-dim">{opt.desc}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </fieldset>

          {source === "github" && (
            <div className="cc-event-in">
              <label htmlFor="github-repository" className="mb-1.5 block text-xs font-semibold text-mut">
                {t("wiz.github.label")}
              </label>
              <input
                id="github-repository"
                type="url"
                value={githubUrl}
                onChange={(e) => updateGithubUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void runAnalyze();
                }}
                placeholder={t("wiz.github.placeholder")}
                className="w-full rounded-lg border border-line2 bg-bg0 px-3 py-2 font-mono text-sm outline-none placeholder:text-dim focus:border-fund"
              />
            </div>
          )}

          {analyzeError !== null && !analyzing && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-danger">
              <p className="text-sm font-semibold">
                {source === "github" ? t("wiz.error.github") : t("common.error")}
              </p>
              <p className="mt-0.5 font-mono text-xs opacity-80">{analyzeError}</p>
            </div>
          )}

          {analyzing && (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-mut">
                <Loader2 size={15} className="animate-spin text-fund" />
                {t("wiz.analyzing")}
              </div>
              <div className="mt-4 space-y-2.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </Card>
          )}

          <div className="flex justify-end">
            <Btn data-demo-action="analyze" onClick={() => void runAnalyze()} disabled={!canAnalyze}>
              {analyzing && <Loader2 size={14} className="animate-spin" />}
              {t("wiz.analyze")} <ArrowRight size={15} />
            </Btn>
          </div>
        </div>
      )}

      {/* ── STEP 2 · analysis ───────────────────────────────────────────── */}
      {step === 2 && analysis && (
        <div className="cc-event-in space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-lg font-bold text-ink">{analysis.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-mut">{analysis.description}</p>
                <p className="mt-1.5 truncate font-mono text-[14px] text-dim">{analysis.repoUrl}</p>
              </div>
              <div className="flex min-w-0 max-w-full items-center gap-3">
                {analysis.healthScore !== undefined && <HealthRing score={analysis.healthScore} size={52} />}
                <div>
                  <p className="text-xs font-semibold text-mut">{t("wiz.analysis.health")}</p>
                  <ul className="mt-1 space-y-0.5">
                    {analysis.healthNotes.map((n, i) => (
                      <li key={i} className="text-[14px] leading-snug text-dim">
                        · {lt(n)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label}>
                  <p className="font-mono text-lg font-bold text-ink">{f.value}</p>
                  <p className="mt-0.5 text-[14px] text-dim">{f.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <div>
            <h2 id="mission-issues-heading" className="mb-3 text-lg font-bold tracking-tight">
              {t("wiz.analysis.issues")}
            </h2>
            {analysis.issues.length === 0 && (
              <EmptyState
                icon={<Inbox size={28} />}
                title={t("wiz.noIssues")}
                sub={t("wiz.noIssues.sub")}
              />
            )}
            <fieldset aria-labelledby="mission-issues-heading" className="space-y-3">
              {analysis.issues.map((issue, issueIndex) => {
                const selected = issueId === issue.id;
                const inputId = `mission-issue-${issueIndex}`;
                return (
                  <div key={issue.id} className="relative">
                    <input
                      id={inputId}
                      type="radio"
                      name="mission-issue"
                      value={issue.id}
                      checked={selected}
                      onChange={() => { setIssueId(issue.id); setAssistant(null); }}
                      className="peer sr-only"
                    />
                    <label
                      htmlFor={inputId}
                      data-demo-action={issueIndex === 0 ? "issue" : undefined}
                      className={`block w-full cursor-pointer rounded-xl border p-4 text-left transition-all peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fund ${
                        selected ? "border-fund bg-fund/5" : "border-line bg-bg1 hover:border-line2 hover:bg-bg2"
                      }`}
                    >
                    <span className="flex flex-wrap items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="font-mono text-[14px] text-dim">{issue.id}</span>
                          <span className="text-sm font-bold text-ink">{issue.title}</span>
                        </span>
                        {issue.labels.length > 0 && (
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {issue.labels.map((l) => (
                              <span key={l} className="rounded bg-bg3 px-1.5 py-0.5 font-mono text-[14px] text-mut">
                                {l}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 text-[14px] font-medium ${FEASIBILITY_STYLES[issue.feasibility.level]}`}
                      >
                        {issue.feasibility.needsHuman && <AlertTriangle size={10} />}
                        {t(`wiz.feasibility.${issue.feasibility.level}` as TKey)}
                      </span>
                    </span>
                    <span className="mt-2 line-clamp-2 block text-xs leading-relaxed text-dim">{issue.body}</span>
                    {/* The signals that produced the score. Showing the reasoning
                        is the whole point: this replaced a hardcoded constant that
                        was labelled an "AI feasibility read", and a number nobody
                        can audit would be no better than the constant was. */}
                    {/* The score never appears without what it refers to. A bare
                        "79" is meaningless; "79% of issues that looked like this,
                        vs 65% of all issues" is a claim a reader can weigh. */}
                    {Number.isFinite(issue.feasibility.calibration.bandPrecision) && <span className="mt-1.5 block text-[14px] leading-relaxed text-dim">
                      {t("wiz.feasibility.calib", {
                        band: `${Math.round(issue.feasibility.calibration.bandPrecision * 100)}%`,
                        base: `${Math.round(issue.feasibility.calibration.baseRate * 100)}%`,
                      })}
                    </span>}
                    {/* Always visible, not hidden in a tooltip. */}
                    <span className="mt-1 block text-[14px] italic text-dim">
                      {t("wiz.feasibility.heuristicNote")}
                    </span>
                    {issue.feasibility.signals.length > 0 && (
                      <span className="mt-2 block">
                        <span className="mb-1 block text-[14px] text-dim">
                          {t("wiz.feasibility.why")}
                        </span>
                        <span className="flex flex-wrap gap-1">
                          {issue.feasibility.signals.slice(0, 4).map((sig) => (
                            <span
                              key={sig.key}
                              title={sig.evidence}
                              className={`rounded px-1.5 py-0.5 font-mono text-[14px] ${
                                sig.direction === "up"
                                  ? "bg-verif/10 text-verif"
                                  : "bg-danger/10 text-danger"
                              }`}
                            >
                              {sig.direction === "up" ? "+" : "−"}
                              {sig.weight} {signalLabel(sig.key, locale)}
                            </span>
                          ))}
                        </span>
                      </span>
                    )}
                    {issue.feasibility.observations.length > 0 && (
                      <span className="mt-2 block">
                        <span className="mb-1 block text-[14px] text-dim">
                          {t("wiz.feasibility.alsoNoticed")}
                        </span>
                        <span className="block text-[14px] leading-relaxed text-dim">
                          {issue.feasibility.observations.map((o) => o.key.replace(/_/g, " ")).join(" · ")}
                        </span>
                      </span>
                    )}
                    </label>
                  </div>
                );
              })}
            </fieldset>
          </div>

          {issueId && (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold">{t("wiz.assistant.title")}</h3>
                  <p className="mt-1 text-xs text-dim">{t("wiz.assistant.boundary")}</p>
                </div>
                <Btn kind="ghost" onClick={() => void runAssist()} disabled={assisting}>
                  {assisting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {t("wiz.assistant.run")}
                </Btn>
              </div>
              {assistant && (
                <div className="mt-4 border-t border-line pt-4">
                  <div className="flex flex-wrap gap-2 text-[14px] font-mono text-dim">
                    <span>{assistant.evidence.generator}</span><span>{assistant.evidence.promptKey}@{assistant.evidence.promptVersion}</span><span>{assistant.evidence.variant}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-mut">{lt(assistant.triage.summary)}</p>
                  <p className="mt-3 text-xs font-semibold text-dim">{t("wiz.assistant.criteria")}</p>
                  <ul className="mt-2 space-y-2">
                    {assistant.criteria.map((criterion, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-mut"><Circle size={12} className="mt-1 shrink-0 text-fund" /><span>{lt(criterion.text)}{criterion.needsMaintainerDecision ? ` · ${t("wiz.assistant.decision")}` : ""}</span></li>
                    ))}
                  </ul>
                  {assistant.evidence.traceId && <div className="mt-3 flex items-center gap-2 text-xs text-dim"><span>{t("ai.feedback.question")}</span><button type="button" onClick={() => void scoreAssistant(assistant.evidence.traceId, "issue-triage", true)} aria-label={t("ai.feedback.yes")} className="cursor-pointer rounded p-1 hover:bg-bg3"><ThumbsUp size={13} /></button><button type="button" onClick={() => void scoreAssistant(assistant.evidence.traceId, "issue-triage", false)} aria-label={t("ai.feedback.no")} className="cursor-pointer rounded p-1 hover:bg-bg3"><ThumbsDown size={13} /></button></div>}
                </div>
              )}
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Btn kind="ghost" onClick={() => setStep(1)}>
              <ArrowLeft size={15} /> {t("common.back")}
            </Btn>
            <span className="ml-auto">
              <GeneratorNote real={llmReal} />
            </span>
            <Btn data-demo-action="generate" onClick={goGenerate} disabled={!issueId}>
              {t("wiz.generate")} <ArrowRight size={15} />
            </Btn>
          </div>
        </div>
      )}

      {/* ── STEP 3 · campaign draft ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          {generating ? (
            <Card className="p-6">
              <div className="flex items-center gap-2 text-sm text-mut">
                <Loader2 size={15} className="animate-spin text-dev" />
                {t("wiz.generating")}
              </div>
              <div className="mt-5 space-y-3">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-14 w-3/4" />
              </div>
            </Card>
          ) : generateError !== null ? (
            <Card className="p-6">
              <p className="text-sm font-semibold text-danger">{t("common.error")}</p>
              <p className="mt-1 font-mono text-xs text-mut">{generateError}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn kind="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft size={15} /> {t("common.back")}
                </Btn>
                <Btn onClick={regenerate}>
                  <RefreshCw size={14} /> {t("common.retry")}
                </Btn>
              </div>
            </Card>
          ) : draft ? (
            <>
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-sm font-bold">{t("wiz.critic.title")}</h3><p className="mt-1 text-xs text-dim">{t("wiz.critic.boundary")}</p></div>
                  <Btn kind="ghost" onClick={() => void runCritique()} disabled={critiquing}>
                    {critiquing ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}{t("wiz.critic.run")}
                  </Btn>
                </div>
                {critique && (
                  <div className="mt-4 border-t border-line pt-4">
                    <div className="flex flex-wrap gap-2 text-[14px] font-mono text-dim"><span>{critique.evidence.generator}</span><span>{critique.evidence.promptKey}@{critique.evidence.promptVersion}</span><span>{critique.evidence.variant}</span></div>
                    <div className="mt-3 flex flex-wrap gap-2">{(["grounding", "actionability", "bilingualParity"] as const).map((key) => <span key={key} className={`rounded border px-2 py-1 text-xs ${critique[key] === "pass" ? "border-verif/30 text-verif" : "border-warn/30 text-warn"}`}>{key === "grounding" ? t("wiz.critic.grounding") : key === "actionability" ? t("wiz.critic.actionability") : t("wiz.critic.bilingualParity")} · {critique[key]}</span>)}</div>
                    {critique.findings.length > 0 && <ul className="mt-3 space-y-1 text-sm text-mut">{critique.findings.map((finding, i) => <li key={i}>· {lt(finding)}</li>)}</ul>}
                    {critique.evidence.traceId && <div className="mt-3 flex items-center gap-2 text-xs text-dim"><span>{t("ai.feedback.question")}</span><button type="button" onClick={() => void scoreAssistant(critique.evidence.traceId, "campaign-critic", true)} aria-label={t("ai.feedback.yes")} className="cursor-pointer rounded p-1 hover:bg-bg3"><ThumbsUp size={13} /></button><button type="button" onClick={() => void scoreAssistant(critique.evidence.traceId, "campaign-critic", false)} aria-label={t("ai.feedback.no")} className="cursor-pointer rounded p-1 hover:bg-bg3"><ThumbsDown size={13} /></button></div>}
                  </div>
                )}
              </Card>
              <Card className="cc-event-in p-6">
                {/* trust header + bilingual preview toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <GeneratorBadge generator={draft.generator} />
                  <div className="inline-flex items-center rounded-lg border border-line2 bg-bg2 p-0.5">
                    {(["en", "zh-TW"] as const).map((pl) => (
                      <button
                        key={pl}
                        type="button"
                        onClick={() => setPreviewLocale(pl)}
                        aria-pressed={previewLocale === pl}
                        className={`cursor-pointer rounded-md px-2.5 py-1 text-[14px] font-bold transition-colors ${
                          previewLocale === pl ? "bg-bg3 text-ink" : "text-dim hover:text-mut"
                        }`}
                      >
                        {pl === "en" ? "EN" : "中文"}
                      </button>
                    ))}
                  </div>
                </div>

                {draft.evidence && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-bg2 px-3 py-2">
                    <span className="text-[14px] font-semibold text-mut">{t("wiz.evidence")}</span>
                    <span className="font-mono text-[14px] text-dim">
                      {t("wiz.evidence.model")} {draft.evidence.model}
                    </span>
                    <span className="font-mono text-[14px] text-dim">
                      {t("wiz.evidence.latency")} {fmtInt(draft.evidence.latencyMs, locale)}ms
                    </span>
                    <span className="font-mono text-[14px] text-dim">
                      {fmtInt(draft.evidence.inputTokens, locale)}+{fmtInt(draft.evidence.outputTokens, locale)}{" "}
                      {t("wiz.evidence.tokens")}
                    </span>
                  </div>
                )}

                <h2 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight">{plt(draft.title)}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-mut">{plt(draft.tagline)}</p>

                {draft.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {draft.tags.map((tag) => (
                      <span key={tag} className="rounded bg-bg3 px-2 py-0.5 font-mono text-[14px] text-mut">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* story */}
                <div className="mt-6 grid gap-x-8 gap-y-5 border-t border-line pt-5 sm:grid-cols-2">
                  {storySections.map((s) => (
                    <div key={s.key}>
                      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-dim">{t(s.key)}</h3>
                      <p className="text-sm leading-relaxed text-mut">{plt(s.value)}</p>
                    </div>
                  ))}
                </div>

                {/* acceptance criteria (pending — nothing verified yet) */}
                <div className="mt-6 border-t border-line pt-5">
                  <h3 className="text-sm font-bold">{t("msn.criteria")}</h3>
                  <p className="mt-0.5 text-xs text-dim">{t("msn.criteria.sub")}</p>
                  <ul className="mt-3 space-y-2">
                    {draft.acceptanceCriteria.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-mut">
                        <Circle size={13} className="mt-0.5 shrink-0 text-dim" />
                        <span>{plt(c)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* milestones + risk */}
                <div className="mt-6 grid gap-6 border-t border-line pt-5 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-sm font-bold">{t("msn.milestones")}</h3>
                    <div className="space-y-2.5">
                      {draft.milestones.map((m, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-4 shrink-0 text-right font-mono text-[14px] text-dim">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-ink">{plt(m.title)}</span>
                          <span className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-bg3">
                            <span
                              className="cc-progress-bar block h-full rounded-full bg-fund"
                              style={{ width: fmtPct(m.share) }}
                            />
                          </span>
                          <span className="w-10 shrink-0 text-right font-mono text-xs text-fund">
                            {fmtPct(m.share)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-bold">{t("msn.risk")}</h3>
                    <RiskBadge level={draft.riskLevel} />
                    <ul className="mt-3 space-y-1.5">
                      {draft.riskFactors.map((r, i) => (
                        <li key={i} className="text-xs leading-relaxed text-dim">
                          · {plt(r)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* compute goal */}
                <div className="mt-6 border-t border-line pt-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-bold">{t("msn.goal")}</h3>
                    <Credits n={draft.computeGoal} className="text-lg font-bold text-ink" />
                  </div>
                  <p className="mt-2 text-[14px] font-semibold uppercase tracking-wide text-dim">
                    {t("wiz.computeRationale")}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-mut">{plt(draft.computeRationale)}</p>
                  {draft.computeEstimate && (
                    <div className="mt-4 rounded-xl border border-line bg-bg0 p-4">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-ink">{t("msn.estimate.title")}</p>
                          <p className="mt-1 text-[14px] text-dim">
                            {t("msn.estimate.range")} · {fmtInt(draft.computeEstimate.range.low, locale)}–{fmtInt(draft.computeEstimate.range.high, locale)} credits
                          </p>
                        </div>
                        <span className="rounded-full border border-line2 px-2.5 py-1 font-mono text-[14px] text-mut">
                          {draft.computeEstimate.confidence} {t("msn.estimate.confidence")}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-5">
                        {draft.computeEstimate.breakdown.map((item) => (
                          <div key={item.key} className="rounded-lg bg-bg2 px-3 py-2">
                            <p className="font-mono text-sm font-bold text-fund">{fmtInt(item.credits, locale)}</p>
                            <p className="mt-0.5 text-[14px] leading-snug text-dim">{plt(item.basis)}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[14px] text-dim">{t("msn.estimate.notBill")} · {draft.computeEstimate.method}</p>
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex flex-wrap items-center gap-3">
                <Btn kind="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft size={15} /> {t("common.back")}
                </Btn>
                <span className="ml-auto flex flex-wrap gap-2">
                  <Btn kind="ghost" onClick={regenerate}>
                    <RefreshCw size={14} /> {t("wiz.regenerate")}
                  </Btn>
                  <Btn data-demo-action="publish" onClick={goPublish}>
                    {t("wiz.publish")} <ArrowRight size={15} />
                  </Btn>
                </span>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── STEP 4 · publish ────────────────────────────────────────────── */}
      {step === 4 && (
        <div>
          {publishing ? (
            <Card className="flex flex-col items-center gap-3 p-12 text-center">
              <Loader2 size={22} className="animate-spin text-fund" />
              <p className="text-sm text-mut">{t("common.loading")}</p>
            </Card>
          ) : publishError !== null ? (
            <Card className="p-6">
              <p className="text-sm font-semibold text-danger">{t("common.error")}</p>
              <p className="mt-1 font-mono text-xs text-mut">{publishError}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn kind="ghost" onClick={() => setStep(3)}>
                  <ArrowLeft size={15} /> {t("common.back")}
                </Btn>
                <Btn onClick={retryPublish}>
                  <RefreshCw size={14} /> {t("common.retry")}
                </Btn>
              </div>
            </Card>
          ) : created ? (
            <div className="cc-toast-in flex flex-col items-center gap-4 py-14 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-verif/40 bg-verif/10 text-verif">
                <Check size={30} strokeWidth={3} />
              </span>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">{t("wiz.published")}</h2>
                <p className="mt-2 text-[15px] text-mut">{lt(created.title)}</p>
              </div>
              <GeneratorBadge generator={created.generator} />
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <Btn
                  data-demo-action="open-mission"
                  onClick={() => navigate(`/missions/${created.id}${maintainerDemo ? "?demo=maintainer" : ""}`)}
                >
                  {t("msn.pledge.cta")} <ArrowRight size={15} />
                </Btn>
                <Btn kind="ghost" onClick={() => navigate("/")}>
                  {t("nav.marketplace")}
                </Btn>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

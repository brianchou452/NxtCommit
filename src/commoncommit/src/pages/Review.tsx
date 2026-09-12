import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  FileDiff,
  GitBranch,
  GitPullRequest,
  PackageCheck,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  X,
} from "lucide-react";
import { useI18n, type TKey } from "../i18n/index.js";
import { useApp } from "../state/AppContext.js";
import { apiErrorText } from "../lib/errors.js";
import { api } from "../lib/api.js";
import { demoTourRole, publishDemoTour } from "../lib/demoTour.js";
import { fmtInt, timeAgo } from "../lib/format.js";
import {
  Avatar,
  Btn,
  Card,
  Credits,
  EmptyState,
  ModeBadge,
  Skeleton,
  SourceBadge,
  StatusPill,
} from "../components/ui.js";
import type {
  ArtifactFile,
  EvidenceExplanationResult,
  LedgerEntry,
  MissionDetail,
  MissionStatus,
  ShadowReviewResult,
} from "../../shared/types.js";

const REVIEWABLE: MissionStatus[] = ["needs_review", "changes_requested", "approved", "released"];

const KIND_STYLES: Record<ArtifactFile["kind"], string> = {
  add: "border-verif/30 bg-verif/5 text-verif",
  modify: "border-dev/30 bg-dev/5 text-dev",
  delete: "border-danger/30 bg-danger/5 text-danger",
};

function diffLineCls(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "text-mut";
  if (line.startsWith("+")) return "cc-diff-add";
  if (line.startsWith("-")) return "cc-diff-del";
  if (line.startsWith("@@")) return "cc-diff-hunk";
  return "text-mut";
}

function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function PanelTitle({
  icon,
  title,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="inline-flex items-center gap-2 text-sm font-bold tracking-tight">
        <span className="text-dim">{icon}</span>
        {title}
      </h2>
      {right}
    </div>
  );
}

function DiffFile({ file, defaultOpen }: { file: ArtifactFile; defaultOpen: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-1 py-2.5 text-left transition-colors hover:bg-bg2"
      >
        {open ? (
          <ChevronDown size={14} className="shrink-0 text-dim" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-dim" />
        )}
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink">{file.path}</code>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${KIND_STYLES[file.kind]}`}
        >
          {t(`file.kind.${file.kind}` as TKey)}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-verif">+{file.additions}</span>
        <span className="shrink-0 font-mono text-[11px] text-danger">−{file.deletions}</span>
      </button>
      {open && (
        <pre className="cc-event-in mb-2 max-h-96 overflow-auto rounded-lg border border-line bg-bg0 p-3 text-xs font-mono leading-relaxed">
          {file.patch.split("\n").map((line, i) => (
            <span key={i} className={`block px-1 ${diffLineCls(line)}`}>
              {line.length > 0 ? line : " "}
            </span>
          ))}
        </pre>
      )}
    </div>
  );
}

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const providerDemo = demoTourRole(`?${searchParams.toString()}`) === "provider";
  const { t, lt, locale } = useI18n();
  const { pushToast, boot } = useApp();

  const [data, setData] = useState<MissionDetail | null>(null);
  const [error, setError] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState<"explain" | "shadow" | null>(null);
  const [explanation, setExplanation] = useState<EvidenceExplanationResult | null>(null);
  const [shadow, setShadow] = useState<ShadowReviewResult | null>(null);
  const loadRequest = useRef(0);
  const actionRequest = useRef(0);
  const navigationTimer = useRef<number | null>(null);
  const activeId = useRef(id);
  activeId.current = id;

  const load = useCallback(() => {
    if (!id) return;
    const request = ++loadRequest.current;
    api
      .mission(id)
      .then((m) => {
        if (request !== loadRequest.current || m.id !== id) return;
        setData(m);
        setError(false);
      })
      .catch(() => {
        if (request === loadRequest.current) setError(true);
      });
  }, [id]);

  useEffect(() => {
    setData(null);
    setError(false);
    setComment("");
    setCommentError(false);
    setBusy(false);
    setAiBusy(null);
    setExplanation(null);
    setShadow(null);
    load();
    return () => {
      loadRequest.current += 1;
      actionRequest.current += 1;
      if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current);
    };
  }, [load]);

  useEffect(() => {
    if (!providerDemo || !data?.artifact || !REVIEWABLE.includes(data.status)) return;
    publishDemoTour({
      role: "provider",
      step: 4,
      total: 4,
      title: t("demo.guide.done"),
      detail: t("demo.guide.done.body"),
      state: "done",
    });
  }, [data, providerDemo, t]);

  if (error) {
    return (
      <div className="py-24 text-center">
        <p className="font-semibold text-danger">{t("common.error")}</p>
        <button
          onClick={() => {
            setError(false);
            load();
          }}
          className="mt-3 cursor-pointer text-sm text-fund underline"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-6 pb-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-6 w-96" />
          <Skeleton className="h-44" />
          <Skeleton className="h-72" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const artifact = data.artifact;
  if (!artifact || !REVIEWABLE.includes(data.status)) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <EmptyState
          icon={<GitPullRequest size={30} />}
          title={t("rev.nothing")}
          sub={t("rev.nothing.sub")}
        />
        <div className="mt-5 text-center">
          <Link
            to={`/missions/${data.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-fund hover:underline"
          >
            <ArrowLeft size={14} />
            {t("common.back")}
          </Link>
        </div>
      </div>
    );
  }

  const reviewer = boot?.currentUser;
  const run = data.runs.find((r) => r.id === artifact.runId) ?? data.runs[data.runs.length - 1];
  const consumed = run?.computeUsed ?? data.computeConsumed;
  const dossier = artifact.verification;
  const experiments = dossier?.experiments ?? [];
  const totalExperimentPass = experiments.reduce((sum, experiment) => sum + experiment.tests.pass, 0);
  const totalExperimentFail = experiments.reduce((sum, experiment) => sum + experiment.tests.fail, 0);
  const totalExperimentCases = experiments.reduce((sum, experiment) => sum + experiment.tests.total, 0);
  const passedGates = dossier?.qualityGates.filter((gate) => gate.passed).length ?? 0;
  const criteriaWithEvidence = dossier?.criteria.filter((criterion) => criterion.status === "suite_passed" || criterion.status === "verified").length ?? 0;
  const estimate = data.computeEstimate;
  const estimateUsagePct = estimate && estimate.estimatedCredits > 0 ? Math.round((consumed / estimate.estimatedCredits) * 100) : null;
  const canAct = data.status === "needs_review";
  const decided = data.status === "approved" || data.status === "released";

  const sumBy = (type: LedgerEntry["type"]) =>
    data.ledger.filter((e) => e.type === type).reduce((acc, e) => acc + e.amount, 0);

  const loadAiEvidence = async (kind: "explain" | "shadow") => {
    if (!run) return;
    setAiBusy(kind);
    try {
      if (kind === "explain") setExplanation((await api.explainRunEvidence(run.id)).explanation);
      else setShadow((await api.shadowReview(run.id)).shadow);
    } catch (e) { pushToast({ kind: "error", message: apiErrorText(e, t) }); }
    finally { setAiBusy(null); }
  };

  const scoreAiEvidence = async (traceId: string | undefined, feature: string, helpful: boolean) => {
    if (!traceId) return;
    try { await api.aiFeedback(traceId, feature, helpful); pushToast({ kind: "info", message: t("ai.feedback.recorded") }); }
    catch (e) { pushToast({ kind: "error", message: apiErrorText(e, t) }); }
  };

  const finishRelease = async () => {
    setBusy(true);
    try { await api.releaseLocal(data.id); navigate(`/missions/${data.id}`); }
    catch (e) { pushToast({kind:"error",message:apiErrorText(e,t)}); setBusy(false); }
  };

  const decide = async (decision: "approve" | "request_changes") => {
    if (!id || data.id !== id) return;
    const missionId = id;
    const request = ++actionRequest.current;
    if (decision === "request_changes" && comment.trim().length === 0) {
      setCommentError(true);
      return;
    }
    setBusy(true);
    try {
      const res = await api.review(artifact.runId, decision, comment.trim());
      if (request !== actionRequest.current || activeId.current !== missionId) return;
      for (const a of res.achievements) pushToast({ kind: "achievement", achievement: a });
      if (decision === "approve") {
        pushToast({ kind: "info", message: t("rev.approved") });
        navigationTimer.current = window.setTimeout(() => {
          if (activeId.current === missionId) navigate(`/missions/${missionId}`);
        }, 900);
      } else {
        pushToast({ kind: "info", message: t("rev.changesSent") });
        navigationTimer.current = window.setTimeout(() => {
          if (activeId.current === missionId) navigate(`/missions/${missionId}/run`);
        }, 600);
      }
      // stay busy until navigation — prevents double submission
    } catch (e) {
      if (request !== actionRequest.current || activeId.current !== missionId) return;
      pushToast({ kind: "error", message: apiErrorText(e, t) });
      setBusy(false);
      load(); // A review may have committed before the release response failed.
    }
  };

  return (
    <div className="pb-8">
      {/* breadcrumb */}
      <Link
        to={`/missions/${data.id}`}
        className="inline-flex items-center gap-1.5 text-xs text-dim transition-colors hover:text-ink"
      >
        <ArrowLeft size={12} />
        <span className="truncate">{lt(data.title)}</span>
      </Link>

      {/* header */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t("rev.title")}</h1>
        <StatusPill status={data.status} />
      </div>
      <p className="mt-1.5 text-sm text-mut">{t("rev.sub")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-2 rounded-full border border-line2 bg-bg2 py-1 pl-3 pr-2 text-xs">
          <span className="text-dim">{t("rev.recordedReviewer")}</span>
          {reviewer && <Avatar name={reviewer.name} color={reviewer.avatarColor} size={18} />}
          <span className="font-semibold">{reviewer?.handle ?? t("rev.demoActor")}</span>
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-line2 bg-bg2 px-3 py-1 font-mono text-xs text-mut"
          title={t("rev.branch")}
        >
          <GitBranch size={12} className="text-dev" />
          {artifact.branch}
        </span>
        <ModeBadge mode={artifact.mode} detailed />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── main column ─────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-5">
          {/* 1. change summary */}
          <Card className="p-5">
            <PanelTitle
              icon={<GitPullRequest size={15} />}
              title={t("rev.summary")}
              right={<SourceBadge source={artifact.mode} verified={false} />}
            />
            <h3 className="text-base font-bold leading-snug">{lt(artifact.title)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-mut">{lt(artifact.summary)}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3.5 text-xs">
              <span className="inline-flex items-center gap-1.5 text-mut">
                <FileDiff size={13} className="text-dim" />
                <span className="font-mono font-semibold text-ink">{artifact.files.length}</span>
                {t("run.files")}
              </span>
              <span className="font-mono font-semibold text-verif">
                +{fmtInt(artifact.additions, locale)}{" "}
                <span className="font-sans font-normal text-dim">{t("rev.additions")}</span>
              </span>
              <span className="font-mono font-semibold text-danger">
                −{fmtInt(artifact.deletions, locale)}{" "}
                <span className="font-sans font-normal text-dim">{t("rev.deletions")}</span>
              </span>
              {run && (
                <span className="text-dim">
                  {t("run.attempt")}{" "}
                  <span className="font-mono font-semibold text-ink">{run.attempt}</span>{" "}
                  {t("run.of")} <span className="font-mono text-mut">{run.maxAttempts}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-dim">
                <Credits n={consumed} className="font-semibold text-ink" /> {t("msn.consumed")}
              </span>
            </div>
          </Card>

          {/* Verification is a first-screen decision aid, not an appendix. */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-line bg-gradient-to-r from-verif/10 via-bg1 to-dev/10 p-5">
              <PanelTitle
                icon={<ShieldCheck size={15} />}
                title={t("rev.dossier.title")}
                right={<SourceBadge source={artifact.testEvidenceSource === "engine" ? "engine" : "demo"} verified={artifact.testEvidenceSource === "engine"} />}
              />
              <p className="text-xs leading-relaxed text-mut">{t("rev.dossier.sub")}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  [experiments.length, t("rev.dossier.experiments")],
                  [totalExperimentCases, t("rev.dossier.testExecutions")],
                  [totalExperimentPass, t("rev.dossier.passed")],
                  [totalExperimentFail, t("rev.dossier.failed")],
                  [`${passedGates}/${dossier?.qualityGates.length ?? 0}`, t("rev.dossier.gates")],
                  [`${criteriaWithEvidence}/${dossier?.criteria.length ?? data.acceptanceCriteria.length}`, t("rev.dossier.criteria")],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-line bg-bg0/70 px-3 py-3">
                    <p className="font-mono text-xl font-bold text-ink">{typeof value === "number" ? fmtInt(value, locale) : value}</p>
                    <p className="mt-1 text-[10px] leading-tight text-dim">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {experiments.length > 0 && (
              <div className="divide-y divide-line">
                {experiments.map((experiment, index) => (
                  <div key={`${experiment.phase}-${experiment.attempt ?? index}`} className="grid gap-3 px-5 py-4 sm:grid-cols-[170px_1fr_auto] sm:items-center">
                    <div>
                      <p className="text-xs font-bold text-ink">
                        {experiment.phase === "baseline" ? t("rev.dossier.baseline") : t("rev.dossier.attempt", { count: experiment.attempt ?? index })}
                      </p>
                      <SourceBadge source={experiment.source} verified={experiment.source === "engine"} />
                    </div>
                    <code className="min-w-0 truncate rounded-lg bg-bg0 px-3 py-2 font-mono text-[11px] text-mut">$ {experiment.command}</code>
                    <div className="text-right font-mono text-xs">
                      <span className="font-bold text-verif">{experiment.tests.pass}</span>
                      <span className="text-dim"> / {experiment.tests.total}</span>
                      {experiment.tests.fail > 0 && <span className="ml-2 text-danger">{experiment.tests.fail} failed</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dossier && (
              <div className="grid gap-4 border-t border-line p-5 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold text-ink">{t("rev.dossier.gates")}</p>
                  <ul className="space-y-2">
                    {dossier.qualityGates.map((gate) => (
                      <li key={gate.key} className="flex items-start gap-2 text-xs leading-relaxed text-mut">
                        {gate.passed ? <Check size={13} className="mt-0.5 shrink-0 text-verif" /> : <X size={13} className="mt-0.5 shrink-0 text-danger" />}
                        <span>{lt(gate.detail)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-warn/25 bg-warn/5 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-warn"><AlertTriangle size={13} />{t("rev.dossier.residual")}</p>
                  <p className="mt-2 text-xs leading-relaxed text-mut">{t("rev.dossier.residual.body")}</p>
                </div>
              </div>
            )}

            {estimate && (
              <div className="border-t border-line px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold text-ink">{t("rev.computeComparison")}</p>
                  <p className="font-mono text-xs text-mut">
                    {t("rev.computeEstimate")} <b className="text-ink">{fmtInt(estimate.estimatedCredits, locale)}</b>
                    <span className="mx-2 text-dim">→</span>
                    {t("rev.computeActual")} <b className="text-ink">{fmtInt(consumed, locale)}</b>
                    {estimateUsagePct !== null && <span className="ml-2 text-dim">({estimateUsagePct}% {t("rev.computeVariance")})</span>}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg3"><div className="h-full rounded-full bg-brand2" style={{ width: `${Math.min(100, estimateUsagePct ?? 0)}%` }} /></div>
              </div>
            )}
          </Card>

          {/* 2. pre-review self-critique — advisory, provenance-labelled */}
          {artifact.review && (
            <Card className="p-5">
              <PanelTitle
                icon={<ScanSearch size={15} />}
                title={t("rev.selfReview")}
                right={
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${
                      artifact.review.verdict === "approve"
                        ? "bg-ok/10 text-ok"
                        : artifact.review.verdict === "reject"
                          ? "bg-danger/10 text-danger"
                          : "bg-warn/10 text-warn"
                    }`}
                  >
                    {t(`rev.selfReview.${artifact.review.verdict}` as TKey)}
                  </span>
                }
              />
              <p className="mb-2 text-xs text-dim">
                {artifact.review.by === "llm"
                  ? `${t("rev.selfReview.byLlm")} · ${artifact.review.model ?? ""}`
                  : t("rev.selfReview.byStatic")}
              </p>
              <p className="text-sm leading-relaxed text-mut">{lt(artifact.review.notes)}</p>
              {artifact.review.unverified.length > 0 && (
                <div className="mt-3.5 border-t border-line pt-3.5">
                  <p className="mb-1.5 text-xs font-semibold text-dim">
                    {t("rev.selfReview.unverified")}
                  </p>
                  <ul className="space-y-1.5">
                    {artifact.review.unverified.map((u, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-mut">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-dim" />
                        {lt(u)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-3.5 text-xs italic text-dim">{t("rev.selfReview.advisory")}</p>
            </Card>
          )}

          <Card className="p-5">
            <PanelTitle icon={<Sparkles size={15} />} title={t("rev.aiEvidence.title")} />
            <p className="text-xs leading-relaxed text-dim">{t("rev.aiEvidence.boundary")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn kind="ghost" onClick={() => void loadAiEvidence("explain")} disabled={aiBusy !== null}>
                {aiBusy === "explain" && <Loader2 size={14} className="animate-spin" />}{t("rev.aiEvidence.explain")}
              </Btn>
              <Btn kind="ghost" onClick={() => void loadAiEvidence("shadow")} disabled={aiBusy !== null}>
                {aiBusy === "shadow" && <Loader2 size={14} className="animate-spin" />}{t("rev.aiEvidence.shadow")}
              </Btn>
            </div>
            {explanation && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-sm leading-relaxed text-mut">{lt(explanation.summary)}</p>
                <ul className="mt-3 space-y-1.5 text-xs text-dim">{explanation.verifiedFacts.map((fact, i) => <li key={i}>✓ {lt(fact)}</li>)}</ul>
                <p className="mt-3 font-mono text-[10px] text-dim">{explanation.evidence.generator} · {explanation.evidence.promptKey}@{explanation.evidence.promptVersion} · {explanation.evidence.variant}</p>
                {explanation.evidence.traceId && <div className="mt-3 flex items-center gap-2 text-xs text-dim"><span>{t("ai.feedback.question")}</span><button type="button" onClick={() => void scoreAiEvidence(explanation.evidence.traceId, "evidence-explanation", true)} aria-label={t("ai.feedback.yes")} className="cursor-pointer rounded p-1 hover:bg-bg3"><ThumbsUp size={13} /></button><button type="button" onClick={() => void scoreAiEvidence(explanation.evidence.traceId, "evidence-explanation", false)} aria-label={t("ai.feedback.no")} className="cursor-pointer rounded p-1 hover:bg-bg3"><ThumbsDown size={13} /></button></div>}
              </div>
            )}
            {shadow && (
              <div className="mt-4 border-t border-line pt-4">
                <div className="flex items-center gap-2"><span className="rounded border border-dev/30 bg-dev/5 px-2 py-0.5 font-mono text-[10px] text-dev">SHADOW</span><span className="text-xs font-semibold text-mut">{shadow.verdict}</span></div>
                <p className="mt-2 text-sm leading-relaxed text-mut">{lt(shadow.notes)}</p>
                <p className="mt-3 text-xs italic text-dim">{t("rev.aiEvidence.noGate")}</p>
                <p className="mt-2 font-mono text-[10px] text-dim">{shadow.evidence.generator} · {shadow.evidence.promptKey}@{shadow.evidence.promptVersion}</p>
                {shadow.evidence.traceId && <div className="mt-3 flex items-center gap-2 text-xs text-dim"><span>{t("ai.feedback.question")}</span><button type="button" onClick={() => void scoreAiEvidence(shadow.evidence.traceId, "shadow-review", true)} aria-label={t("ai.feedback.yes")} className="cursor-pointer rounded p-1 hover:bg-bg3"><ThumbsUp size={13} /></button><button type="button" onClick={() => void scoreAiEvidence(shadow.evidence.traceId, "shadow-review", false)} aria-label={t("ai.feedback.no")} className="cursor-pointer rounded p-1 hover:bg-bg3"><ThumbsDown size={13} /></button></div>}
              </div>
            )}
          </Card>

          {/* 3. risks */}
          {artifact.risks.length > 0 && (
            <Card className="p-5">
              <PanelTitle icon={<AlertTriangle size={15} />} title={t("rev.risks")} />
              <ul className="space-y-2.5">
                {artifact.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-mut">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />
                    {lt(risk)}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* 4. affected files + diffs */}
          <Card className="p-5">
            <PanelTitle
              icon={<FileDiff size={15} />}
              title={t("rev.files")}
              right={
                <span className="font-mono text-xs text-dim">{artifact.files.length}</span>
              }
            />
            <div className="divide-y divide-line">
              {artifact.files.map((f, i) => (
                <DiffFile key={f.path} file={f} defaultOpen={i === 0} />
              ))}
            </div>
          </Card>

          {/* 5. test evidence — engine-verified */}
          <Card className="p-5">
            <PanelTitle
              icon={<ShieldCheck size={15} />}
              title={t("rev.evidence")}
              right={
                <span className="inline-flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-dim">
                    {t("rev.evidence.final")}
                  </span>
                  <SourceBadge
                    source={artifact.testEvidenceSource === "engine" ? "engine" : "demo"}
                    verified={artifact.testEvidenceSource === "engine"}
                  />
                </span>
              }
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="font-mono text-2xl font-bold text-verif">
                  {fmtInt(artifact.testEvidence.pass, locale)}
                </p>
                <p className="mt-0.5 text-xs text-dim">{t("run.testsPass")}</p>
              </div>
              <div>
                <p
                  className={`font-mono text-2xl font-bold ${
                    artifact.testEvidence.fail > 0 ? "text-danger" : "text-mut"
                  }`}
                >
                  {fmtInt(artifact.testEvidence.fail, locale)}
                </p>
                <p className="mt-0.5 text-xs text-dim">{t("run.testsFail")}</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-ink">
                  {fmtInt(artifact.testEvidence.total, locale)}
                </p>
                <p className="mt-0.5 text-xs text-dim">{t("run.tests")}</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-mut">
                  {fmtDuration(artifact.testEvidence.durationMs)}
                </p>
                <p className="mt-0.5 text-xs text-dim">{t("rev.evidence.duration")}</p>
              </div>
            </div>
            {artifact.commands.length > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-line pt-4">
                {artifact.commands.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg0 px-3 py-2"
                  >
                    <code className="min-w-0 flex-1 truncate font-mono text-xs text-mut">
                      $ {c.command}
                    </code>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        c.exitCode === 0
                          ? "border-verif/30 bg-verif/5 text-verif"
                          : "border-danger/30 bg-danger/5 text-danger"
                      }`}
                    >
                      {c.exitCode === 0 ? <Check size={10} /> : <X size={10} />}
                      {c.exitCode}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 6. compute ledger */}
          <Card className="p-5">
            <PanelTitle icon={<Coins size={15} />} title={t("rev.ledger")} />
            <div className="space-y-1.5">
              {data.ledger.map((e) => (
                <div key={e.id} className="flex items-center gap-3 text-xs">
                  <span className="w-16 shrink-0 font-mono text-dim">{timeAgo(e.ts, t)}</span>
                  <span
                    className={`w-20 shrink-0 rounded border px-1.5 py-0.5 text-center text-[10px] font-semibold ${
                      {
                        pledge: "border-fund/30 bg-fund/5 text-fund",
                        reserve: "border-dev/30 bg-dev/5 text-dev",
                        consume: "border-danger/30 bg-danger/5 text-danger",
                        refund_unused: "border-verif/30 bg-verif/5 text-verif",
                      }[e.type]
                    }`}
                  >
                    {t(`ledger.${e.type}` as TKey)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-mut">{lt(e.memo)}</span>
                  <Credits n={e.amount} className="shrink-0 text-xs font-semibold" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line pt-3 text-xs text-dim">
              <span className="inline-flex items-center gap-1.5">
                <Credits n={sumBy("pledge")} className="font-semibold text-fund" />
                {t("msn.pledged")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Credits n={sumBy("reserve")} className="font-semibold text-dev" />
                {t("msn.reserved")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Credits n={sumBy("consume")} className="font-semibold text-danger" />
                {t("msn.consumed")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Credits n={sumBy("refund_unused")} className="font-semibold text-verif" />
                {t("msn.refunded")}
              </span>
            </div>
          </Card>
        </div>

        {/* ── action rail ─────────────────────────────────────────────── */}
        <div className="sticky top-28 md:top-20">
          <Card className="p-5">
            {providerDemo ? (
              <p className="rounded-lg border border-brand2/30 bg-brand/5 p-3 text-xs leading-relaxed text-mut">
                {t("demo.provider.readOnly")}
              </p>
            ) : decided ? (
              <div className="flex flex-wrap items-start gap-2.5 rounded-lg border border-verif/30 bg-verif/5 p-3 text-sm text-verif">
                {data.status === "released" ? (
                  <PackageCheck size={16} className="mt-0.5 shrink-0" />
                ) : (
                  <BadgeCheck size={16} className="mt-0.5 shrink-0" />
                )}
                <span className="font-medium">
                  {data.status === "released"
                    ? `${t("status.released")}${data.releaseVersion ? ` · ${data.releaseVersion}` : ""}`
                    : t("rev.approved")}
                </span>
                {data.status === "approved" && <Btn disabled={busy} onClick={finishRelease}>{t("rev.finishLocalRelease")}</Btn>}
              </div>
            ) : (
              <>
                <p className="mb-3 rounded-lg border border-warn/30 bg-warn/5 p-3 text-xs leading-relaxed text-warn">
                  {t("rev.localBoundary")}
                </p>
                <label htmlFor="review-comment" className="mb-1.5 block text-xs font-semibold text-mut">
                  {t("rev.comment.label")}
                </label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    setCommentError(false);
                  }}
                  placeholder={t("rev.comment.placeholder")}
                  disabled={busy || !canAct}
                  className={`min-h-24 w-full resize-y rounded-lg border bg-bg0 p-3 text-sm outline-none transition-colors focus:border-fund disabled:opacity-50 ${
                    commentError ? "border-danger" : "border-line2"
                  }`}
                />
                {commentError && (
                  <p className="mt-1.5 text-xs text-danger">{t("rev.comment.required")}</p>
                )}
                <div className="mt-3 space-y-2">
                  <Btn
                    kind="success"
                    onClick={() => decide("approve")}
                    disabled={busy || !canAct}
                    className="w-full justify-center"
                  >
                    <ThumbsUp size={15} />
                    {t("rev.approve")}
                  </Btn>
                  <Btn
                    kind="ghost"
                    onClick={() => decide("request_changes")}
                    disabled={busy || !canAct}
                    className="w-full justify-center border-warn/50 text-warn hover:bg-warn/10"
                  >
                    <ThumbsDown size={15} />
                    {t("rev.requestChanges")}
                  </Btn>
                </div>
                {data.status === "changes_requested" && (
                  <>
                    <p className="mt-3 text-xs leading-relaxed text-mut">{t("rev.awaitingRerun")}</p>
                    <Link
                      to={`/missions/${data.id}/run`}
                      className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-dev hover:underline"
                    >
                      {t("msn.watchLive")} <ChevronRight size={12} />
                    </Link>
                  </>
                )}
              </>
            )}
            <p className="mt-4 flex items-start gap-2 border-t border-line pt-3.5 text-xs leading-relaxed text-dim">
              <UserCheck size={14} className="mt-0.5 shrink-0" />
              {t("run.guard.approval")}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

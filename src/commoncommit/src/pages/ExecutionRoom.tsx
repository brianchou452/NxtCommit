import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  FileDiff,
  FlaskConical,
  GitPullRequest,
  Info,
  ListTree,
  MessageSquare,
  PackagePlus,
  Play,
  Radio,
  Rocket,
  RotateCcw,
  ScanSearch,
  Search,
  ShieldCheck,
  Stethoscope,
  Terminal,
  UserCheck,
  XCircle,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useI18n, type TKey } from "../i18n/index.js";
import { demoTourRole, publishDemoTour } from "../lib/demoTour.js";
import { useApp } from "../state/AppContext.js";
import { apiErrorText } from "../lib/errors.js";
import { api } from "../lib/api.js";
import { mergeEventsForRun } from "../lib/executionEvents.js";
import { EXECUTION_PHASE_TYPES, latestMappedPhaseIndex } from "../lib/executionPhases.js";
import { useStream, missionStreamUrl } from "../lib/stream.js";
import { clockTime, fmtInt, fmtPct } from "../lib/format.js";
import { Btn, Card, Credits, EmptyState, ModeBadge, Skeleton, SourceBadge, StatusPill } from "../components/ui.js";
import type {
  ExecutionEvent,
  ExecutionRun,
  FileChange,
  MissionDetail,
  MissionWithProject,
  RunStatus,
  TestSummary,
} from "../../shared/types.js";

// ── helpers ──────────────────────────────────────────────────────────────────

function pickRun(detail: MissionDetail): ExecutionRun | null {
  return (
    detail.runs.find((r) => r.id === detail.latestRunId) ??
    (detail.runs.length > 0 ? detail.runs[detail.runs.length - 1] : null)
  );
}

function fmtDurMs(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function fmtSpan(startIso: string, endIso: string): string {
  const s = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

const RUN_STATUS_CHIP: Record<RunStatus, string> = {
  running: "text-dev border-dev/40 bg-dev/10",
  succeeded: "text-verif border-verif/40 bg-verif/10",
  failed: "text-danger border-danger/40 bg-danger/10",
  budget_exhausted: "text-warn border-warn/40 bg-warn/10",
  blocked: "text-warn border-warn/40 bg-warn/10",
  cancelled: "text-mut border-line2 bg-bg3",
};

const FILE_KIND_DOT: Record<FileChange["kind"], string> = {
  add: "bg-verif",
  modify: "bg-fund",
  delete: "bg-danger",
};

function eventVisual(e: ExecutionEvent): { icon: ReactNode; cls: string } {
  switch (e.type) {
    case "analysis":
      return { icon: <Search size={13} />, cls: "text-dev" };
    case "plan":
    case "plan_revision":
      return { icon: <ListTree size={13} />, cls: "text-dev" };
    case "workspace":
      return { icon: <Box size={13} />, cls: "text-mut" };
    case "environment":
      return { icon: <ScanSearch size={13} />, cls: "text-dev" };
    case "provision":
      return { icon: <PackagePlus size={13} />, cls: "text-fund" };
    case "file_change":
      return { icon: <FileDiff size={13} />, cls: "text-fund" };
    case "command":
      return { icon: <Terminal size={13} />, cls: "text-mut" };
    case "test_run":
      return { icon: <FlaskConical size={13} />, cls: "text-dev" };
    case "test_result":
      return e.payload?.tests && e.payload.tests.fail === 0
        ? { icon: <CheckCircle2 size={13} />, cls: "text-verif" }
        : { icon: <XCircle size={13} />, cls: "text-danger" };
    case "diagnosis":
      return { icon: <Stethoscope size={13} />, cls: "text-warn" };
    case "quality_check":
      return { icon: <ShieldCheck size={13} />, cls: "text-verif" };
    case "review_summary":
    case "agent_message":
      return { icon: <Bot size={13} />, cls: "text-dev" };
    case "pr_prepared":
      return { icon: <GitPullRequest size={13} />, cls: "text-adopt" };
    case "approval_gate":
      return { icon: <UserCheck size={13} />, cls: "text-adopt" };
    case "feedback":
      return { icon: <MessageSquare size={13} />, cls: "text-adopt" };
    case "budget":
      return { icon: <Zap size={13} />, cls: "text-fund" };
    case "retry":
      return { icon: <RotateCcw size={13} />, cls: "text-warn" };
    case "release":
      return { icon: <Rocket size={13} />, cls: "text-adopt" };
    case "error":
      return { icon: <AlertTriangle size={13} />, cls: "text-danger" };
    default:
      return { icon: <Info size={13} />, cls: "text-mut" };
  }
}

// ── phase rail ───────────────────────────────────────────────────────────────

/**
 * The pipeline at a glance. The timeline tells you *what* happened; this tells
 * you *where in the process* the run is, which is what an audience needs in the
 * first two seconds.
 */
const PHASES = [
  { key: "sandbox", label: "run.phase.sandbox", types: EXECUTION_PHASE_TYPES[0] },
  { key: "environment", label: "run.phase.environment", types: EXECUTION_PHASE_TYPES[1] },
  { key: "plan", label: "run.phase.plan", types: EXECUTION_PHASE_TYPES[2] },
  { key: "implement", label: "run.phase.implement", types: EXECUTION_PHASE_TYPES[3] },
  { key: "verify", label: "run.phase.verify", types: EXECUTION_PHASE_TYPES[4] },
  { key: "review", label: "run.phase.review", types: EXECUTION_PHASE_TYPES[5] },
] as const;

function PhaseRail({ events, running }: { events: ExecutionEvent[]; running: boolean }) {
  const { t } = useI18n();
  const seen = new Set(events.map((e) => e.type));
  const activeIdx = latestMappedPhaseIndex(events);

  return (
    <ol className="mb-5 flex flex-wrap items-center gap-x-1 gap-y-2">
      {PHASES.map((phase, i) => {
        const reached = phase.types.some((ty) => seen.has(ty as ExecutionEvent["type"]));
        const isActive = running && i === activeIdx;
        const done = reached && !isActive;
        return (
          <li key={phase.key} className="flex items-center gap-1">
            {i > 0 && (
              <span
                className={`mr-1 hidden h-px w-6 transition-colors sm:block ${
                  reached ? "bg-verif/40" : "bg-line"
                }`}
              />
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[14px] font-semibold transition-colors ${
                isActive
                  ? "border-dev/50 bg-dev/10 text-dev"
                  : done
                    ? "border-verif/30 bg-verif/5 text-verif"
                    : "border-line text-dim"
              }`}
            >
              {isActive ? (
                <span className="cc-pulse inline-block h-1.5 w-1.5 rounded-full bg-current" />
              ) : done ? (
                <Check size={11} strokeWidth={3} />
              ) : (
                <span className="inline-block h-1.5 w-1.5 rounded-full border border-current opacity-50" />
              )}
              {t(phase.label as TKey)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Surfaces what the engine detected and how it built the sandbox. */
function EnvironmentCard({ events }: { events: ExecutionEvent[] }) {
  const { t, lt } = useI18n();
  const envEvent = events.find((e) => e.type === "environment");
  if (!envEvent) return null;
  const p = envEvent.payload ?? {};
  const provisioned = events.filter((e) => e.type === "provision");
  return (
    <Card className="p-4">
      <p className="mb-3 text-[14px] font-semibold uppercase tracking-wider text-dim">
        {t("run.environment")}
      </p>
      <dl className="space-y-2 text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-dim">{t("run.env.toolchain")}</dt>
          <dd className="font-mono font-semibold text-ink">{String(p.toolchain ?? "—")}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="shrink-0 text-dim">{t("run.env.testCommand")}</dt>
          <dd className="truncate font-mono text-verif" title={String(p.testCommand ?? "")}>
            {String(p.testCommand ?? "—")}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="shrink-0 text-dim">{t("run.env.source")}</dt>
          <dd className="truncate text-right font-mono text-[14px] text-mut" title={String(p.testSource ?? "")}>
            {String(p.testSource ?? "—")}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-dim">{t("run.env.install")}</dt>
          <dd className="font-mono text-[14px] text-mut">
            {p.needsInstall
              ? provisioned.length > 1
                ? t("run.env.installDone")
                : t("run.env.installing")
              : t("run.env.installSkipped")}
          </dd>
        </div>
      </dl>
      {envEvent.detail && (
        <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3 text-[14px] leading-relaxed text-dim">
          {lt(envEvent.detail)}
        </p>
      )}
    </Card>
  );
}

// ── timeline row ─────────────────────────────────────────────────────────────

function TestChips({ tests }: { tests: TestSummary }) {
  const { t } = useI18n();
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[14px]">
        <span className="rounded border border-verif/30 bg-verif/10 px-1.5 py-0.5 font-semibold text-verif">
          {tests.pass} {t("run.testsPass")}
        </span>
        <span
          className={`rounded border px-1.5 py-0.5 font-semibold ${
            tests.fail > 0 ? "border-danger/30 bg-danger/10 text-danger" : "border-line bg-bg2 text-mut"
          }`}
        >
          {tests.fail} {t("run.testsFail")}
        </span>
        <span className="rounded border border-line bg-bg2 px-1.5 py-0.5 text-mut">{tests.total}</span>
        <span className="text-dim">{fmtDurMs(tests.durationMs)}</span>
      </div>
      {tests.failures && tests.failures.length > 0 && (
        <ul className="space-y-0.5">
          {tests.failures.map((f) => (
            <li key={f.name} className="text-[14px] leading-relaxed">
              <span className="font-mono font-semibold text-danger">{f.name}</span>
              {f.message && <span className="text-dim"> — {f.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FileChips({ files }: { files: FileChange[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {files.map((f) => (
        <span
          key={f.path}
          className="inline-flex items-center gap-1.5 rounded border border-line bg-bg0 px-2 py-0.5 font-mono text-[14px] text-mut"
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${FILE_KIND_DOT[f.kind]}`} />
          {f.path}
          {(f.additions !== undefined || f.deletions !== undefined) && (
            <span className="text-dim">
              {f.additions !== undefined && <span className="text-verif">+{f.additions}</span>}{" "}
              {f.deletions !== undefined && <span className="text-danger">-{f.deletions}</span>}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function EventRow({ event }: { event: ExecutionEvent }) {
  const { t, lt, locale } = useI18n();
  const [showOutput, setShowOutput] = useState(false);
  const { icon, cls } = eventVisual(event);
  const p = event.payload;

  return (
    <li className="cc-event-in relative flex gap-3 pb-5 last:pb-1">
      <span
        className={`z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-bg2 ${cls}`}
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[14px] text-dim">{clockTime(event.ts)}</span>
          <span className="text-[14px] font-semibold uppercase tracking-wider text-dim">
            {t(`event.${event.type}` as TKey)}
          </span>
          <SourceBadge source={event.source} verified={event.verified} />
          {event.computeDelta > 0 && (
            <span className="ml-auto shrink-0 rounded border border-fund/30 bg-fund/10 px-1.5 py-0.5 font-mono text-[14px] font-semibold text-fund">
              +{fmtInt(event.computeDelta, locale)} ⚡
            </span>
          )}
        </div>

        <p className="mt-1 text-sm font-semibold leading-snug text-ink">{lt(event.title)}</p>
        {event.detail && (
          <p className="mt-0.5 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-mut">
            {lt(event.detail)}
          </p>
        )}

        {p?.tests && <TestChips tests={p.tests} />}
        {p?.files && p.files.length > 0 && <FileChips files={p.files} />}

        {p?.output && (
          <div className="mt-2">
            <button
              onClick={() => setShowOutput((v) => !v)}
              className="inline-flex cursor-pointer items-center gap-1 text-[14px] font-semibold text-dim transition-colors hover:text-ink"
            >
              {showOutput ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showOutput ? t("run.hideOutput") : t("run.showOutput")}
            </button>
            {showOutput && (
              <pre className="mt-1.5 max-h-64 overflow-auto rounded border border-line bg-bg0 p-3 font-mono text-xs leading-relaxed text-mut">
                {p.output}
              </pre>
            )}
          </div>
        )}

        {p?.llm && (
          <p className="mt-1.5 font-mono text-[14px] text-dim">
            {p.llm.model} · {fmtInt(p.llm.latencyMs, locale)}ms · {fmtInt(p.llm.inputTokens + p.llm.outputTokens, locale)}{" "}
            tokens
          </p>
        )}
      </div>
    </li>
  );
}

// ── sidebar ──────────────────────────────────────────────────────────────────

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-[14px] font-semibold uppercase tracking-wider text-dim">{title}</h3>
      {children}
    </Card>
  );
}

const GUARDRAIL_KEYS = ["workspace", "budget", "retries", "noPush", "approval"] as const;

// ── page ─────────────────────────────────────────────────────────────────────

export default function ExecutionRoom() {
  const { id } = useParams<{ id: string }>();
  const { t, lt, locale } = useI18n();
  const { boot, pushToast } = useApp();
  const [searchParams] = useSearchParams();
  const providerDemo = demoTourRole(`?${searchParams.toString()}`) === "provider";

  const [mission, setMission] = useState<MissionWithProject | null>(null);
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [queued, setQueued] = useState(false);
  const [copied, setCopied] = useState(false);

  const runRef = useRef<ExecutionRun | null>(null);
  const loadRequest = useRef(0);
  const eventsRequest = useRef(0);
  const actionRequest = useRef(0);
  const activeId = useRef(id);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const firstScrollRef = useRef(true);
  activeId.current = id;

  /** Clear every run-derived surface before adopting a different run. */
  const resetRunView = useCallback(() => {
    eventsRequest.current += 1;
    setEvents([]);
    setCopied(false);
    nearBottomRef.current = true;
    firstScrollRef.current = true;
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
  }, []);

  /** Keep the mutable ref authoritative even before React publishes state. */
  const adoptRun = useCallback((next: ExecutionRun | null): boolean => {
    const changed = runRef.current?.id !== next?.id;
    runRef.current = next;
    setRun(next);
    if (changed) resetRunView();
    return changed;
  }, [resetRunView]);

  const fetchEventsForRun = useCallback((targetRunId: string) => {
    if (!id) return;
    const missionId = id;
    const request = ++eventsRequest.current;
    api
      .missionEvents(missionId, targetRunId)
      .then((res) => {
        if (
          request !== eventsRequest.current ||
          activeId.current !== missionId ||
          runRef.current?.id !== targetRunId ||
          (res.runId !== undefined && res.runId !== targetRunId)
        ) return;
        setEvents((previous) =>
          mergeEventsForRun(previous, res.events, missionId, targetRunId)
        );
      })
      .catch(() => {});
  }, [id]);

  const load = useCallback(() => {
    if (!id) return;
    const missionId = id;
    const request = ++loadRequest.current;
    setErrorId(null);
    api
      .mission(missionId)
      .then((detail) => {
        if (
          request !== loadRequest.current ||
          activeId.current !== missionId ||
          detail.id !== missionId
        ) return;
        const nextRun = pickRun(detail);
        setMission(detail);
        if (nextRun) setQueued(false);
        adoptRun(nextRun);
        if (nextRun) fetchEventsForRun(nextRun.id);
      })
      .catch(() => {
        if (request === loadRequest.current && activeId.current === missionId) {
          setErrorId(missionId);
        }
      });
  }, [adoptRun, fetchEventsForRun, id]);

  useEffect(() => {
    setMission(null);
    if (!adoptRun(null)) resetRunView();
    setErrorId(null);
    setStarting(false);
    setQueued(false);
    setCopied(false);
    load();
    return () => {
      loadRequest.current += 1;
      eventsRequest.current += 1;
      actionRequest.current += 1;
    };
  }, [adoptRun, load, resetRunView]);

  // A Phase 3 worker is a different process, so its in-memory event bus cannot
  // drive this web pod's SSE clients. Poll only while a queued request or a run
  // is active; inline mode still gets the faster SSE path above.
  useEffect(() => {
    if (!id) return;
    const missionId = id;
    let stopped = false;
    const poll = async () => {
      try {
        const queued = await api.runRequestForMission(missionId);
        if (stopped || activeId.current !== missionId) return;
        const requestActive = queued.request?.status === "queued" || queued.request?.status === "leased";
        setQueued(requestActive);
        if (
          requestActive ||
          runRef.current?.status === "running" ||
          (queued.request?.resultRunId && queued.request.resultRunId !== runRef.current?.id)
        ) load();
      } catch {
        // SSE and the manual retry remain available if polling is unavailable.
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [id, load]);

  // Live stream: events accumulate, run/mission stay fresh, reconnect refetches.
  useStream(
    id ? missionStreamUrl(id) : null,
    (msg) => {
      if (msg.kind === "exec_event") {
        const currentRunId = runRef.current?.id;
        if (!currentRunId || msg.event.missionId !== id || msg.event.runId !== currentRunId) return;
        setEvents((previous) =>
          mergeEventsForRun(previous, [msg.event], id, currentRunId)
        );
      } else if (msg.kind === "run_update") {
        if (msg.run.missionId !== id) return;
        adoptRun(msg.run);
        // Re-read the adapted attempt counts after every run state update.
        load();
      } else if (msg.kind === "mission_update") {
        if (msg.mission.id !== id) return;
        setMission(msg.mission);
      } else if (msg.kind === "achievement" && msg.contributorId === boot?.currentUser.id) {
        pushToast({ kind: "achievement", achievement: msg.achievement });
      }
    },
    load
  );

  // Auto-scroll the timeline to the newest event, but only if already near the bottom.
  const onTimelineScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || events.length === 0) return;
    if (nearBottomRef.current || firstScrollRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: firstScrollRef.current ? "auto" : "smooth" });
      firstScrollRef.current = false;
    }
  }, [events.length]);

  // Derived telemetry (engine facts pulled from the verified event stream).
  const filesTouched = useMemo(() => {
    const map = new Map<string, FileChange>();
    for (const e of events) {
      if ((e.type === "file_change" || e.type === "pr_prepared") && e.payload?.files) {
        for (const f of e.payload.files) map.set(f.path, f);
      }
    }
    return [...map.values()];
  }, [events]);

  const testResults = useMemo(
    () => events.filter((e) => e.type === "test_result" && e.payload?.tests),
    [events]
  );
  const baselineTests = testResults[0]?.payload?.tests;
  const latestTests = testResults[testResults.length - 1]?.payload?.tests;
  const executedTestCases = testResults.reduce((sum, event) => sum + (event.payload?.tests?.total ?? 0), 0);
  const observedTestFailures = testResults.reduce((sum, event) => sum + (event.payload?.tests?.fail ?? 0), 0);

  useEffect(() => {
    if (!providerDemo || !mission || mission.id !== id || !run) return;
    const latest = events[events.length - 1];
    if (run.status === "running") {
      publishDemoTour({
        role: "provider",
        step: 3,
        total: 4,
        title: t("demo.guide.run"),
        detail: latest ? lt(latest.title) : t("demo.guide.run.body"),
        state: "running",
      });
      return;
    }
    if (mission.status !== "needs_review") {
      publishDemoTour({
        role: "provider",
        step: 3,
        total: 4,
        title: t("common.error"),
        detail: run.outcomeNote ? lt(run.outcomeNote) : t("common.requestFailed"),
        state: "error",
      });
      return;
    }
    publishDemoTour({
      role: "provider",
      step: 4,
      total: 4,
      title: t("demo.guide.review"),
      detail: t("demo.guide.review.body"),
      state: "waiting",
      anchorSelector: '[data-demo-action="review-artifact"]',
    });
  }, [events, id, lt, mission, providerDemo, run, t]);

  const startExecution = async () => {
    if (!id || mission?.id !== id) return;
    const missionId = id;
    const request = ++actionRequest.current;
    setStarting(true);
    try {
      const res = await api.execute(missionId);
      if (request !== actionRequest.current || activeId.current !== missionId) return;
      if (res.dispatch === "inline") adoptRun(res.run);
      else setQueued(true);
      load();
    } catch (e) {
      if (request !== actionRequest.current || activeId.current !== missionId) return;
      pushToast({ kind: "error", message: apiErrorText(e, t) });
    } finally {
      if (request === actionRequest.current && activeId.current === missionId) setStarting(false);
    }
  };

  const copyTrace = async (traceId: string) => {
    try {
      await navigator.clipboard.writeText(traceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  // ── error / loading ──────────────────────────────────────────────────────
  if (errorId === id) {
    return (
      <div className="py-24 text-center">
        <p className="font-semibold text-danger">{t("common.error")}</p>
        <button onClick={load} className="mt-3 cursor-pointer text-sm text-fund underline">
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (!mission || mission.id !== id) {
    return (
      <div className="space-y-5 pb-8">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-80" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="w-full space-y-4 lg:order-2 lg:w-1/3">
            <Skeleton className="h-28" />
            <Skeleton className="h-32" />
            <Skeleton className="h-40" />
          </div>
          <Skeleton className="h-[480px] min-w-0 flex-1 lg:order-1" />
        </div>
      </div>
    );
  }

  const running = run?.status === "running";

  // ── header ───────────────────────────────────────────────────────────────
  const header = (
    <div>
      <Link
        to={`/missions/${mission.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-mut transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} />
        <span className="line-clamp-1">{lt(mission.title)}</span>
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="mr-1 text-2xl font-extrabold tracking-tight">{t("run.title")}</h1>
        <StatusPill status={mission.status} pulse={running} />
        {run && <ModeBadge mode={run.mode} detailed />}
        {running && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/50 bg-danger/10 px-2.5 py-0.5 text-[14px] font-bold tracking-widest text-danger">
            <span className="cc-pulse inline-block h-1.5 w-1.5 rounded-full bg-danger" />
            {t("run.live")}
          </span>
        )}
        {run && !running && (
          <span className="inline-flex items-center gap-2">
            {run.endedAt && (
              <span className="text-xs text-dim">
                {t("run.finishedIn")} <span className="font-mono">{fmtSpan(run.startedAt, run.endedAt)}</span>
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[14px] font-semibold uppercase tracking-wide ${RUN_STATUS_CHIP[run.status]}`}
            >
              {t(`run.status.${run.status}` as TKey)}
            </span>
          </span>
        )}
      </div>
    </div>
  );

  // ── no run yet ───────────────────────────────────────────────────────────
  if (!run) {
    return (
      <div className="space-y-6 pb-8">
        {header}
        <EmptyState
          icon={<Radio size={28} />}
          title={t(queued ? "run.queued" : "run.idle")}
          sub={t(queued ? "run.queued.sub" : "run.idle.sub")}
        />
        {mission.status === "funded" && !queued && (
          <div className="text-center">
            <Btn onClick={startExecution} disabled={starting}>
              <Play size={14} /> {t("msn.start")}
            </Btn>
          </div>
        )}
      </div>
    );
  }

  const budgetPct = run.computeBudget > 0 ? run.computeUsed / run.computeBudget : 0;
  const budgetBarCls = budgetPct >= 0.9 ? "bg-danger" : budgetPct >= 0.7 ? "bg-warn" : "bg-fund";

  return (
    <div className="space-y-6 pb-8">
      {header}

      {mission.status === "changes_requested" && !running && <Btn onClick={startExecution} disabled={starting}><Play size={14} />{t("msn.start")}</Btn>}
      <PhaseRail events={events} running={running} />

      {mission.status === "needs_review" && (
        <div className="flex justify-end">
          <Link
            data-demo-action="review-artifact"
            to={`/missions/${mission.id}/review${providerDemo ? "?demo=provider" : ""}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-verif px-4 text-sm font-bold text-bg0 transition hover:brightness-110"
          >
            <GitPullRequest size={15} /> {t("msn.review.open")} <ChevronRight size={14} />
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── telemetry sidebar (first on mobile) ── */}
        <aside className="w-full space-y-4 lg:order-2 lg:w-1/3">
          <SideCard title={t("run.state")}>
            <StatusPill status={mission.status} pulse={running} />
            {run.currentActivity && (
              <div className="mt-3">
                <p className="text-[14px] text-dim">{t("run.activity")}</p>
                <p className="mt-1 flex items-start gap-2 text-sm leading-relaxed text-ink">
                  {running && <span className="cc-pulse mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dev" />}
                  <span>{lt(run.currentActivity)}</span>
                </p>
              </div>
            )}
            {run.outcomeNote && (
              <p className="mt-3 rounded-lg border border-line bg-bg2 px-3 py-2 text-xs leading-relaxed text-mut">
                {lt(run.outcomeNote)}
              </p>
            )}
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
              {run.model && (
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-dim">{t("run.model")}</dt>
                  <dd className="truncate font-mono text-mut">{run.model}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-dim">{t("run.attempt")}</dt>
                <dd className="font-mono text-mut">
                  {fmtInt(run.attempt, locale)} {t("run.of")} {fmtInt(run.maxAttempts, locale)}
                </dd>
              </div>
            </dl>
          </SideCard>

          <SideCard title={t("run.budget")}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-mono text-2xl font-bold text-ink">{fmtInt(run.computeUsed, locale)}</span>
              <span className="inline-flex items-center gap-1 text-xs text-dim">
                / <Credits n={run.computeBudget} /> {t("run.used")}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-bg3">
              <div className={`cc-progress-bar h-full rounded-full ${budgetBarCls}`} style={{ width: fmtPct(budgetPct) }} />
            </div>
            <p className="mt-2 text-xs text-dim">
              <span className="font-mono font-semibold text-ink">
                {fmtInt(Math.max(0, run.computeBudget - run.computeUsed), locale)}
              </span>{" "}
              {t("run.remaining")}
            </p>
          </SideCard>

          <EnvironmentCard events={events} />

          {testResults.length > 0 && (
            <SideCard title={t("run.experiments.title")}>
              <p className="text-sm font-semibold text-ink">
                {t("run.experiments.summary", { count: testResults.length, cases: fmtInt(executedTestCases, locale) })}
              </p>
              <p className={`mt-2 text-xs ${observedTestFailures > 0 ? "text-warn" : "text-verif"}`}>
                {t("run.experiments.failures", { count: observedTestFailures })}
              </p>
              <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                {testResults.map((event, index) => (
                  <div key={event.id} className="flex items-center justify-between gap-2 text-[14px]">
                    <span className="text-dim">{index === 0 ? t("rev.dossier.baseline") : t("rev.dossier.attempt", { count: event.payload?.attempt ?? index })}</span>
                    <span className="font-mono"><b className="text-verif">{event.payload?.tests?.pass ?? 0}</b><span className="text-dim">/{event.payload?.tests?.total ?? 0}</span>{(event.payload?.tests?.fail ?? 0) > 0 && <b className="ml-2 text-danger">{event.payload?.tests?.fail}✗</b>}</span>
                  </div>
                ))}
              </div>
            </SideCard>
          )}

          {latestTests && (
            <SideCard title={t("run.tests")}>
              <div className="flex items-end gap-5">
                <div>
                  <p className="font-mono text-2xl font-bold text-verif">{latestTests.pass}</p>
                  <p className="text-[14px] text-dim">{t("run.testsPass")}</p>
                </div>
                <div>
                  <p className={`font-mono text-2xl font-bold ${latestTests.fail > 0 ? "text-danger" : "text-mut"}`}>
                    {latestTests.fail}
                  </p>
                  <p className="text-[14px] text-dim">{t("run.testsFail")}</p>
                </div>
                <p className="ml-auto font-mono text-xs text-dim">{fmtDurMs(latestTests.durationMs)}</p>
              </div>
              {baselineTests && testResults.length > 1 && (
                <div className="mt-3 space-y-1 border-t border-line pt-2.5 font-mono text-[14px]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-dim">{t("rev.evidence.baseline")}</span>
                    <span>
                      <span className="text-verif">{baselineTests.pass}✓</span>{" "}
                      <span className={baselineTests.fail > 0 ? "text-danger" : "text-dim"}>{baselineTests.fail}✗</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-dim">{t("rev.evidence.final")}</span>
                    <span>
                      <span className="text-verif">{latestTests.pass}✓</span>{" "}
                      <span className={latestTests.fail > 0 ? "text-danger" : "text-dim"}>{latestTests.fail}✗</span>
                    </span>
                  </div>
                </div>
              )}
            </SideCard>
          )}

          {filesTouched.length > 0 && (
            <SideCard title={t("run.files")}>
              <ul className="space-y-1.5">
                {filesTouched.map((f) => (
                  <li key={f.path} className="flex items-center gap-2 font-mono text-[14px] text-mut">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${FILE_KIND_DOT[f.kind]}`} />
                    <span className="truncate">{f.path}</span>
                  </li>
                ))}
              </ul>
            </SideCard>
          )}

          <SideCard title={t("run.guardrails")}>
            <ul className="space-y-2">
              {GUARDRAIL_KEYS.map((k) => (
                <li key={k} className="flex items-center gap-2 text-sm text-mut">
                  <CheckCircle2 size={14} className="shrink-0 text-verif" />
                  {/*
                    The workspace row reports what was MEASURED. Every other row is
                    an unconditional engine guarantee; this one is not, and printing
                    it as though it were is how a reader ends up trusting the wrong
                    boundary in either direction.
                  */}
                  {t(
                    (k === "workspace" && boot?.execution.isolation?.osIsolated
                      ? "run.guard.workspaceIsolated"
                      : `run.guard.${k}`) as TKey
                  )}
                </li>
              ))}
            </ul>
          </SideCard>

          {run.langfuseTraceId && (
            <SideCard title={t("run.trace")}>
              <button
                onClick={() => copyTrace(run.langfuseTraceId!)}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-line bg-bg0 px-3 py-2 text-left transition-colors hover:border-line2"
                title={run.langfuseTraceId}
              >
                <span className="truncate font-mono text-xs text-mut">
                  {run.langfuseTraceId.length > 22 ? `${run.langfuseTraceId.slice(0, 22)}…` : run.langfuseTraceId}
                </span>
                {copied ? <Check size={13} className="shrink-0 text-verif" /> : <Copy size={13} className="shrink-0 text-dim" />}
              </button>
            </SideCard>
          )}

          {running && (
            <p className="rounded-xl border border-line2 bg-bg2 px-3 py-2 text-xs leading-relaxed text-dim">
              {t("run.cancelPolicy")}
            </p>
          )}
        </aside>

        {/* ── execution timeline ── */}
        <section className="min-w-0 flex-1 lg:order-1">
          <Card>
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="text-sm font-bold tracking-tight">{t("run.timeline")}</h2>
              <span className="font-mono text-xs text-dim">{events.length}</span>
            </div>
            <div ref={scrollerRef} onScroll={onTimelineScroll} className="max-h-[68vh] overflow-y-auto px-5 py-4">
              {events.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-dim">
                  <span className="cc-pulse h-2 w-2 rounded-full bg-dev" />
                  {t("run.connecting")}
                </div>
              ) : (
                <ol className="relative">
                  <span className="absolute bottom-2 left-3.5 top-2 w-px -translate-x-1/2 bg-line" aria-hidden />
                  {events.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </ol>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

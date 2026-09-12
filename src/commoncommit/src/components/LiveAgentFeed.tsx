import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Braces, CircleCheck, Clock3, FileSearch, Pause, Play, Radio, Search, TestTube2 } from "lucide-react";
import { useI18n, type TKey } from "../i18n/index.js";
import { api } from "../lib/api.js";
import { apiErrorText } from "../lib/errors.js";
import { globalStreamUrl, useStream } from "../lib/stream.js";
import { EmptyState, Skeleton, SourceBadge } from "./ui.js";
import type { AgentActivity } from "../../shared/types.js";

/**
 * Phase → copy. An exhaustive Record so adding a phase to the type is a compile
 * error here rather than a silent blank line, and a lookup miss (server ahead of
 * client) drops the step instead of substituting a neighbouring phase — see G31:
 * an unknown enum value must never quietly become a plausible one.
 */
const PHASE_KEYS: Record<AgentActivity["phase"], TKey> = {
  reading: "live.phase.reading",
  searching: "live.phase.searching",
  writing: "live.phase.writing",
  testing: "live.phase.testing",
  reviewing: "live.phase.reviewing",
  waiting: "live.phase.waiting",
};

const PHASE_ICONS: Record<AgentActivity["phase"], typeof Bot> = {
  reading: FileSearch,
  searching: Search,
  writing: Braces,
  testing: TestTube2,
  reviewing: CircleCheck,
  waiting: Clock3,
};

/** How many steps of history stay on screen above the current one. */
const TRAIL = 4;

/** Refetches are coalesced: a run emits events far faster than this strip reads. */
const COALESCE_MS = 1200;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Types `text` out one character at a time. When disabled it is a no-op pass-through. */
function useTypewriter(text: string, enabled: boolean): string {
  const [n, setN] = useState(text.length);
  useEffect(() => {
    if (!enabled) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = window.setInterval(() => {
      setN((prev) => {
        if (prev >= text.length) {
          window.clearInterval(id);
          return prev;
        }
        return prev + 1;
      });
    }, 26);
    return () => window.clearInterval(id);
  }, [text, enabled]);
  return text.slice(0, n);
}

/**
 * Live agent activity strip.
 *
 * The steps are engine events, not decoration: each carries its own source, so a
 * scripted demo step and a real engine observation can never look the same. The
 * component never synthesises a step to keep the animation going — an idle
 * engine renders the idle state.
 */
export function LiveAgentFeed() {
  const { t, lt } = useI18n();
  const reduced = usePrefersReducedMotion();
  const [activities, setActivities] = useState<AgentActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const aliveRef = useRef(true);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.liveActivity();
      // Paused means "stop changing what I am reading", so a fetch already in
      // flight when the user paused must not land.
      if (!aliveRef.current || pausedRef.current) return;
      const ordered = [...res.activities].sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
      );
      setActivities(ordered);
      setError(null);
    } catch (e) {
      if (!aliveRef.current) return;
      setError(apiErrorText(e, t));
      setActivities((prev) => prev ?? []);
    }
  }, [t]);

  const schedule = useCallback(() => {
    if (pausedRef.current || timerRef.current !== null) return;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void load();
    }, COALESCE_MS);
  }, [load]);

  // Also the initial load. Resuming refetches immediately, because what was on
  // screen while paused is by definition stale.
  useEffect(() => {
    if (!paused) void load();
  }, [paused, load]);

  // The strip follows the same SSE stream the execution room uses; `onConnect`
  // refetches so a dropped connection cannot leave a stale "current" step
  // frozen on the landing page pretending to be live.
  useStream(
    globalStreamUrl(),
    (msg) => {
      if (msg.kind === "exec_event" || msg.kind === "run_update") schedule();
    },
    () => {
      if (!pausedRef.current) void load();
    }
  );

  // Everything derived is computed before the loading early-return: the
  // typewriter is a hook and must run on every render, current step or not.
  const list = activities ?? [];
  const current = list.length > 0 ? list[list.length - 1] : undefined;
  const last = Math.max(0, list.length - 1);
  const trail = list.slice(Math.max(0, last - TRAIL), last);
  const currentKey = current ? PHASE_KEYS[current.phase] : undefined;
  const currentPhase = currentKey ? t(currentKey) : "";
  const currentAction = current ? lt(current.label) : "";
  const typed = useTypewriter(currentAction, !reduced && !paused);
  /*
   * Two fallbacks, both about not asserting more than we have:
   *  - an unknown phase leaves `currentPhase` empty (see PHASE_KEYS), so the
   *    spoken line uses the engine's own words instead of a bare project name;
   *  - with nothing loaded and a failed request this stays SILENT rather than
   *    announcing "no agent is running", which would claim an idle engine we
   *    never managed to ask. The role="alert" below speaks instead.
   */
  const srText = current
    ? `${current.projectName} — ${currentPhase || lt(current.label)}`
    : error !== null
      ? ""
      : t("live.idle");

  if (activities === null) return <Skeleton className="h-56 w-full" />;

  return (
    <div className="cc-glass rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        {/*
          No section title here: the page that mounts this strip owns the
          heading, and a second copy of it would be a duplicated landmark. What
          this row carries instead is which project the current step belongs to.
        */}
        <Radio size={14} className={paused ? "shrink-0 text-dim" : "cc-pulse shrink-0 text-brand2"} aria-hidden />
        {current !== undefined && (
          <span className="min-w-0 truncate font-mono text-xs text-mut">{current.projectName}</span>
        )}
        {/*
          Anything that repaints on its own needs a way to stop it. Pausing also
          stops applying server updates, so a reader can finish a line.

          No `aria-pressed`: the label itself flips, and a button announced as
          "Play, pressed" tells a screen reader the opposite of what it means.
        */}
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-line2 px-3 py-1.5 text-xs font-semibold text-mut transition-colors hover:text-ink"
        >
          {paused ? <Play size={12} aria-hidden /> : <Pause size={12} aria-hidden />}
          {paused ? t("tm.play") : t("tm.pause")}
        </button>
      </div>

      {/*
        One polite announcement carrying the WHOLE current phase. The typed line
        below is aria-hidden: routing a typewriter through a live region makes a
        screen reader read the same sentence one character at a time.
      */}
      <p className="sr-only" aria-live="polite">
        {srText}
      </p>

      {/*
        Rendered even when steps are still on screen. This strip's whole claim is
        "right now", so a failed refresh has to be visible: leaving the last
        snapshot standing silently presents a stale state as the current one.
      */}
      {error !== null && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {current === undefined ? (
        // The idle copy is withheld after a failure. "No agent is running" is a
        // claim about the engine; all a failed request establishes is that we do
        // not know, and the alert above already says so.
        error === null && <EmptyState icon={<Bot size={22} />} title={t("live.idle")} sub={t("live.idleSub")} />
      ) : (
        <>
          <div className="cc-agent-stage relative mb-4 overflow-hidden rounded-xl border border-brand/25 bg-bg0/65 p-4">
            <span className="cc-agent-scanline absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand2 to-transparent" aria-hidden />
            <div className="relative flex items-center gap-4">
              <span className="cc-agent-orbit relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand2/45 bg-brand/10 text-brand-text">
                {(() => {
                  const PhaseIcon = PHASE_ICONS[current.phase];
                  return <PhaseIcon size={21} aria-hidden />;
                })()}
                <span className="absolute -inset-1 rounded-full border border-brand2/25" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-bold text-ink">{current.projectName}</p>
                  <span className="inline-flex items-end gap-0.5" aria-hidden>
                    {[0, 1, 2, 3, 4].map((bar) => (
                      <span key={bar} className="cc-agent-wave w-1 rounded-full bg-brand2" style={{ animationDelay: `${bar * 0.12}s` }} />
                    ))}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-6 gap-1" aria-hidden>
                  {(Object.keys(PHASE_KEYS) as AgentActivity["phase"][]).map((phase) => (
                    <span
                      key={phase}
                      className={`h-1.5 rounded-full transition-colors ${phase === current.phase ? "cc-agent-progress bg-brand2" : "bg-line2"}`}
                    />
                  ))}
                </div>
                {currentPhase !== "" && (
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-brand-text">
                    {currentPhase}
                  </p>
                )}
              </div>
            </div>
          </div>

          {current.evidence.length > 0 && (
            <div className="mb-4 rounded-xl border border-line bg-bg0/55 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-dim">{t("live.evidence")}</p>
                <span className="font-mono text-[10px] text-dim">{current.evidence.length}</span>
              </div>
              <ol className="space-y-2.5">
                {current.evidence.map((evidence, index) => (
                  <li
                    key={`${current.runId}-${evidence.at}-${evidence.type}-${index}`}
                    className="rounded-lg border border-line bg-bg1/70 p-2.5"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wide text-dim">
                        {evidence.type.replaceAll("_", " ")}
                      </span>
                      <SourceBadge source={evidence.source} verified={evidence.verified} />
                    </div>
                    <p className="mt-1 break-words text-xs font-semibold leading-relaxed text-ink">
                      {lt(evidence.label)}
                    </p>
                    {evidence.detail && (
                      <p className="mt-1 whitespace-pre-line break-words text-[11px] leading-relaxed text-mut">
                        {lt(evidence.detail)}
                      </p>
                    )}
                    {evidence.files && evidence.files.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {evidence.files.map((file) => (
                          <li
                            key={`${evidence.at}-${file.path}`}
                            className="rounded border border-dev/25 bg-dev/5 px-1.5 py-0.5 font-mono text-[10px] text-dev"
                          >
                            {file.kind === "add" ? "+" : file.kind === "delete" ? "−" : "±"} {file.path}
                          </li>
                        ))}
                      </ul>
                    )}
                    {evidence.tests && (
                      <p className="mt-2 font-mono text-[11px] text-mut">
                        <span className="font-semibold text-verif">{evidence.tests.pass}✓</span>{" "}
                        <span className={evidence.tests.fail > 0 ? "font-semibold text-danger" : "text-dim"}>
                          {evidence.tests.fail}✗
                        </span>{" "}
                        / {evidence.tests.total}
                        {evidence.command ? ` · $ ${evidence.command}` : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <ol className="space-y-2">
            {trail.map((a, i) => {
              const key = PHASE_KEYS[a.phase];
              if (!key) return null;
              // Rows fade with distance from the bottom, which is ordering by
              // how recently each RUN last emitted — not elapsed history of one
              // agent. Nothing here is a completed step of the run named above.
              const depth = trail.length - i;
              return (
                <li
                  key={`${a.runId}-${a.at}-${i}`}
                  className="cc-event-in flex min-w-0 flex-wrap items-center gap-2 font-mono text-xs text-dim"
                  style={{ opacity: Math.max(0.28, 1 - depth * 0.18) }}
                >
                  {/*
                    A neutral bullet, not a check mark. A step being above the
                    current line does not mean it succeeded — a green tick beside
                    "running the test suite" would claim a passing result we were
                    never told.
                  */}
                  <span className="text-dim" aria-hidden>
                    ·
                  </span>
                  {/*
                    Each row is a DIFFERENT run's current step (api.liveActivity
                    returns one per running mission), so every row carries its own
                    project. Without it the list reads as a step-by-step history of
                    the single project named in the header — a narrative the
                    payload does not contain.
                  */}
                  <span className="min-w-0 truncate font-semibold text-mut">{a.projectName}</span>
                  <span className="min-w-0 break-words">{t(key)}</span>
                  <SourceBadge source={a.source} verified={false} />
                </li>
              );
            })}
          </ol>

          {/* No phase copy means the server sent a phase this build does not
              know. The line is dropped rather than filled with a neighbouring
              phase; the engine's own label below still says what is happening. */}
          {currentAction !== "" && (
            <p className="mt-3 flex min-w-0 flex-wrap items-center gap-2 font-mono text-sm text-ink" aria-hidden>
              <span className="text-brand2">›</span>
              <span className="min-w-0 break-words">{typed}</span>
              {!reduced && !paused && <span className="cc-caret text-brand2">▍</span>}
            </p>
          )}

          {current.detail && (
            <p className="mt-1.5 min-w-0 whitespace-pre-line break-words pl-4 text-xs leading-relaxed text-mut">
              {lt(current.detail)}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
            {/*
              `verified` is hardcoded false: AgentActivity carries no per-event
              verified flag, so an engine-sourced step renders as an engine
              OBSERVATION, never as verified evidence. Upgrading it here would
              invent a guarantee the payload does not make.
            */}
            <SourceBadge source={current.source} verified={current.verified} />
            <Link
              to={`/missions/${current.missionId}/run`}
              className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-brand-text hover:underline"
            >
              {t("live.watch")} →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

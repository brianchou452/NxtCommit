import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CircleCheck, CircleDot, Pause, Play, Tag, Telescope, TriangleAlert } from "lucide-react";
import { useI18n } from "../i18n/index.js";
import { fmtDate, fmtInt } from "../lib/format.js";
import type { TimeMachineFrame } from "../../shared/types.js";

/** Frames advance this slowly on purpose: each one is three numbers and a sentence. */
const FRAME_MS = 3600;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The project across time: what it was, what it is, and what the funded backlog
 * PROJECTS it becoming.
 *
 * The one defect this component exists to avoid is rendering a projection with
 * the authority of an observation. `kind === "future"` therefore drives real
 * differences, not a label: a dashed filmstrip cell, dashed panel, amber instead
 * of ink, a telescope mark, and `tm.projectionNote` shown the entire time that
 * frame is active. Everything else on the page is measured; this one thing has
 * not happened yet, and a reader glancing at a screenshot must be able to tell.
 *
 * A11y shape: this is a tablist, not a carousel of divs. Arrow keys move between
 * frames, Home/End jump to the ends, and only the selected tab is in the tab
 * order. Playback is opt-in (never autoplaying, so nothing moves under a reader
 * who did not ask for it), the pause control is visible whenever it is running,
 * and the panel is an `aria-live` region only while it is auto-advancing —
 * announcing every manual arrow press would double up with the tab's own label.
 */
export function TimeMachine({
  frames,
  className = "",
}: {
  frames: TimeMachineFrame[];
  className?: string;
}) {
  const { t, lt, locale } = useI18n();
  const baseId = useId();
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduce, setReduce] = useState(reducedMotion);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // A projection strip that scrubs itself is exactly the kind of ambient motion
  // reduced-motion asks us to drop; if the preference flips mid-session we stop.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      setReduce(query.matches);
      if (query.matches) setPlaying(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!playing || reduce || frames.length < 2) return;
    const timer = window.setInterval(() => setSelected((i) => (i + 1) % frames.length), FRAME_MS);
    return () => window.clearInterval(timer);
  }, [playing, reduce, frames.length]);

  const select = useCallback((index: number, focus: boolean) => {
    setSelected(index);
    // Any deliberate navigation wins over playback: the reader is scrubbing now.
    setPlaying(false);
    if (focus) tabRefs.current[index]?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = frames.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    select(next, true);
  };

  if (frames.length === 0) return null;

  const active = Math.min(selected, frames.length - 1);
  const frame = frames[active];
  const isProjection = frame.kind === "future";

  const dateOf = (iso: string) => fmtDate(iso, locale);

  return (
    <section className={`cc-glass rounded-2xl p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-ink">{t("tm.title")}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-dim">{t("tm.sub")}</p>
        </div>
        {frames.length > 1 && !reduce && (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? t("tm.pause") : t("tm.play")}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-line2 px-3 text-xs font-semibold text-mut transition-colors hover:bg-bg3 hover:text-ink"
          >
            {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
            {playing ? t("tm.pause") : t("tm.play")}
          </button>
        )}
      </div>

      {/* filmstrip */}
      <div
        role="tablist"
        aria-label={t("tm.title")}
        /*
         * Rotation stops as soon as focus lands anywhere in the strip. Without
         * this, a reader who presses Play and then shift-tabs back into the
         * filmstrip is left holding a button the interval has since deselected:
         * focus sits on an element whose `tabIndex` has flipped to -1 while the
         * selected tab is somewhere else, and the roving tabindex no longer
         * describes where the reader is. Stopping is also what the reader almost
         * certainly wants — arriving by keyboard is arriving to steer.
         */
        onFocus={() => setPlaying(false)}
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {frames.map((f, i) => {
          const projection = f.kind === "future";
          const current = i === active;
          return (
            <button
              key={`${f.kind}-${f.at}`}
              ref={(node) => {
                tabRefs.current[i] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${i}`}
              aria-selected={current}
              aria-controls={`${baseId}-panel`}
              tabIndex={current ? 0 : -1}
              onClick={() => select(i, false)}
              onKeyDown={(event) => onKeyDown(event, i)}
              className={`min-h-11 min-w-[6.5rem] flex-1 cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors ${
                projection ? "border-dashed" : ""
              } ${
                current
                  ? projection
                    ? "border-warn/70 bg-warn/10"
                    : "border-brand/60 bg-brand/10"
                  : "border-line2 bg-bg2/50 hover:bg-bg3"
              }`}
            >
              <span
                className={`flex items-center gap-1 text-[14px] font-semibold uppercase tracking-wide ${
                  projection ? "text-warn" : current ? "text-brand-text" : "text-dim"
                }`}
              >
                {projection && <Telescope size={10} aria-hidden />}
                {t(f.kind === "past" ? "tm.past" : f.kind === "present" ? "tm.present" : "tm.future")}
              </span>
              <span className="mt-0.5 block truncate text-xs font-semibold text-ink">{lt(f.label)}</span>
              <span className="block truncate font-mono text-[14px] text-dim">{dateOf(f.at)}</span>
            </button>
          );
        })}
      </div>

      {/* active frame */}
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        aria-live={playing ? "polite" : "off"}
        tabIndex={0}
        className={`mt-4 rounded-xl border p-4 ${
          isProjection ? "border-dashed border-warn/60 bg-warn/5" : "border-line bg-bg2/60"
        }`}
      >
        {/*
          A count is OPTIONAL, and rendering a missing one as "0" would state a
          measurement nobody took — a project that has never been executed has no
          test result, which is a different fact from a suite that ran and passed
          nothing. `tm.notMeasured` is shown instead, in muted type, so the reader
          can see the difference at a glance.
        */}
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Metric
            icon={<CircleDot size={13} className="translate-y-0.5 text-mut" aria-hidden />}
            value={frame.openIssues}
            label={t("tm.openIssues")}
            notMeasured={t("tm.notMeasured")}
            isProjection={isProjection}
            locale={locale}
          />
          <Metric
            icon={<CircleCheck size={13} className="translate-y-0.5 text-mut" aria-hidden />}
            value={frame.passingTests}
            label={t("tm.passingTests")}
            notMeasured={t("tm.notMeasured")}
            isProjection={isProjection}
            locale={locale}
          />
          {/* Absent on a projection by construction — there is no released version
              of work that has not happened, so nothing is rendered in its place. */}
          {frame.releasedVersion && (
            <span className="inline-flex items-baseline gap-2">
              <Tag size={13} className="translate-y-0.5 text-mut" aria-hidden />
              <span className="font-mono text-lg font-bold text-ink">{frame.releasedVersion}</span>
              <span className="text-xs text-dim">{t("tm.version")}</span>
            </span>
          )}
        </div>

        {/*
          A bare `1.4.1` in the same weight as the measured counts reads as a
          published release. Nothing is published: the release transition records
          local prototype state and pushes nothing upstream, which is a claim
          SECURITY.md is explicit about and the UI must not quietly widen.
        */}
        {frame.releasedVersion && (
          <p className="mt-2 text-[14px] leading-relaxed text-dim">{t("tm.versionLocal")}</p>
        )}

        <p className="mt-3 text-sm leading-relaxed text-mut">{lt(frame.note)}</p>

        {isProjection && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs font-medium leading-relaxed text-warn">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>{t("tm.projectionNote")}</span>
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * One measured figure, or an explicit "not measured".
 *
 * Extracted so the absent case cannot be handled differently in two places. The
 * missing value is deliberately rendered in the SAME slot as a real one rather
 * than omitted entirely: a silently missing row reads as "there is nothing to say
 * here", while "Not measured" reads as "nobody looked", and only the second is
 * true.
 */
function Metric({
  icon,
  value,
  label,
  notMeasured,
  isProjection,
  locale,
}: {
  icon: React.ReactNode;
  value: number | undefined;
  label: string;
  notMeasured: string;
  isProjection: boolean;
  locale: Parameters<typeof fmtInt>[1];
}) {
  return (
    <span className="inline-flex items-baseline gap-2">
      {icon}
      {value === undefined ? (
        <span className="font-mono text-sm italic text-dim">{notMeasured}</span>
      ) : (
        <span className={`font-mono text-lg font-bold ${isProjection ? "text-warn" : "text-ink"}`}>
          {fmtInt(value, locale)}
        </span>
      )}
      <span className="text-xs text-dim">{label}</span>
    </span>
  );
}

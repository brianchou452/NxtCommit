import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Bug, HeartPulse, Wrench, Zap } from "lucide-react";
import { useI18n, type TKey } from "../i18n/index.js";
import { fmtInt } from "../lib/format.js";
import type { ImpactSnapshotState } from "../lib/useImpactSnapshot.js";
import { DataModeBadge, Skeleton, Sparkline } from "./ui.js";
import type { ImpactStats } from "../../shared/types.js";

/**
 * `home.impact.trend` says "last 14 days" in both locales. The sparkline is
 * therefore rendered only when the series actually covers 14 days — a 6-point
 * series under a 14-day label is a false claim about the window, which is the
 * same defect as an unlabelled number, just quieter.
 */
const TREND_DAYS = 14;

const COUNT_UP_MS = 1100;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const STEPS: { key: TKey; icon: typeof Zap; field: keyof Pick<ImpactStats, "tokensDonated" | "featuresBuilt" | "bugsFixed" | "projectsRevived"> }[] = [
  { key: "home.impact.tokens", icon: Zap, field: "tokensDonated" },
  { key: "home.impact.features", icon: Wrench, field: "featuresBuilt" },
  { key: "home.impact.bugs", icon: Bug, field: "bugsFixed" },
  { key: "home.impact.projects", icon: HeartPulse, field: "projectsRevived" },
];

/**
 * One link in the chain.
 *
 * The count-up starts only once the row is on screen, and until then the value
 * slot is deliberately EMPTY rather than `0`. A rendered zero is a measurement
 * claim ("nothing has been donated"), and an animation's starting frame is not
 * a measurement at all.
 */
function Step({ label, icon: Icon, target, run }: { label: string; icon: typeof Zap; target: number; run: boolean }) {
  const { locale } = useI18n();
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!run) return;
    if (reducedMotion()) {
      setShown(target);
      return;
    }
    let raf = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / COUNT_UP_MS);
      // easeOutCubic: most of the distance early, so the final digits settle.
      setShown(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    /**
     * Guarantees the EXACT figure regardless of whether the animation ever ran.
     *
     * `requestAnimationFrame` does not fire in a hidden or occluded tab, and
     * `setTimeout` does. Without this, a page opened in a background tab renders a
     * partially-counted number and keeps it — measured 11,579,355 frozen against a
     * real 19,020,000, and "1 feature built" against a real 2. An intermediate
     * frame is decoration, but a frozen intermediate frame is a WRONG NUMBER on
     * the one surface whose whole job is to be trustworthy.
     *
     * It self-heals on refocus (the elapsed time then exceeds the duration and the
     * next frame clamps to 1), but "correct once you look away and back" is not a
     * property worth relying on. The timer is idempotent with the animation: both
     * paths converge on the same value.
     */
    const settle = setTimeout(() => setShown(target), COUNT_UP_MS + 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [run, target]);

  return (
    <li className="cc-glass cc-lift flex-1 rounded-2xl px-5 py-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-mut">
        <Icon size={14} className="shrink-0 text-brand2" aria-hidden />
        {label}
      </p>
      <p className="mt-2 min-h-[1.1em] font-mono text-[30px] font-extrabold leading-none tracking-tight text-ink sm:text-[32px]">
        {/*
          The count-up's intermediate frames are decoration; only the final
          figure was ever measured. Assistive tech therefore gets the real value
          and nothing else — a screen reader must not read out a number the
          database never held, and it has no way to tell that what it read was a
          frame of an animation.
        */}
        <span aria-hidden>{shown === null ? "" : fmtInt(shown, locale)}</span>
        <span className="sr-only">{fmtInt(target, locale)}</span>
      </p>
    </li>
  );
}

/** The `↓` / `→` between the links. Purely presentational, so it is hidden. */
function ChainLink() {
  return (
    <li aria-hidden className="flex items-center justify-center text-brand/60 md:px-0.5">
      <ArrowDown size={18} className="md:hidden" />
      <ArrowRight size={18} className="hidden md:block" />
    </li>
  );
}

/**
 * The first screen's four figures, read as a chain of consequence:
 * tokens donated → features built → bugs fixed → projects revived.
 *
 * At 390px the chain runs vertically with `↓` between links; a horizontal chain
 * of four numbers cannot fit there without truncating the labels, and a
 * truncated label is worse than a re-flowed one.
 *
 * Provenance is rendered in the same block as the numbers, never in a tooltip:
 * a screenshot of this section has to carry its own label.
 */
export function ImpactCounters({ state, onRetry }: { state: ImpactSnapshotState; onRetry: () => void }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const rowRef = useRef<HTMLOListElement>(null);
  const stats = state.status === "ready" ? state.stats : null;

  // The counters animate on first reveal only; once seen we stop observing so a
  // scroll back up does not re-run the numbers as if they had changed.
  useEffect(() => {
    const node = rowRef.current;
    if (!node || visible) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      // threshold 0, not a ratio: the value slot is empty until `run` flips, so an
      // observer that never fires does not merely skip the animation, it leaves
      // the page's primary claim blank. Nothing here is worth that risk.
      { threshold: 0 }
    );
    io.observe(node);
    return () => io.disconnect();
    // `stats` is a dependency because the row does not exist until the figures
    // load — without it the observer would attach to nothing and the counters
    // would stay blank forever.
  }, [visible, stats]);

  if (state.status === "error") {
    return (
      // role=alert because this block replaces the figures after the page has
      // settled; without it the numbers simply never appear and a non-sighted
      // reader is told nothing at all.
      <div role="alert" className="rounded-2xl border border-line bg-bg1 px-5 py-8 text-center">
        <p className="text-sm font-semibold text-danger">{t("common.error")}</p>
        <button
          onClick={onRetry}
          className="mt-2 inline-flex min-h-11 cursor-pointer items-center justify-center px-3 text-sm text-fund underline"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const trend = stats && stats.trend.length >= TREND_DAYS ? stats.trend.slice(-TREND_DAYS) : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-lg font-bold tracking-tight">{t("home.impact.title")}</h2>
        {stats && (
          <>
            <span className="rounded-full border border-line2 px-2.5 py-0.5 text-[11px] font-semibold text-mut">
              {t(stats.windowLabel === "today" ? "home.impact.today" : "home.impact.allTime")}
            </span>
            <DataModeBadge mode={stats.dataMode} />
          </>
        )}
      </div>

      {!stats ? (
        <div className="flex flex-col gap-2 md:flex-row">
          {STEPS.map((s) => (
            <Skeleton key={s.key} className="h-[86px] flex-1" />
          ))}
        </div>
      ) : (
        <ol ref={rowRef} className="flex flex-col gap-2 md:flex-row md:items-stretch">
          {STEPS.map((step, i) => (
            <Fragment key={step.key}>
              {i > 0 && <ChainLink />}
              <Step label={t(step.key)} icon={step.icon} target={stats[step.field]} run={visible} />
            </Fragment>
          ))}
        </ol>
      )}

      {trend && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[11px] font-medium text-dim">{t("home.impact.trend")}</span>
          <Sparkline points={trend} color="var(--color-brand2)" width={150} height={28} />
        </div>
      )}

      {stats && (
        <>
        <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-dim">{t("home.impact.demoNote")}</p>
        {/*
          The headline figure is a UNIT CONVERSION of a real ledger total, not a
          token count anybody observed. `demoNote` above covers the seeded-data
          half; this covers the arithmetic half, because "1.4B tokens" printed as an
          exact integer implies a precision the ratio does not have.
        */}
        <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-dim">{t("home.impact.tokensBasis")}</p>
        </>
      )}
    </div>
  );
}

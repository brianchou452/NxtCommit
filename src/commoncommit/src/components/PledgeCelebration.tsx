import { useEffect, useState, type CSSProperties } from "react";
import { Rocket, Zap } from "lucide-react";
import { useI18n } from "../i18n/index.js";
import { fmtInt } from "../lib/format.js";
import { useApp } from "../state/AppContext.js";

const PARTICLES = Array.from({ length: 14 }, (_, index) => ({
  angle: index * (360 / 14),
  distance: 72 + (index % 4) * 18,
  delay: (index % 5) * 45,
}));

/** Global success moment: the pledge dialog may close without cutting it off. */
export function PledgeCelebration() {
  const { t, locale } = useI18n();
  const { pledgeCelebration, dismissPledgeCelebration } = useApp();
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (!pledgeCelebration) return;
    const id = window.setTimeout(
      () => dismissPledgeCelebration(pledgeCelebration.id),
      reduced ? 2200 : 3400
    );
    return () => window.clearTimeout(id);
  }, [dismissPledgeCelebration, pledgeCelebration, reduced]);

  if (!pledgeCelebration) return null;
  const content = pledgeCelebration.executionStarting ? t("pledgeFx.starting") : t("pledgeFx.funded");

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center" aria-live="polite">
      {!reduced && <div className="cc-pledge-backdrop absolute inset-0 bg-bg0/35" aria-hidden />}
      <div
        key={pledgeCelebration.id}
        className={`relative flex flex-col items-center text-center ${reduced ? "cc-glass rounded-2xl p-5 shadow-2xl" : "cc-pledge-pop"}`}
      >
        {!reduced && (
          <div className="absolute left-1/2 top-1/2" aria-hidden>
            {PARTICLES.map((particle, index) => (
              <span
                key={index}
                className="cc-pledge-particle absolute h-2 w-2 rounded-full bg-fund"
                style={{
                  "--cc-particle-angle": `${particle.angle}deg`,
                  "--cc-particle-distance": `${particle.distance}px`,
                  animationDelay: `${particle.delay}ms`,
                } as CSSProperties}
              />
            ))}
          </div>
        )}
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-fund/60 bg-fund/15 text-fund shadow-[0_0_45px_12px_color-mix(in_srgb,var(--color-fund)_30%,transparent)]">
          {pledgeCelebration.executionStarting ? <Rocket size={34} aria-hidden /> : <Zap size={36} fill="currentColor" aria-hidden />}
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-fund">{t("pledgeFx.title")}</p>
        <p className="mt-2 max-w-sm text-2xl font-extrabold tracking-tight text-ink">
          {fmtInt(pledgeCelebration.amount, locale)} {t("pledgeFx.credits")}
        </p>
        <p className="mt-1 max-w-sm text-sm font-semibold text-mut">
          {pledgeCelebration.projectName} · {content}
        </p>
      </div>
    </div>
  );
}

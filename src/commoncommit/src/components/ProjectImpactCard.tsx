import { useId } from "react";
import { BadgeCheck, Download, Network, PenLine } from "lucide-react";
import { useI18n } from "../i18n/index.js";
import { fmtCompact } from "../lib/format.js";
import { DataModeBadge, GeneratorBadge } from "./ui.js";
import type { ImpactCard } from "../../shared/types.js";

/**
 * "If this project disappeared, what would the world lose?"
 *
 * This is the most persuasive surface in the product, which makes it the most
 * dangerous. Everything here is built so the card cannot borrow authority it has
 * not earned:
 *
 *  - Every consequence carries its own basis tag, per line, in the line's own
 *    styling. A single note at the bottom saying "some of this is editorial"
 *    would let a screenshot of one bullet imply measurement. `measured` gets the
 *    solid green treatment this codebase already reserves for engine-observed
 *    facts; `editorial` gets a dashed border and the amber it already uses for
 *    "written, not observed".
 *  - Scale is shown only when it was measured. `impactcard.noScale` replaces it
 *    otherwise, because "0 dependent packages" reads as a finding, and for a
 *    bundled fixture it would be a fabricated one.
 */
export function ProjectImpactCard({
  impact,
  variant = "narrative",
  className = "",
}: {
  impact: ImpactCard;
  variant?: "narrative" | "evidence";
  className?: string;
}) {
  const { t, lt, locale } = useI18n();
  const titleId = useId();
  const hasScale = impact.dependents !== undefined || impact.weeklyDownloads !== undefined;
  const measuredConsequences = impact.consequences.filter((consequence) => consequence.basis === "measured");
  const hasObservedScale = impact.dataMode === "live" && hasScale;

  /*
   * Mission detail already owns the project-specific "if it disappears"
   * narrative. Its secondary card may therefore add only distinct evidence,
   * never repeat the headline or editorial consequences. With no observed
   * signal, omitting the card is more honest than filling space with a second
   * version of the same claim.
   */
  if (variant === "evidence") {
    if (!hasObservedScale && measuredConsequences.length === 0) return null;

    return (
      <section aria-labelledby={titleId} className={`dc-project-signals ${className}`}>
        <header>
          <div>
            <span>OBSERVED PROJECT SIGNALS</span>
            <h2 id={titleId}>{t("impactcard.evidenceTitle")}</h2>
            <p>{t("impactcard.evidenceSub")}</p>
          </div>
          <DataModeBadge mode={impact.dataMode} />
        </header>

        {hasObservedScale && (
          <div className="dc-project-signal-metrics">
            {impact.dependents !== undefined && (
              <span><Network size={18} aria-hidden /><b>{fmtCompact(impact.dependents, locale)}</b><small>{t("impactcard.dependents")}</small></span>
            )}
            {impact.weeklyDownloads !== undefined && (
              <span><Download size={18} aria-hidden /><b>{fmtCompact(impact.weeklyDownloads, locale)}</b><small>{t("impactcard.weekly")}</small></span>
            )}
          </div>
        )}

        {measuredConsequences.length > 0 && (
          <div className="dc-project-signal-evidence">
            <span>{t("impactcard.measuredEvidence")}</span>
            <ul>{measuredConsequences.map((consequence, index) => <li key={index}><BadgeCheck size={16} aria-hidden /><p>{lt(consequence.text)}</p></li>)}</ul>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      className={`cc-glass overflow-hidden rounded-2xl ${className}`}
    >
      <div className="border-b border-line/70 bg-gradient-to-br from-brand/12 to-transparent p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id={titleId} className="text-sm font-semibold uppercase tracking-wide text-dim">
            {t("impactcard.title")}
          </h2>
          <GeneratorBadge generator={impact.generator} />
        </div>
        <p className="text-xl font-bold leading-snug tracking-tight text-ink sm:text-2xl">
          {lt(impact.headline)}
        </p>

        {hasScale ? (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            {impact.dependents !== undefined && (
              <span className="inline-flex items-baseline gap-2">
                <Network size={14} className="translate-y-0.5 text-mut" aria-hidden />
                <span className="font-mono text-lg font-bold text-ink">
                  {fmtCompact(impact.dependents, locale)}
                </span>
                <span className="text-xs text-dim">{t("impactcard.dependents")}</span>
              </span>
            )}
            {impact.weeklyDownloads !== undefined && (
              <span className="inline-flex items-baseline gap-2">
                <Download size={14} className="translate-y-0.5 text-mut" aria-hidden />
                <span className="font-mono text-lg font-bold text-ink">
                  {fmtCompact(impact.weeklyDownloads, locale)}
                </span>
                <span className="text-xs text-dim">{t("impactcard.weekly")}</span>
              </span>
            )}
          </div>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-dim">{t("impactcard.noScale")}</p>
        )}

        {/*
          The figures above are the most persuasive thing on this card and, for a
          seeded project, they are authored numbers for a fictional package. The
          label therefore sits in the SAME viewport as them rather than in a
          tooltip or a section header a screenshot would crop out — and it is
          derived from `impact.dataMode`, so it cannot be forgotten on a surface
          that renders this component somewhere new.
        */}
        {hasScale && impact.dataMode === "demo" && (
          <p className="mt-3 flex items-start gap-2 text-[14px] leading-relaxed text-warn">
            <DataModeBadge mode="demo" />
            <span>{t("impactcard.scaleDemo")}</span>
          </p>
        )}
      </div>

      {/*
        An imported project with no registry data and no bundled copy yields no
        consequences at all — `measuredConsequences` writes a line only when it is
        holding the number for it. The block goes away entirely rather than
        rendering a "What would happen" heading over an empty list followed by a
        note explaining a tagging scheme that has nothing to tag. An empty section
        reads as a load failure, which invites the reader to wait for a claim that
        is never coming.
      */}
      {impact.consequences.length > 0 && (
        <div className="p-5 sm:p-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-dim">
            {t("impactcard.consequences")}
          </h3>
          <ul className="space-y-2.5">
            {impact.consequences.map((consequence, i) => {
              const measured = consequence.basis === "measured";
              return (
                <li
                  key={i}
                  className={`flex flex-col gap-2 rounded-lg border-l-2 py-2.5 pl-3 pr-3 sm:flex-row sm:items-start sm:gap-3 ${
                    measured
                      ? "border-l-verif bg-verif/5"
                      : "border-l-warn border-dashed bg-bg0/30"
                  }`}
                >
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 self-start rounded border px-1.5 py-0.5 text-[14px] font-semibold ${
                      measured
                        ? "border-verif/40 bg-verif/10 text-verif"
                        : "border-warn/40 bg-warn/5 text-warn"
                    }`}
                  >
                    {measured ? <BadgeCheck size={10} aria-hidden /> : <PenLine size={10} aria-hidden />}
                    {measured ? t("impactcard.measured") : t("impactcard.editorial")}
                  </span>
                  <p className="text-sm leading-relaxed text-mut">{lt(consequence.text)}</p>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 border-t border-line pt-3 text-[14px] leading-relaxed text-dim">
            {t("impactcard.basisNote")}
          </p>
        </div>
      )}
    </section>
  );
}

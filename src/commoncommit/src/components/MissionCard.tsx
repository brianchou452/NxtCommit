import { Link } from "react-router-dom";
import { Download, FlaskConical, Star, Users } from "lucide-react";
import { useI18n } from "../i18n/index.js";
import { fmtCompact, fmtPct } from "../lib/format.js";
import { Avatar, Credits, FourDimsStrip, ModeBadge, RiskBadge, StatusPill } from "./ui.js";
import type { MissionWithProject } from "../../shared/types.js";

/**
 * Mission card. Reads top-to-bottom as: which project → what the mission is →
 * why it matters → how far along → who is behind it. The funding bar is the
 * single loudest element for fundable missions; for anything already in flight
 * the four-dimension strip takes over, so a glance tells you the stage.
 */
export function MissionCard({ mission, featured }: { mission: MissionWithProject; featured?: boolean }) {
  const { t, lt, locale } = useI18n();
  const p = mission.project;
  const fundable = mission.status === "funding" || mission.status === "stalled";
  const fundingPct = mission.progress.funding;

  return (
    <Link
      to={`/missions/${mission.id}`}
      className={`group relative flex h-full flex-col gap-4 overflow-hidden rounded-[24px] border bg-bg1 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(41,34,82,.09)] ${
        featured ? "border-fund/40 hover:border-fund/60" : "border-line hover:border-line2"
      }`}
    >
      {/* project + status */}
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="truncate font-mono text-[11px] text-dim">{p.name}</span>
          <span className="shrink-0 font-mono text-[11px] text-dim">{mission.issueRef.id}</span>
        </span>
        <StatusPill status={mission.status} />
      </div>

      {/* the mission itself */}
      <div className="space-y-1.5">
        <h3 className="line-clamp-2 text-[21px] font-semibold leading-[1.08] tracking-[-.035em] text-ink transition-colors group-hover:text-fund">
          {lt(mission.title)}
        </h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-mut">{lt(mission.tagline)}</p>
      </div>

      {/* project signals — one line, never wrapping */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-dim">
{/* An unmeasured signal is omitted, never rendered as 0 — a displayed zero
            is a measurement claim, and it was a false one for every imported repo. */}
        {p.weeklyDownloads !== undefined && (
          <span className="inline-flex shrink-0 items-center gap-1" title={t("common.weeklyDownloads")}>
            <Download size={11} />
            {fmtCompact(p.weeklyDownloads, locale)}
          </span>
        )}
        {p.stars !== undefined && (
          <span className="inline-flex shrink-0 items-center gap-1" title={t("common.stars")}>
            <Star size={11} />
            {fmtCompact(p.stars, locale)}
          </span>
        )}
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap" title={t("msn.backers")}>
          <Users size={11} />
          {mission.backerCount} {t("mkt.card.backers")}
        </span>
        <RiskBadge level={mission.riskLevel} />
      </div>

      {/* progress — funding bar while fundable, four dimensions once in flight */}
      <div className="mt-auto space-y-2.5">
        {fundable ? (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="inline-flex items-baseline gap-1.5">
                <Credits n={mission.computePledged} compact className="text-sm font-bold text-ink" />
                <span className="font-mono text-[11px] text-dim">
                  / <Credits n={mission.computeGoal} compact /> {t("mkt.card.goal")}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs font-bold text-fund">{fmtPct(fundingPct)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg3">
              <div
                className="cc-progress-bar h-full rounded-full bg-fund"
                style={{ width: fmtPct(fundingPct) }}
              />
            </div>
          </div>
        ) : (
          <FourDimsStrip progress={mission.progress} />
        )}

        {/* maintainer + execution mode */}
        <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-dim">
            <Avatar name={p.maintainer.name} color={p.maintainer.avatarColor} size={16} />
            <span className="truncate">{p.maintainer.handle}</span>
            {p.maintainer.verified && (
              <span className="shrink-0" title={t("msn.maintainer.verified")}>
                <FlaskConical size={11} className="text-warn" />
              </span>
            )}
          </span>
          {mission.executionMode && <ModeBadge mode={mission.executionMode} />}
        </div>
      </div>
    </Link>
  );
}

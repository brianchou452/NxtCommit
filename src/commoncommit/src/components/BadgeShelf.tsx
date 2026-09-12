import { Lock } from "lucide-react";
import { fmtDate } from "../lib/format.js";
import { useI18n, type TKey } from "../i18n/index.js";
import { ACHIEVEMENT_CARD_ACCENTS, ACHIEVEMENT_ICONS, AchievementBadge, SectionHeading } from "./ui.js";
import type { AchievementCode, AchievementDef, EarnedAchievement } from "../../shared/types.js";

export type EarnedWithDef = EarnedAchievement & { def: AchievementDef };

/**
 * The full set of codes, in the order the store defines them. Derived from the
 * icon map rather than re-listed here: that map is a `Record<AchievementCode, …>`,
 * so a new achievement in `server/store.ts` cannot appear on the shelf without
 * its icon, and no code can be invented in this file — a badge is a factual claim
 * about something a backer did, and the server is the only thing that can make it.
 */
const ALL_CODES = Object.keys(ACHIEVEMENT_ICONS) as AchievementCode[];

const EARNED_TIER_CARD: Record<AchievementDef["tier"], string> = {
  bronze: "border-[#b3763f]/35 bg-[#b3763f]/8",
  silver: "border-[#9fb2c8]/35 bg-[#9fb2c8]/8",
  gold: "border-fund/40 bg-fund/8 shadow-[inset_3px_0_0_color-mix(in_srgb,var(--color-fund)_65%,transparent)]",
};

/**
 * Earned badges and the ones still to earn, on one shelf.
 *
 * Locked entries are rendered tier-neutral on purpose. Tier lives in the server's
 * `ACHIEVEMENTS` table, which the client only ever receives for badges it has
 * actually earned; hand-copying the tiers into the browser bundle would create a
 * second source of truth for a claim about the product's own rules. Muted is
 * enough to say "not yet" — and the description still tells the reader how to get
 * there, which is the only job an unearned badge has.
 */
export function BadgeShelf({
  earned,
  className = "",
}: {
  earned: EarnedWithDef[];
  className?: string;
}) {
  const { t, locale } = useI18n();

  /**
   * One badge per code even though the same achievement can be awarded on several
   * missions; the shelf answers "have you done this", so the earliest award is the
   * one that answers it.
   */
  const earnedByCode = new Map<AchievementCode, EarnedWithDef>();
  for (const item of earned) {
    const existing = earnedByCode.get(item.code);
    if (!existing || item.earnedAt < existing.earnedAt) earnedByCode.set(item.code, item);
  }

  const ordered = [...ALL_CODES].sort((a, b) => {
    const ea = earnedByCode.get(a);
    const eb = earnedByCode.get(b);
    if (ea && eb) return ea.earnedAt.localeCompare(eb.earnedAt);
    if (ea) return -1;
    if (eb) return 1;
    return 0;
  });

  return (
    <section className={className}>
      <SectionHeading title={t("badge.shelf")} />
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ordered.map((code) => {
          const award = earnedByCode.get(code);
          return (
            <li
              key={code}
              className={`rounded-xl border p-3 ${
                award ? `${EARNED_TIER_CARD[award.def.tier]} border-l-4 ${ACHIEVEMENT_CARD_ACCENTS[code]}` : "border-dashed border-line bg-bg1/40"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                {award ? (
                  <AchievementBadge code={code} tier={award.def.tier} size="sm" />
                ) : (
                  /*
                   * No opacity on this chip. `text-dim` is already the lowest
                   * step of the text ramp (5.5:1 on bg2); knocking it back to
                   * 70% blends it toward the surface and lands at ~3.4:1, under
                   * the 4.5:1 AA floor for 10px text. The lock mark, the dashed
                   * card border and the "not earned yet" label say "locked"
                   * without making the badge's own name hard to read.
                   */
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line2 bg-bg2 px-2 py-0.5 text-[14px] font-semibold text-dim">
                    <Lock size={10} aria-hidden />
                    {t(`ach.${code}` as TKey)}
                  </span>
                )}
                {award ? (
                  <span className="font-mono text-[14px] text-dim">
                    {t("badge.earnedOn")}{" "}
                    {fmtDate(award.earnedAt, locale)}
                  </span>
                ) : (
                  <span className="text-[14px] font-semibold uppercase tracking-wide text-dim">
                    {t("badge.locked")}
                  </span>
                )}
              </div>
              <p className={`mt-1.5 text-xs leading-relaxed ${award ? "text-mut" : "text-dim"}`}>
                {t(`ach.${code}.desc` as TKey)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

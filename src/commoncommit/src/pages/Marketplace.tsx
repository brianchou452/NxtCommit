import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Boxes, Flame, Hammer, HeartPulse, PackageCheck, ShieldQuestion, Telescope } from "lucide-react";
import { useI18n, type TKey } from "../i18n/index.js";
import { api } from "../lib/api.js";
import { useStream, globalStreamUrl } from "../lib/stream.js";
import { fmtCompact } from "../lib/format.js";
import { ProductCard } from "../components/ProductCard.js";
import { DataModeBadge, Skeleton } from "../components/ui.js";
import { demoTourRole, publishDemoTour } from "../lib/demoTour.js";
import type { MarketplaceData, MissionSection } from "../../shared/types.js";

const SECTION_META: Record<MissionSection, { icon: React.ReactNode; accent: string }> = {
  almost_funded: { icon: <Flame size={16} />, accent: "var(--color-fund)" },
  now_building: { icon: <Hammer size={16} />, accent: "var(--color-dev)" },
  under_verification: { icon: <ShieldQuestion size={16} />, accent: "var(--color-verif)" },
  recently_shipped: { icon: <PackageCheck size={16} />, accent: "var(--color-adopt)" },
  needs_rescue: { icon: <HeartPulse size={16} />, accent: "var(--color-danger)" },
  high_impact: { icon: <Telescope size={16} />, accent: "var(--color-ink)" },
  used_by_you: { icon: <Boxes size={16} />, accent: "var(--color-ink)" },
};

/**
 * `embedded` is set when the landing page renders these shelves inside its own
 * `#projects` section.
 *
 * It suppresses this page's hero and stats strip, and that is an accessibility
 * requirement rather than a cosmetic one: the hero owns an `<h1>`, the landing
 * page already has one, and two `<h1>` elements on a page is a real defect that
 * A11Y-01 checks for. The stats strip is dropped because the landing's impact
 * counters state the same figures with their provenance label attached.
 */
export default function Marketplace({ embedded = false }: { embedded?: boolean } = {}) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const providerDemo = demoTourRole(location.search) === "provider";
  const [data, setData] = useState<MarketplaceData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    api
      .marketplace()
      .then(setData)
      .catch(() => setError(true));
  }, []);

  useEffect(load, [load]);

  // Live marketplace: any mission update anywhere refreshes the shelves.
  useStream(
    globalStreamUrl(),
    (msg) => {
      if (msg.kind === "mission_update") load();
    },
    load
  );

  const categoryShelves = data ? (() => {
    const seen = new Set<string>();
    const missions = data.sections.flatMap((section) => section.missions).filter((mission) => {
      if (seen.has(mission.id)) return false;
      seen.add(mission.id);
      return true;
    });
    const definitions: Array<{ key: string; titleKey: TKey; subKey: TKey; tags: string[] }> = [
      {
        key: "everyday",
        titleKey: "mkt.shelf.everyday.title",
        subKey: "mkt.shelf.everyday.sub",
        tags: ["everyday"],
      },
      {
        key: "public-interest",
        titleKey: "mkt.shelf.independence.title",
        subKey: "mkt.shelf.independence.sub",
        tags: ["public-interest"],
      },
      {
        key: "builder-trend",
        titleKey: "mkt.shelf.frontier.title",
        subKey: "mkt.shelf.frontier.sub",
        tags: ["builder-trend"],
      },
    ];
    const assigned = new Set<string>();
    return definitions.map((definition) => ({
      ...definition,
      missions: missions.filter((mission) => {
        if (assigned.has(mission.id) || !mission.tags.some((tag) => definition.tags.includes(tag))) return false;
        assigned.add(mission.id);
        return true;
      }),
    })).filter((shelf) => shelf.missions.length > 0);
  })() : [];
  const providerMissionId = new URLSearchParams(location.search).get("campaign") ?? data?.sections
    .flatMap((section) => section.missions.slice(0, 5))
    .filter((mission) => mission.status === "funding" && mission.computeGoal > mission.computePledged)
    .sort((a, b) => (a.computeGoal - a.computePledged) - (b.computeGoal - b.computePledged))[0]?.id;

  useEffect(() => {
    if (!providerDemo || !providerMissionId) return;
    publishDemoTour({
      role: "provider",
      step: 1,
      total: 4,
      title: t("demo.guide.chooseCampaign"),
      detail: t("demo.guide.chooseCampaign.body"),
      state: "waiting",
      anchorSelector: '[data-demo-action="choose-campaign"]',
    });
  }, [providerDemo, providerMissionId, t]);

  const demoProps = (missionId: string) => providerDemo && missionId === providerMissionId
    ? { demoAction: "choose-campaign", demoQuery: "?demo=provider" }
    : {};

  if (error) {
    return (
      <div className="py-24 text-center">
        <p className="font-semibold text-danger">{t("common.error")}</p>
        <button onClick={() => { setError(false); load(); }} className="mt-3 cursor-pointer text-sm text-fund underline">
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-8">
      {/* hero — suppressed when embedded; see the `embedded` note above. */}
      {!embedded && (
      <section className="relative overflow-hidden rounded-2xl border border-line bg-bg1 px-6 py-8 sm:px-9">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(620px 200px at 15% 0%, rgba(255,178,36,0.10), transparent), radial-gradient(520px 220px at 85% 100%, rgba(77,159,255,0.08), transparent)",
          }}
        />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-tight sm:text-[34px]">
              {t("mkt.hero.title")}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-mut sm:text-[15px]">{t("mkt.hero.sub")}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[14px] text-dim">
              <span className="rounded-full border border-line2 px-2.5 py-1">
                ⚡ {t("mkt.hero.pill.credits")}
              </span>
              <span className="rounded-full border border-line2 px-2.5 py-1">
                🔒 {t("mkt.hero.pill.isolated")}
              </span>
              <span className="rounded-full border border-line2 px-2.5 py-1">
                ✓ {t("mkt.hero.pill.approved")}
              </span>
            </div>
          </div>

          {data && (
            <div className="shrink-0">
              <div className="mb-3 flex justify-end"><DataModeBadge mode={data.dataMode} /></div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4 lg:gap-x-7">
              {(
                [
                  ["mkt.stats.pledged", data.stats.totalPledged, "var(--color-fund)"],
                  ["mkt.stats.shipped", data.stats.missionsShipped, "var(--color-adopt)"],
                  ["mkt.stats.building", data.stats.activeExecutions, "var(--color-dev)"],
                  ["mkt.stats.contributors", data.stats.contributors, "var(--color-verif)"],
                ] as const
              ).map(([key, value, color], i) => (
                <div key={key} className={i > 0 ? "sm:border-l sm:border-line sm:pl-7" : ""}>
                  <dd className="font-mono text-[26px] font-bold leading-none" style={{ color }}>
                    {fmtCompact(value, locale)}
                  </dd>
                  <dt className="mt-1.5 text-[14px] text-dim">{t(key as TKey)}</dt>
                </div>
              ))}
              </dl>
            </div>
          )}
        </div>
      </section>
      )}

      {/* shelves */}
      {!data ? (
        <div className="space-y-10">
          {[0, 1].map((i) => (
            <div key={i}>
              <Skeleton className="mb-4 h-6 w-48" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {[0, 1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-56" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : embedded ? (
        categoryShelves.map((section) => (
          <section key={section.key} className="space-y-5">
            <div className="cc-category-banner">
              <div className="cc-category-dots" aria-hidden />
              <div className="cc-category-orbit" aria-hidden><i /></div>
              <div className="cc-category-copy">
                <p>{t("mkt.category.kicker")}</p>
                <h2>{t(section.titleKey)}</h2>
                <small>{t(section.subKey)}</small>
              </div>
              <span className="cc-category-count">{t("mkt.category.releaseCount", { count: section.missions.length })}</span>
            </div>
            <div className="grid items-start gap-4 lg:grid-cols-[1.08fr_.92fr]">
              <ProductCard key={`${section.key}-${section.missions[0].id}`} mission={section.missions[0]} featured {...demoProps(section.missions[0].id)} />
              <div className="grid gap-4 sm:grid-cols-2">
                {section.missions.slice(1, 5).map((mission) => <ProductCard key={`${section.key}-${mission.id}`} mission={mission} compact {...demoProps(mission.id)} />)}
              </div>
            </div>
            {section.missions.length > 5 && (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{t("mkt.category.more")}</h3>
                  <span className="font-mono text-[14px] text-dim">+{section.missions.length - 5}</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {section.missions.slice(5).map((mission) => <ProductCard key={`${section.key}-more-${mission.id}`} mission={mission} compact {...demoProps(mission.id)} />)}
                </div>
              </div>
            )}
          </section>
        ))
      ) : (
        data.sections.map((section) => {
          const meta = SECTION_META[section.key];
          return (
            <section key={section.key}>
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2
                  className="inline-flex items-center gap-2 text-lg font-bold tracking-tight"
                  style={{ color: meta.accent }}
                >
                  {meta.icon}
                  {t(`section.${section.key}` as TKey)}
                  <span className="rounded-full bg-bg3 px-2 py-0.5 font-mono text-[14px] font-semibold text-dim">
                    {section.missions.length}
                  </span>
                </h2>
                <p className="text-sm text-dim">{t(`section.${section.key}.blurb` as TKey)}</p>
              </div>
              <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {section.missions.slice().sort((a,b)=>Number(b.id===providerMissionId)-Number(a.id===providerMissionId)).map((m, i) => (
                  <ProductCard
                    key={`${section.key}-${m.id}`}
                    mission={m}
                    featured={i === 0}
                    {...demoProps(m.id)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* create CTA */}
      <section className="rounded-2xl border border-dashed border-line2 px-6 py-8 text-center">
        <p className="text-sm text-mut">{t("wiz.sub")}</p>
        <Link
          to="/new"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-fund px-5 py-2.5 text-sm font-semibold text-bg0 transition-all hover:brightness-110"
        >
          {t("wiz.title")} <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}

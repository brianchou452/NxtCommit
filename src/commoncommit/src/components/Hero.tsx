import { useEffect, useState } from "react";
import { ArrowRight, Boxes, GitBranch, PackageCheck, Users, Zap } from "lucide-react";
import { useI18n } from "../i18n/index.js";
import { fmtCompact } from "../lib/format.js";
import type { ImpactSnapshotState } from "../lib/useImpactSnapshot.js";
import { api } from "../lib/api.js";
import type { MarketplaceData } from "../../shared/types.js";

const PIPELINE_EVENTS = [
  {
    project: "WhisperX",
    titleKey: "home.pipeline.funded",
    metaKey: "home.pipeline.compute",
    timeKey: "home.pipeline.now",
    icon: Zap,
    tone: "mint",
  },
  {
    project: "ky",
    titleKey: "home.pipeline.review",
    metaKey: "home.pipeline.reviewMeta",
    timeKey: "home.pipeline.ago",
    timeValues: { n: 2 },
    icon: GitBranch,
    tone: "amber",
  },
  {
    project: "marked",
    titleKey: "home.pipeline.merged",
    metaKey: "home.pipeline.maintainer",
    timeKey: "home.pipeline.ago",
    timeValues: { n: 4 },
    icon: GitBranch,
    tone: "blue",
  },
] as const;

export function Hero({ impact }: { impact: ImpactSnapshotState }) {
  const { t, locale } = useI18n();
  const stats = impact.status === "ready" ? impact.stats : null;
  const [marketplace, setMarketplace] = useState<MarketplaceData | null>(null);
  const [activePipelineEvent, setActivePipelineEvent] = useState(0);

  useEffect(() => {
    void api.marketplace().then(setMarketplace).catch(() => {});
  }, []);

  // The pipeline is a demonstrative live feed. Rotating the highlighted event
  // gives the static demo records the cadence of incoming notifications while
  // keeping their copy stable enough to read and compare.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivePipelineEvent((current) => (current + 1) % PIPELINE_EVENTS.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  const signals = [
    {
      icon: Zap,
      value: marketplace?.stats.totalPledged,
      label: t("home.hero.signal.compute"),
      tone: "#08a98b",
    },
    {
      icon: Users,
      value: marketplace?.stats.contributors,
      label: t("home.hero.signal.backers"),
      tone: "#17a9d7",
    },
    {
      icon: Boxes,
      value: stats?.projectsRevived,
      label: t("home.hero.signal.repos"),
      tone: "#7665ff",
    },
    {
      icon: PackageCheck,
      value: marketplace?.stats.missionsShipped,
      label: t("home.hero.signal.releases"),
      tone: "#c96d00",
    },
  ];

  return (
    <section className="cc-commitment-hero relative isolate overflow-hidden">
      <div className="cc-aurora" aria-hidden />

      <div className="cc-commitment-hero-grid relative mx-auto grid items-center">
        <div className="cc-commitment-copy min-w-0 text-left">
          <span className="cc-commitment-kicker inline-flex items-center font-mono font-bold text-[#7665ff]">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-current" />
            {t("home.hero.backedBy")}
          </span>

          <h1 className="cc-commitment-title font-medium text-[#101110]">
            <span className="block">{t("home.hero.line1")}</span>
            <span className="cc-grad-text cc-commitment-gradient block">{t("home.hero.line2")}</span>
          </h1>

          <p className="cc-commitment-sub text-mut">
            {t("home.hero.sub")}
          </p>

          <a
            href="#projects"
            className="cc-commitment-cta cc-lift inline-flex items-center justify-center rounded-full bg-[#101110] font-bold text-white"
          >
            {t("home.hero.cta")}
            <ArrowRight size={18} />
          </a>

          <dl className="cc-commitment-stats grid grid-cols-2 border-t border-black/10 sm:grid-cols-4">
            {signals.map(({ icon: Icon, value, label, tone }) => (
              <div key={label} className="cc-commitment-stat min-w-0" style={{ color: tone }}>
                <dt className="flex items-center font-semibold text-[#6f716d]">
                  <Icon size={14} /> {label}
                </dt>
                <dd className="font-mono font-bold leading-none tracking-[-.04em]">
                  {typeof value === "number" ? fmtCompact(value, locale) : "—"}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="cc-live-pipeline relative overflow-hidden text-white">
          <div className="cc-hero-motion-dots absolute inset-0" aria-hidden />
          <div className="cc-hero-motion-orbit" aria-hidden><i /></div>

          <header className="cc-pipeline-head relative flex items-center justify-between">
            <span className="flex items-center font-mono font-bold uppercase text-[#4ff0d2]">
              <span className="cc-pipeline-pulse">⌁</span> {t("home.pipeline.title")}
            </span>
            <span className="cc-pipeline-demo rounded-full border border-[#4ff0d2]/30 bg-[#29dfc0]/10 font-mono font-bold text-[#4ff0d2]">
              ● {t("home.pipeline.demoLive")}
            </span>
          </header>

          <h2 className="cc-pipeline-title relative font-medium tracking-[-.035em]">
            {t("home.pipeline.subtitle")}
          </h2>

          <div className="cc-pipeline-events relative">
            {PIPELINE_EVENTS.map((event, index) => {
              const { project, titleKey, metaKey, timeKey, icon: Icon, tone } = event;
              const timeValues = "timeValues" in event ? event.timeValues : undefined;
              return (
              <article
                key={project}
                className={`cc-pipeline-event cc-pipeline-event-${tone} ${index === activePipelineEvent ? "is-current" : ""}`}
              >
                <div className="cc-pipeline-event-icon"><Icon size={23} /></div>
                <div className="min-w-0 flex-1">
                  <strong className="block font-mono">{project}</strong>
                  <b className="block leading-snug">{t(titleKey)}</b>
                  <small className="block text-white/42">{t(metaKey)}</small>
                </div>
                <time className="shrink-0 text-white/36">{t(timeKey, timeValues)}</time>
              </article>
              );
            })}
          </div>

          <footer className="cc-pipeline-foot relative flex items-center justify-between text-white/42">
            <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#4ff0d2] shadow-[0_0_12px_#4ff0d2]" />{t("home.pipeline.listening")}</span>
            <span className="text-right">{t("home.pipeline.demoNote")}</span>
          </footer>
        </div>
      </div>
    </section>
  );
}

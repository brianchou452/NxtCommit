import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, Check, GitMerge, PackageCheck, Zap } from "lucide-react";
import { useI18n } from "../i18n/index.js";
import { api } from "../lib/api.js";
import type { MissionWithProject } from "../../shared/types.js";

/**
 * A completed demo release update. This replaces the old monthly vote because
 * the landing page should close the product story: community compute funds a
 * plan, agents prepare it, and a maintainer decides whether it ships.
 */
export function MonthlyMvp() {
  const { t } = useI18n();
  const [mission, setMission] = useState<MissionWithProject | null>(null);

  useEffect(() => {
    void api.marketplace().then((marketplace) => {
      const missions = marketplace.sections.flatMap((section) => section.missions);
      setMission(
        missions.find((item) => item.status === "released" && item.project.name.toLowerCase() === "marked") ??
          missions.find((item) => item.status === "released") ??
          null
      );
    }).catch(() => setMission(null));
  }, []);

  const content = (
    <article className="cc-release-update">
      <div className="cc-release-update-head">
        <div className="cc-release-update-copy">
          <span>{t("home.releaseUpdate.eyebrow")}</span>
          <h3>{t("home.releaseUpdate.title")}</h3>
          <p>{t("home.releaseUpdate.body")}</p>
        </div>
        <strong className="cc-release-update-status"><Check size={17} aria-hidden /> {t("home.releaseUpdate.status")}</strong>
      </div>
      <ol className="cc-release-update-track">
        <li><i><Zap size={18} aria-hidden /></i><span>{t("home.releaseUpdate.funded")}</span><small>{t("home.releaseUpdate.complete")}</small></li>
        <li><i><Bot size={18} aria-hidden /></i><span>{t("home.releaseUpdate.built")}</span><small>{t("home.releaseUpdate.complete")}</small></li>
        <li><i><GitMerge size={18} aria-hidden /></i><span>{t("home.releaseUpdate.merged")}</span><small>{t("home.releaseUpdate.complete")}</small></li>
        <li><i><PackageCheck size={18} aria-hidden /></i><span>{t("home.releaseUpdate.released")}</span><small>{t("home.releaseUpdate.complete")}</small></li>
      </ol>
      <footer className="cc-release-update-foot">
        <span>{t("home.releaseUpdate.impact")}</span>
        <small>{t("home.releaseUpdate.demoNote")}</small>
        {mission && <b className="cc-release-update-open">{t("home.releaseUpdate.open")} <ArrowRight size={17} /></b>}
      </footer>
    </article>
  );

  return mission ? <Link to={`/missions/${mission.id}`} aria-label={`${t("home.releaseUpdate.open")}: ${mission.project.name}`} className="cc-release-update-link block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fund">{content}</Link> : content;
}

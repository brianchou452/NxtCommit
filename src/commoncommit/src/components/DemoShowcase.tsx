import {
  ArrowRight,
  Bot,
  Check,
  CircleDot,
  GitBranch,
  Github,
  GitMerge,
  GitPullRequest,
  HandCoins,
  Play,
  RotateCcw,
  ShieldCheck,
  TestTube2,
  UserRoundCheck,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n, type TKey } from "../i18n/index.js";
import { api } from "../lib/api.js";
import { useApp, type DeliveryStage, type DemoRole } from "../state/AppContext.js";

const DELIVERY: Array<{ key: DeliveryStage; icon: typeof Github }> = [
  { key: "issue", icon: CircleDot },
  { key: "plan", icon: Bot },
  { key: "funding", icon: HandCoins },
  { key: "branch", icon: GitBranch },
  { key: "pr", icon: GitPullRequest },
  { key: "ci", icon: TestTube2 },
  { key: "review", icon: UserRoundCheck },
  { key: "merge", icon: GitMerge },
  { key: "release", icon: Github },
];

type StageCopy = { title: TKey; body: TKey };

const COPY: Record<DemoRole, Record<DeliveryStage, StageCopy>> = {
  maintainer: {
    issue: { title: "demo.shared.maintainer.issue.title", body: "demo.shared.maintainer.issue.body" },
    plan: { title: "demo.shared.maintainer.plan.title", body: "demo.shared.maintainer.plan.body" },
    funding: { title: "demo.shared.maintainer.funding.title", body: "demo.shared.maintainer.funding.body" },
    branch: { title: "demo.shared.maintainer.branch.title", body: "demo.shared.maintainer.branch.body" },
    pr: { title: "demo.shared.maintainer.pr.title", body: "demo.shared.maintainer.pr.body" },
    ci: { title: "demo.shared.maintainer.ci.title", body: "demo.shared.maintainer.ci.body" },
    review: { title: "demo.shared.maintainer.review.title", body: "demo.shared.maintainer.review.body" },
    merge: { title: "demo.shared.maintainer.merge.title", body: "demo.shared.maintainer.merge.body" },
    release: { title: "demo.shared.maintainer.release.title", body: "demo.shared.maintainer.release.body" },
  },
  backer: {
    issue: { title: "demo.shared.backer.issue.title", body: "demo.shared.backer.issue.body" },
    plan: { title: "demo.shared.backer.plan.title", body: "demo.shared.backer.plan.body" },
    funding: { title: "demo.shared.backer.funding.title", body: "demo.shared.backer.funding.body" },
    branch: { title: "demo.shared.backer.branch.title", body: "demo.shared.backer.branch.body" },
    pr: { title: "demo.shared.backer.pr.title", body: "demo.shared.backer.pr.body" },
    ci: { title: "demo.shared.backer.ci.title", body: "demo.shared.backer.ci.body" },
    review: { title: "demo.shared.backer.review.title", body: "demo.shared.backer.review.body" },
    merge: { title: "demo.shared.backer.merge.title", body: "demo.shared.backer.merge.body" },
    release: { title: "demo.shared.backer.release.title", body: "demo.shared.backer.release.body" },
  },
};

/** A shared state model: changing viewpoint never rewinds delivery progress. */
export function DemoShowcase() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { campaignDemo, setDemoRole, advanceCampaignDemo, resetCampaignDemo, refreshBoot, pushToast } = useApp();
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState(false);
  const currentIndex = DELIVERY.findIndex((item) => item.key === campaignDemo.stage);
  const current = COPY[campaignDemo.role][campaignDemo.stage];
  const complete = campaignDemo.stage === "release";
  const isMaintainer = campaignDemo.role === "maintainer";

  const launchWalkthrough = async () => {
    setLaunching(true);
    setLaunchError(false);
    try {
      const bootstrap = await api.bootstrap();
      if (!(bootstrap as typeof bootstrap & {demoProtected?: boolean}).demoProtected) await api.demoReset();
      resetCampaignDemo();
      refreshBoot();

      const campaign = isMaintainer ? null : await api.prepareDemo();
      navigate(isMaintainer ? "/new?demo=maintainer" : `/marketplace?demo=provider&campaign=${campaign!.mission.id}`);
    } catch {
      setLaunchError(true);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <section className="cc-role-demo" aria-label={t("demo.shared.aria")}>
      <header className="cc-role-demo-head">
        <div>
          <span>{t("demo.shared.kicker")}</span>
          <h2>{t("demo.shared.title")}</h2>
          <p>{t("demo.shared.body")}</p>
        </div>
        <div className="cc-role-tabs" role="tablist" aria-label={t("demo.shared.aria")}>
          {(["maintainer", "backer"] as DemoRole[]).map((role) => (
            <button
              key={role}
              type="button"
              role="tab"
              aria-selected={campaignDemo.role === role}
              className={campaignDemo.role === role ? "is-active" : ""}
              onClick={() => setDemoRole(role)}
            >
              {role === "maintainer" ? <ShieldCheck size={16} /> : <HandCoins size={16} />}
              {t(role === "maintainer" ? "demo.role.maintainer" : "demo.role.provider")}
            </button>
          ))}
        </div>
      </header>

      <div className="cc-role-demo-body">
        <aside className="cc-role-current">
          <span>{t(isMaintainer ? "demo.shared.view.maintainer" : "demo.shared.view.backer")}</span>
          <h3>{t(current.title)}</h3>
          <p>{t(current.body)}</p>
          <div className="cc-role-commitments">
            <span className={campaignDemo.scopeConfirmed ? "is-done" : ""}><Check size={13} /> {t("demo.shared.commit.scope")}</span>
            <span className={campaignDemo.reviewCommitted ? "is-done" : ""}><Check size={13} /> {t("demo.shared.commit.review")}</span>
            <span className={campaignDemo.funded ? "is-done" : ""}><Check size={13} /> {t("demo.shared.commit.funded")}</span>
          </div>
          <div className="cc-role-actions">
            <button type="button" onClick={advanceCampaignDemo} disabled={complete}>
              {t(complete ? "demo.shared.complete.done" : "demo.shared.complete")} <ArrowRight size={15} />
            </button>
            <button type="button" onClick={resetCampaignDemo} aria-label={t("demo.shared.reset")}><RotateCcw size={15} /></button>
          </div>
        </aside>

        <div className="cc-delivery-model">
          <div className="cc-delivery-label"><Github size={17} /><span><b>{t("demo.shared.tracker.title")}</b><small>{t("demo.shared.tracker.note")}</small></span></div>
          <ol>
            {DELIVERY.map((item, index) => {
              const Icon = item.icon;
              const copy = COPY[campaignDemo.role][item.key];
              return <li key={item.key} className={`${index < currentIndex ? "is-done" : ""} ${index === currentIndex ? "is-current" : ""}`}>
                <i><Icon size={15} /></i><span><b>{t(copy.title)}</b><small>{item.key.toUpperCase()}</small></span>{index < DELIVERY.length - 1 && <ArrowRight size={13} />}
              </li>;
            })}
          </ol>
        </div>
      </div>

      <footer className="cc-role-demo-footer">
        <p>{t("demo.shared.footer")}</p>
        <button type="button" data-demo-launch onClick={() => void launchWalkthrough()} disabled={launching}>
          <Play size={14} fill="currentColor" />
          {launching ? t("demo.shared.start.resetting") : t(isMaintainer ? "demo.shared.start.maintainer" : "demo.shared.start.backer")}
          <ArrowRight size={14} />
        </button>
        {launchError && <span role="alert">{t("demo.shared.start.error")}</span>}
      </footer>
    </section>
  );
}

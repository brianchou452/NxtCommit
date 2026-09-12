import { TimeMachine } from "../components/TimeMachine.js";
import { PlainLanguage } from "../components/PlainLanguage.js";
import { CatalogHistory } from "../components/CatalogHistory.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Download,
  Eye,
  FileCode2,
  FlaskConical,
  GitBranch,
  Github,
  GitPullRequest,
  History,
  Languages,
  LockKeyhole,
  MessageCircle,
  MoveUpRight,
  PackageCheck,
  Play,
  RotateCcw,
  SearchX,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useI18n } from "../i18n/index.js";
import { useApp } from "../state/AppContext.js";
import { apiErrorText } from "../lib/errors.js";
import { api } from "../lib/api.js";
import { demoTourRole, highlightDemoControl, publishDemoTour } from "../lib/demoTour.js";
import { useStream, missionStreamUrl } from "../lib/stream.js";
import { fmtCompact, fmtInt, fmtPct, timeAgo } from "../lib/format.js";
import { PledgeDialog } from "../components/PledgeDialog.js";
import { CommentWall } from "../components/CommentWall.js";
import { ProjectImpactCard } from "../components/ProjectImpactCard.js";
import { CampaignArt } from "../components/ProductCard.js";
import {
  Btn,
  EmptyState,
  Skeleton,
} from "../components/ui.js";
import type {
  MissionDetail as MissionDetailData,
} from "../../shared/types.js";

type ExplainData = Awaited<ReturnType<typeof api.explain>>;

type ExplainState =
  | { status: "idle"; projectId: null }
  | { status: "loading"; projectId: string }
  | { status: "ready"; projectId: string; data: ExplainData }
  | { status: "error"; projectId: string };

type CampaignNarrative = {
  disappearsTitle: string;
  disappearsCost: string;
};

function campaignNarrative(projectName: string, zh: boolean, what: string, audience: string): CampaignNarrative {
  const key = projectName.toLowerCase();
  const stories: Record<string, { zh: CampaignNarrative; en: CampaignNarrative }> = {
    mermaid: {
      zh: {
        disappearsTitle: "如果 Mermaid 消失了，流程圖不會立刻消失，但每一次系統變更都會重新變成人工對圖。",
        disappearsCost: "文件裡既有的圖還在；真正失去的是『改文字、圖就一起更新』。團隊會回到截圖與繪圖工具，文件、Wiki 與實際系統逐漸長成三個版本。",
      },
      en: {
        disappearsTitle: "If Mermaid disappeared, diagrams would remain—but every system change would become a manual redraw.",
        disappearsCost: "Existing images stay. What disappears is the link between editable text and an always-current diagram; docs, wikis, and the real system begin drifting apart.",
      },
    },
    whisperx: {
      zh: {
        disappearsTitle: "如果 WhisperX 消失了，影片還是能產生字幕，但每一句話都可能要重新拖回聲音出現的位置。",
        disappearsCost: "剪輯者失去的是字詞級時間對齊：長訪談、課程與 Podcast 會重新堆回逐句校時的人工作業。",
      },
      en: {
        disappearsTitle: "If WhisperX disappeared, videos could still get captions—but every line may need to be dragged back to the moment it was spoken.",
        disappearsCost: "Editors lose word-level alignment, pushing interviews, courses, and podcasts back into line-by-line timing work.",
      },
    },
    localsend: {
      zh: { disappearsTitle: "如果 LocalSend 消失了，傳一張照片到旁邊的電腦，也可能得先繞去別人的雲端。", disappearsCost: "同一個房間裡的裝置失去直接、免帳號的傳輸路徑；隱私與便利再次變成二選一。" },
      en: { disappearsTitle: "If LocalSend disappeared, sending a photo to the computer beside you may take a detour through someone else's cloud.", disappearsCost: "Nearby devices lose a direct, account-free path; privacy and convenience become a trade-off again." },
    },
    "pdf.js": {
      zh: { disappearsTitle: "如果 PDF.js 消失了，瀏覽器裡的一份 PDF 會重新變成要下載、找程式、再打開的檔案。", disappearsCost: "搜尋、選字、無障礙閱讀與嵌入式預覽，不再是打開連結就有的基本能力。" },
      en: { disappearsTitle: "If PDF.js disappeared, a PDF in the browser becomes a file to download, find an app for, and reopen.", disappearsCost: "Search, text selection, accessible reading, and embedded previews stop being link-level defaults." },
    },
    immich: {
      zh: { disappearsTitle: "如果 Immich 消失了，照片不會消失，但『相簿由自己掌握』這條路會窄很多。", disappearsCost: "家庭相簿的備份、搜尋與人物辨識，又更依賴少數雲端服務的價格與規則。" },
      en: { disappearsTitle: "If Immich disappeared, photos would remain—but the path to an album you truly control would narrow.", disappearsCost: "Backup, search, and face discovery depend more heavily on a few cloud providers and their rules." },
    },
  };
  const story = stories[key];
  if (story) return zh ? story.zh : story.en;
  return zh
    ? { disappearsTitle: `如果 ${projectName} 消失了，${audience}仍得完成同一件事，只是少了一個共同維護的解法。`, disappearsCost: `${what}不再由社群集中修正；相同的相容性、錯誤與更新成本，會分散回每一個產品團隊。` }
    : { disappearsTitle: `If ${projectName} disappeared, ${audience} would still need the same outcome—without a shared solution.`, disappearsCost: `${what} would no longer be improved once for everyone; compatibility, bugs, and updates return to each product team.` };
}

export default function MissionDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, lt, locale } = useI18n();
  const { pushToast, boot } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const demoRole = demoTourRole(`?${searchParams.toString()}`) ?? (searchParams.get("demo") === "1" ? "provider" : null);
  const autoDemo = demoRole === "provider";
  const demoPledgeStarted = useRef(false);

  const [mission, setMission] = useState<MissionDetailData | null>(null);
  // Route-key terminal load states. React Router reuses this component while a
  // mission parameter changes, so a bare boolean would paint the previous
  // mission's 404/error screen for one frame before the route effect clears it.
  const [notFoundFor, setNotFoundFor] = useState<string | null>(null);
  const [errorFor, setErrorFor] = useState<string | null>(null);
  const [pledgeOpen, setPledgeOpen] = useState(false);
  const [backAmount, setBackAmount] = useState(500);
  const [starting, setStarting] = useState(false);
  const navTimer = useRef<number | null>(null);
  const missionRequest = useRef(0);
  const actionRequest = useRef(0);
  const explainRequest = useRef(0);
  const activeId = useRef(id);
  activeId.current = id;

  const [explainState, setExplainState] = useState<ExplainState>({
    status: "idle",
    projectId: null,
  });

  /**
   * Explanation generation can take up to 200 seconds when a real model backs it.
   * A monotonically increasing request token makes only the newest request
   * authoritative: navigating to another project or retrying cannot let an older
   * response replace the current project's panels.
   */
  const loadExplain = useCallback((projectId: string) => {
    const request = ++explainRequest.current;
    setExplainState({ status: "loading", projectId });
    void api.explain(projectId).then(
      (data) => {
        if (request !== explainRequest.current) return;
        setExplainState({ status: "ready", projectId, data });
      },
      () => {
        if (request !== explainRequest.current) return;
        setExplainState({ status: "error", projectId });
      }
    );
  }, []);

  const load = useCallback(() => {
    if (!id) return void setNotFoundFor("");
    const request = ++missionRequest.current;
    api
      .mission(id)
      .then((m) => {
        if (request !== missionRequest.current || m.id !== id) return;
        setMission(m);
        setNotFoundFor(null);
        setErrorFor(null);
      })
      .catch((e: unknown) => {
        if (request !== missionRequest.current) return;
        if ((e as { status?: number } | null)?.status === 404) setNotFoundFor(id);
        else setErrorFor(id);
      });
  }, [id]);

  useEffect(() => {
    setMission(null);
    setNotFoundFor(null);
    setErrorFor(null);
    setPledgeOpen(false);
    setStarting(false);
    load();
    return () => {
      missionRequest.current += 1;
      actionRequest.current += 1;
    };
  }, [load]);

  useEffect(() => () => {
    if (navTimer.current !== null) window.clearTimeout(navTimer.current);
  }, [id]);

  const explainProjectId = mission && mission.id === id ? mission.project.id : null;

  useEffect(() => {
    if (!explainProjectId) {
      // Invalidate a request from the route we just left before the next mission
      // has even loaded. Keeping the old payload around here is what allowed one
      // project's explanation to flash on another project's page.
      explainRequest.current += 1;
      setExplainState({ status: "idle", projectId: null });
      return;
    }
    loadExplain(explainProjectId);
    return () => {
      explainRequest.current += 1;
    };
  }, [explainProjectId, loadExplain]);

  // Live mission: merge streamed field updates instantly, refetch composites.
  useStream(
    id ? missionStreamUrl(id) : null,
    (msg) => {
      if (msg.kind === "mission_update") {
        if (msg.mission.id !== id) return;
        setMission((prev) => (prev ? { ...prev, ...msg.mission } : prev));
        load();
      } else if (msg.kind === "exec_event") {
        if (msg.event.missionId !== id) return;
        load();
      }
    },
    () => {
      load();
    }
  );

  useEffect(() => {
    if (!autoDemo || !mission || mission.id !== id || mission.status !== "funding" || demoPledgeStarted.current) return;
    demoPledgeStarted.current = true;
    publishDemoTour({
      role: "provider",
      step: 2,
      total: 4,
      title: t("demo.guide.pledge"),
      detail: t("demo.guide.pledge.body"),
      state: "waiting",
      anchorSelector: '[data-demo-action="pledge"]',
    });
    window.setTimeout(() => {
      if (!highlightDemoControl('[data-demo-action="pledge"]')) demoPledgeStarted.current = false;
    }, 1000);
  }, [autoDemo, id, mission, t]);

  const startRun = async () => {
    if (!id || mission?.id !== id) return;
    const missionId = id;
    const request = ++actionRequest.current;
    setStarting(true);
    try {
      await api.execute(missionId);
      if (request !== actionRequest.current || activeId.current !== missionId) return;
      navigate(`/missions/${missionId}/run${autoDemo ? "?demo=provider" : ""}`);
    } catch (e) {
      if (request !== actionRequest.current || activeId.current !== missionId) return;
      pushToast({ kind: "error", message: apiErrorText(e, t) });
      setStarting(false);
    }
  };

  const handlePledged = (executionStarting: boolean) => {
    const missionId = id;
    if (!missionId || activeId.current !== missionId) return;
    load();
    if (executionStarting) {
      navTimer.current = window.setTimeout(() => {
        if (activeId.current === missionId) navigate(`/missions/${missionId}/run${autoDemo ? "?demo=provider" : ""}`);
      }, 1200);
    }
  };

  if ((!id && notFoundFor === "") || (id !== undefined && notFoundFor === id)) {
    return (
      <div className="py-12">
        <EmptyState icon={<SearchX size={28} />} title={t("msn.notFound")} />
      </div>
    );
  }

  if (id !== undefined && errorFor === id) {
    return (
      <div className="py-24 text-center">
        <p className="font-semibold text-danger">{t("common.error")}</p>
        <button
          onClick={() => {
            setErrorFor(null);
            load();
          }}
          className="mt-3 cursor-pointer text-sm text-fund underline"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (!mission || mission.id !== id) {
    return (
      <div className="grid gap-8 pb-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const p = mission.project;
  const maintainer = p.maintainer;
  // A response belongs on this page only when its project id matches the mission
  // being rendered. The effect that starts the next request runs after paint, so
  // this render-time gate is what prevents a one-frame flash of the previous
  // project's content during route transitions.
  const explain =
    explainState.status === "ready" && explainState.projectId === p.id
      ? explainState.data
      : null;
  const pledges = [...mission.pledges].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const releaseVersion = mission.releaseVersion
    ? mission.releaseVersion.startsWith("v")
      ? mission.releaseVersion
      : `v${mission.releaseVersion}`
    : null;

  // Execution needs a bundled fixture workspace; seeded/imported projects have
  // none, so the start/re-run CTAs would 400. Explain instead of offering them.
  const executable = mission.project.workspace.kind === "fixture";
  const noWorkspaceNote = (
    <p className="rounded-lg border border-line2 bg-bg2 px-3 py-2 text-xs leading-relaxed text-mut">
      {t("msn.workspace.none")}
    </p>
  );

  const cta = (() => {
    switch (mission.status) {
      case "funding":
      case "stalled":
        return (
          <Btn
            data-demo-action="pledge"
            onClick={() => setPledgeOpen(true)}
            disabled={!boot}
            className="w-full justify-center"
          >
            ⚡ {t("msn.pledge.cta")}
          </Btn>
        );
      case "executing":
        if (!mission.latestRunId) return noWorkspaceNote;
        return (
          <Link
            to={`/missions/${mission.id}/run`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-dev px-4 py-2 text-sm font-semibold text-bg0 transition-all hover:brightness-110"
          >
            <Eye size={14} /> {t("msn.watchLive")}
          </Link>
        );
      case "needs_review":
        if (!mission.latestRunId) return noWorkspaceNote;
        return (
          <Link
            to={`/missions/${mission.id}/review`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-verif px-4 py-2 text-sm font-semibold text-bg0 transition-all hover:brightness-110"
          >
            <ShieldCheck size={14} /> {t("msn.review.open")}
          </Link>
        );
      case "funded":
        return executable ? (
          <Btn onClick={startRun} disabled={starting} className="w-full justify-center">
            <Play size={14} /> {t("msn.start")}
          </Btn>
        ) : (
          noWorkspaceNote
        );
      case "failed":
        return executable ? (
          <Btn onClick={startRun} disabled={starting} className="w-full justify-center">
            <RotateCcw size={14} /> {t("msn.restart")}
          </Btn>
        ) : (
          <div className="space-y-2">
            {noWorkspaceNote}
            <Link
              to={`/missions/${mission.id}/run`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line2 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-bg3"
            >
              <Eye size={14} /> {t("msn.viewRun")}
            </Link>
          </div>
        );
      case "released":
        return (
          <div className="flex items-center justify-between rounded-lg border border-adopt/30 bg-adopt/10 px-3 py-2 text-sm text-adopt">
            <span className="inline-flex items-center gap-1.5 font-mono font-semibold">
              <PackageCheck size={14} /> {releaseVersion}
            </span>
            {mission.releasedAt && (
              <span className="font-mono text-xs opacity-80">{timeAgo(mission.releasedAt, t)}</span>
            )}
          </div>
        );
      default:
        // approved / changes_requested — the run history is the useful next step
        return (
          <Link
            to={`/missions/${mission.id}/run`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line2 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-bg3"
          >
            <History size={14} /> {t("msn.viewRun")}
          </Link>
        );
    }
  })();

  const zh = locale.startsWith("zh");
  const fundingPct = Math.min(100, Math.max(0, mission.progress.funding * 100));
  const developmentHref = mission.latestRunId && mission.status === "needs_review"
    ? `/missions/${mission.id}/review`
    : mission.latestRunId && mission.status === "executing"
      ? `/missions/${mission.id}/run`
      : "#release";
  const personalMove = mission.computeGoal > 0 ? (backAmount / mission.computeGoal) * 100 : 0;
  const afterBacking = Math.min(100, fundingPct + personalMove);
  const plainOneLiner = explain?.plain ? lt(explain.plain.oneLiner) : lt(mission.story.what);
  const useCases = explain?.plain?.useCases.length
    ? explain.plain.useCases.slice(0, 3).map((item) => lt(item))
    : [lt(mission.story.whoBenefits), lt(mission.story.approach)];
  // The campaign promise must not change between the discovery card and the
  // detail route. Generated explanation copy can enrich the body, but never
  // replace the mission title a backer clicked.
  const releaseHeroTitle = lt(mission.title);
  const releaseHeroSub = lt(mission.tagline);
  const distinctiveStory = campaignNarrative(p.name, zh, lt(mission.story.what), lt(mission.story.whoBenefits));
  const isMermaid = p.name.toLowerCase() === "mermaid";
  const factCards = [
    p.stars !== undefined ? { value: fmtCompact(p.stars, locale), label: "GitHub stars", icon: <Star /> } : null,
    p.weeklyDownloads !== undefined ? { value: fmtCompact(p.weeklyDownloads, locale), label: "weekly downloads", icon: <Download /> } : null,
    p.dependents !== undefined ? { value: fmtCompact(p.dependents, locale), label: "dependent projects", icon: <GitBranch /> } : null,
    p.language ? { value: p.language, label: "primary language", icon: <Languages /> } : null,
  ].filter((item): item is { value: string; label: string; icon: React.JSX.Element } => item !== null).slice(0, 3);
  const cumulativeMilestones = mission.milestones.map((milestone, index, all) => ({
    milestone,
    index,
    value: all.slice(0, index + 1).reduce((sum, item) => sum + item.share, 0) * 100,
  }));
  const topPledges = pledges.slice(0, 4);
  const deliveryStageIndex = (() => {
    if (mission.status === "released") return 8;
    if (mission.status === "approved") return 7;
    if (mission.status === "needs_review" || mission.status === "changes_requested") return 6;
    if (mission.status === "failed") return 5;
    if (mission.artifact) return 5;
    if (mission.status === "executing") return 3;
    if (mission.status === "funded") return 3;
    return 2;
  })();
  const deliveryStages = [
    { key: "Issue", icon: CircleDot, detail: mission.issueRef.id },
    { key: "Plan", icon: Sparkles, detail: zh ? "Scope 已確認" : "Scope confirmed" },
    { key: "Funding", icon: Zap, detail: `${fundingPct.toFixed(0)}%` },
    { key: "Branch", icon: GitBranch, detail: mission.artifact?.branch ?? (zh ? "達標後建立" : "After funding") },
    { key: "PR", icon: GitPullRequest, detail: mission.artifact ? (zh ? "本機審查產物" : "Local review artifact") : (zh ? "等待中" : "Pending") },
    { key: "CI", icon: FlaskConical, detail: mission.artifact ? `${mission.artifact.testEvidence.pass}/${mission.artifact.testEvidence.total}` : (zh ? "等待中" : "Pending") },
    { key: "Review", icon: Eye, detail: zh ? "一週內完成" : "Within 7 days" },
    { key: "Merge", icon: CheckCircle2, detail: zh ? "Owner 決定" : "Owner decision" },
    { key: "Release", icon: PackageCheck, detail: releaseVersion ?? (zh ? "版本待定" : "Version pending") },
  ];
  const proposalStages = deliveryStages.slice(0, 3);
  const developmentStages = deliveryStages.slice(3);
  const fundingComplete = deliveryStageIndex >= 3;
  const deliveryComplete = deliveryStageIndex >= deliveryStages.length - 1;
  const backingPanel = (
    <aside className="dc-backing-panel lg:sticky lg:top-20 lg:self-start">
      <div className="dc-backing-target"><span>YOU ARE BACKING</span><div><b>{releaseVersion ?? mission.issueRef.id}</b><strong>{lt(mission.title)}</strong></div></div>
      <div className="dc-backing-prompt"><span className="dc-panel-label">CHOOSE YOUR BACKING</span><h2>{zh ? "你想推動多少？" : "How much do you want to move?"}</h2><p>{zh ? "選擇一筆 compute，立即看到它讓這個 Release 往前多少。" : "Choose an amount and see how far it moves this release."}</p></div>
      <div className="dc-impact-preview"><span>{zh ? "你的影響力" : "Your impact"}</span><strong>{backAmount.toLocaleString()} compute {zh ? "讓版本再往前一步" : "moves this release"}</strong><div><b>{fundingPct.toFixed(1)}%</b><ArrowRight size={15} /><b>{afterBacking.toFixed(1)}%</b></div></div>
      <div className="dc-amounts">{[250, 500, 1000].map((amount) => <button key={amount} type="button" className={amount === backAmount ? "is-active" : ""} onClick={() => setBackAmount(amount)}>{amount.toLocaleString()}</button>)}</div>
      {mission.status === "funding" || mission.status === "stalled" ? <>
        <button type="button" data-demo-action="pledge" className="dc-back-button" onClick={() => setPledgeOpen(true)} disabled={!boot}><Zap size={17} /> {zh ? "贊助這個 Release" : "Back this release"}</button>
        <button type="button" className="dc-message-button" onClick={() => document.querySelector("#community")?.scrollIntoView({ behavior: "smooth" })}><MessageCircle size={16} /> {zh ? "贊助並留下訊息" : "Back & leave a message"}</button>
      </> : <div className="dc-production-cta">{cta}</div>}
      <p className="dc-fineprint"><ShieldCheck size={13} /> {t("msn.ledger.sub")}</p>
    </aside>
  );
  const fundingPanel = backingPanel;

  // The production route deliberately reuses the original D concept's DOM and
  // class vocabulary. Mission data replaces the concept's demo copy, but the
  // visual hierarchy stays identical: story + sticky backing panel, followed
  // by the six narrative chapters and a community ending.
  return (
    <div className="dc-root dc-hybrid dc-production-campaign">
      <div className="dc-page">
        <div className="dc-campaign-page">
          <div className="dc-breadcrumb">
            <Link to="/">{zh ? "發現提案" : "Discover"}</Link><ChevronRight size={14} />
            <span>{p.name}</span><ChevronRight size={14} />
            <b>{releaseVersion ?? mission.issueRef.id}</b>
          </div>

          <section className="dc-campaign-hero">
            <div className="dc-release-story">
              <div className="dc-repo-line">
                <span className="dc-repo-mark">{p.name.slice(0, 2).toUpperCase()}</span>
                <span><b>{p.name}</b><small>{zh ? "Technology behind products" : "Technology behind products"}</small></span>
                {maintainer.verified && <span className="dc-owner-approved"><ShieldCheck size={14} /> {zh ? "維護者確認" : "Maintainer verified"}</span>}
              </div>
              <span className="dc-eyebrow">CAMPAIGN · {releaseVersion ?? mission.issueRef.id}</span>
              <h1>{releaseHeroTitle}</h1>
              <p className="dc-lede">{releaseHeroSub}</p>

              <div className="dc-release-momentum">
                <div className="dc-release-art">
                  <CampaignArt mission={mission} featured />
                  <div className="dc-hero-delivery-pipeline" aria-label={zh ? "社群贊助轉化為版本交付" : "Community backing becomes a release delivery"}>
                    <div className="dc-hero-delivery-node is-community">
                      <Users size={19} />
                      <span><small>COMMUNITY BACKING</small><strong>{fmtInt(mission.backerCount, locale)} {zh ? "位贊助者" : "backers"}</strong></span>
                    </div>
                    <span className="dc-hero-delivery-link" aria-hidden="true"><i /><ArrowRight size={17} /></span>
                    <div className="dc-hero-delivery-node is-plan">
                      <Sparkles size={19} />
                      <span><small>AI EXECUTION PLAN</small><strong>{zh ? "拆解、開發、測試" : "Scope, build, test"}</strong></span>
                    </div>
                    <span className="dc-hero-delivery-link" aria-hidden="true"><i /><ArrowRight size={17} /></span>
                    <div className="dc-hero-delivery-node is-release">
                      <GitBranch size={19} />
                      <span><small>NEXT DELIVERY</small><strong>{releaseVersion ?? mission.issueRef.id} Release</strong></span>
                    </div>
                  </div>
                </div>
                <section className="dc-funding-status" aria-label={zh ? "贊助進度" : "Funding progress"}>
                  <header>
                    <div><span>FUNDING PROGRESS</span><h2>{fmtInt(mission.computePledged, locale)} <small>/ {fmtInt(mission.computeGoal, locale)} COMPUTE</small></h2></div>
                    <div className="dc-funding-stats"><span><b>{fundingPct.toFixed(1)}%</b>{zh ? "已贊助" : "FUNDED"}</span><span><b>{fmtInt(mission.backerCount, locale)}</b>{zh ? "位贊助者" : "BACKERS"}</span></div>
                  </header>
                  <div className="dc-funding-rail">
                    <div className="dc-funding-fill" style={{ width: `${fundingPct}%` }}><i /></div>
                    {cumulativeMilestones.map(({ milestone, value, index }) => <div className={`dc-funding-milestone ${value <= fundingPct ? "is-reached" : ""}`} style={{ left: `${Math.min(100, value)}%` }} key={milestone.id}><i /><b>{lt(milestone.title)}</b><small>{fmtInt(Math.round(mission.computeGoal * value / 100), locale)}</small><span className="sr-only">{index + 1}</span></div>)}
                  </div>
                  <footer><span><Check size={14} /> {zh ? "每一筆算力都會留在可追蹤的里程碑上" : "Every contribution stays traceable to a milestone"}</span>{developmentHref.startsWith("#") ? <a href={developmentHref}>{zh ? "查看開發計畫" : "See development plan"} <ArrowRight size={14} /></a> : <Link to={developmentHref}>{zh ? "查看開發進度" : "View development progress"} <ArrowRight size={14} /></Link>}</footer>
                </section>
              </div>
            </div>

          </section>

          <nav className="dc-story-nav">
            <a href="#what">{zh ? "它推動什麼" : "What it powers"}</a>
            <a href="#disappears">{zh ? "如果它消失" : "If it disappears"}</a>
            <a href="#why">{zh ? "為何重要" : "Why it matters"}</a>
            <a href="#release">{zh ? "下一個 Release" : "Next release"}</a>
            <a href="#community">{zh ? "一起完成" : "Together"}</a>
          </nav>

          <div className="lg:hidden">{fundingPanel}</div>

          {explainState.status === "loading" && explainState.projectId === p.id && (
            <section role="status" aria-live="polite" className="dc-explain-state">
              <p>{t("msn.explain.loading")}</p>
              <Skeleton className="h-72 w-full rounded-2xl" />
            </section>
          )}
          {explainState.status === "error" && explainState.projectId === p.id && (
            <section role="alert" className="dc-explain-state">
              <p>{t("msn.explain.error")}</p>
              <button type="button" onClick={() => loadExplain(p.id)}>{t("common.retry")}</button>
            </section>
          )}

          {/* D-version narrative: product meaning first, repository mechanics later. */}
          <div className="dc-narrative-shell">
            <div className="dc-story-track">

          <section id="what" className="dc-story-section dc-what">
            <div className="dc-story-intro"><span className="dc-index">01</span><div><span className="dc-eyebrow">WHAT IT POWERS</span><h2>{plainOneLiner}</h2></div></div>
            <div className="dc-story-body"><p className="dc-story-lead">{lt(mission.story.what)}</p>{factCards.length > 0 && <div className="dc-stat-trio">{factCards.map((fact) => <article key={fact.label}><strong>{fact.value}</strong>{fact.icon}<span>{fact.label}</span></article>)}</div>}</div>
          </section>

          <section id="disappears" className="dc-story-section dc-disappears">
            <div className="dc-story-intro"><span className="dc-index">02</span><div><span className="dc-eyebrow">IF IT DISAPPEARS</span><h2>{distinctiveStory.disappearsTitle}</h2></div></div>
            <div className="dc-disappears-panel"><span>{zh ? `${p.name} 的獨特價值` : `${p.name}'s distinct value`}</span><p>{distinctiveStory.disappearsCost}</p></div>
          </section>

          <section id="why" className="dc-story-section dc-why">
            <div className="dc-story-intro"><span className="dc-index">03</span><div><span className="dc-eyebrow">WHY IT MATTERS</span><h2>{lt(mission.story.why)}</h2></div></div>
            {isMermaid ? <div className="dc-mermaid-explainer" aria-label={zh ? "Mermaid 把文字轉成流程圖" : "Mermaid turns text into a diagram"}>
              <article className="dc-mermaid-source"><header><FileCode2 size={23} /><span>EDITABLE TEXT</span></header><code><b>flowchart</b> LR<br/><i>A</i>[{zh ? "需求" : "Idea"}] --&gt; <i>B</i>[{zh ? "開發" : "Build"}]<br/><i>B</i> --&gt; <i>C</i>[{zh ? "上線" : "Ship"}]</code><p>{zh ? "改一行文字" : "Change one line"}</p></article>
              <div className="dc-mermaid-compiler"><Sparkles size={26}/><strong>MERMAID</strong><span>{zh ? "自動排版" : "AUTO LAYOUT"}</span><ArrowRight size={23}/></div>
              <article className="dc-mermaid-render"><header><GitBranch size={23}/><span>LIVE DIAGRAM</span></header><div className="dc-mermaid-flow"><b>{zh ? "需求" : "Idea"}</b><ArrowRight/><b>{zh ? "開發" : "Build"}</b><ArrowRight/><b>{zh ? "上線" : "Ship"}</b></div><p>{zh ? "文件、Wiki 與簡報同步更新" : "Docs, wikis, and decks update together"}</p></article>
            </div> : <div className="dc-technology-stack"><div className="is-core"><span>TECHNOLOGY BEHIND PRODUCTS</span><strong>{p.name}</strong></div><i><ArrowRight size={18} /></i><div><span>WHAT PEOPLE EXPERIENCE</span><strong>{lt(mission.story.whoBenefits)}</strong><small>{mission.tags.slice(0, 3).join(" · ")}</small></div><p>{lt(mission.story.approach)}</p></div>}
          </section>

          <section id="who" className="dc-story-section dc-who">
            <div className="dc-story-intro"><span className="dc-index">04</span><div><span className="dc-eyebrow">WHAT CHANGES FOR YOU</span><h2>{zh ? "重點不是誰在用 repo，而是使用這些產品的人少掉什麼麻煩。" : "The point is not who uses the repo—it is what friction disappears for people using the products built on it."}</h2></div></div>
            <div className="dc-audience-outcomes">{useCases.map((useCase, index) => <article key={`${index}-${useCase}`}><div className="dc-outcome-context"><span>{String(index + 1).padStart(2, "0")}</span><b>{zh ? "使用情境" : "REAL-WORLD MOMENT"}</b></div><h3>{useCase}</h3><div className="dc-outcome-delta"><div><span>CORE TECHNOLOGY</span><p>{lt(mission.story.what)}</p></div><div className="is-release"><span>THIS RELEASE</span><p>{lt(mission.title)}</p></div></div></article>)}</div>
          </section>

          <section id="release" className="dc-story-section dc-release-scope">
            <div className="dc-story-intro"><span className="dc-index">05</span><div><span className="dc-eyebrow">THE NEXT RELEASE</span><h2>{lt(mission.title)}</h2></div></div>
            <div className="dc-evidence-card is-github">
              <header className="dc-evidence-origin"><Github size={28} /><div><span>GITHUB EVIDENCE</span><strong>{zh ? `需求引用自 ${p.name} 的議題範圍` : `The campaign describes the ${p.name} issue scope`}</strong></div><aside className="dc-evidence-counts"><span><CircleDot size={13} /><b>{mission.issueRef.url ? 1 : "—"}</b><small>CITED ISSUE</small></span><span className="is-gap"><GitPullRequest size={14} /><b>{mission.artifact ? 1 : 0}</b><small>LINKED PR</small></span></aside></header>
              <div className="dc-repo-quotes is-single"><a href={mission.issueRef.url ?? "#"} target={mission.issueRef.url ? "_blank" : undefined} rel="noreferrer"><div className="dc-repo-quote-meta"><span><CircleDot size={13} /> ISSUE {mission.issueRef.id}</span><b>{p.name}</b></div><blockquote>“{lt(mission.issueRef.title)}”</blockquote><p>{lt(mission.tagline)}</p>{mission.issueRef.url && <MoveUpRight size={16} />}</a></div>
              <section className="dc-evidence-governance"><div className="dc-governance-intro"><span>FROM EVIDENCE TO SCOPE</span><strong>{zh ? "AI 整理需求；Owner 決定 Roadmap。" : "AI organizes the evidence; the owner decides the roadmap."}</strong></div><div className="dc-governance-step"><Sparkles size={18} /><span><b>AI SYNTHESIS</b><small>{zh ? "整理 Issue、草擬範圍與驗收條件。" : "Organizes issues and drafts scope and acceptance criteria."}</small></span></div><ArrowRight className="dc-governance-arrow" size={18} /><div className="dc-governance-step is-owner"><ShieldCheck size={18} /><span><b>OWNER DECISION</b><small>{zh ? "Owner 保留修改、Review 與 Merge 的決定權。" : "The owner retains edit, review, and merge authority."}</small></span></div></section>
            </div>

            <section className="dc-maintainer-commitment">
              <header><ShieldCheck size={24} /><div><span>MAINTAINER COMMITMENT</span><h3>{zh ? "Campaign 上線前，Maintainer 必須先承諾接住成果。" : "Before publication, the maintainer commits to receiving the work."}</h3></div><b>{zh ? "示範承諾" : "DEMO COMMITMENT"}</b></header>
              <div><article><Check size={16} /><span><b>{zh ? "確認 Scope 與驗收條件" : "Confirm scope and acceptance gates"}</b><small>{zh ? "AI 生成草稿；Maintainer 擁有修改與最終確認權。" : "AI drafts; the maintainer edits and gives final confirmation."}</small></span></article><article><Check size={16} /><span><b>{zh ? "達標後一週內完成 Review" : "Complete review within 7 days of funding"}</b><small>{zh ? "明確標示等待誰、承諾期限與 Approve／Revise 結果。" : "The accountable reviewer, deadline, and approve/revise result stay visible."}</small></span></article><article><Check size={16} /><span><b>{zh ? "保留 Merge 與 Release 決定權" : "Retain merge and release authority"}</b><small>{zh ? "平台追蹤交付，不替 Owner 決定 Roadmap。" : "The platform tracks delivery; it never decides the roadmap for the owner."}</small></span></article></div>
              <p><AlertTriangle size={14} />{zh ? "目前為本機 Demo 人物與承諾，尚未完成 GitHub 身分驗證或上游寫入。正式產品只允許經驗證的 repo owner 發布。" : "This is a local demo persona and commitment—not authenticated GitHub identity or an upstream write. Production publishing is owner-only."}</p>
            </section>

            {/* acceptance criteria */}
            <div className="dc-decision-grid">
              {mission.acceptanceCriteria.length > 0 && <section className="dc-decision-card">
                <header><div><i><CheckCircle2 size={19} /></i><span><small>ACCEPTANCE CRITERIA</small><h3>{t("msn.criteria")}</h3></span></div><b>{mission.acceptanceCriteria.length} GATES</b></header>
                <ul>{mission.acceptanceCriteria.map((criterion) => <li key={criterion.id}><i><Check size={16} /></i><div><span>{lt(criterion.text)}</span>{criterion.status === "suite_passed" && <small>{t("msn.criteria.suitePassed", { count: criterion.verifiedBy?.slice(6) ?? "" })}</small>}</div></li>)}</ul>
              </section>}

              {mission.riskFactors.length > 0 && <section className="dc-decision-card is-risk">
                <header><div><i><AlertTriangle size={19} /></i><span><small>RISKS TO REVIEW</small><h3>{t("msn.risk")}</h3></span></div><b>{mission.riskFactors.length} {mission.riskFactors.length === 1 ? "ITEM" : "ITEMS"}</b></header>
                <ul>{mission.riskFactors.map((risk, index) => <li key={index}><i><AlertTriangle size={16} /></i><div><span>{lt(risk)}</span><small>{zh ? "需要 Maintainer 在執行前確認" : "Maintainer confirmation required before execution"}</small></div></li>)}</ul>
              </section>}
            </div>

            {p.workspace.kind === "github" && <p className="dc-workspace-note">{t("msn.workspace.github")}</p>}

            {mission.catalog && <CatalogHistory content={mission.catalog} />}
            {/* Persuasive and community material follows the decision-critical scope and risk review. */}
            {explain?.impact && <ProjectImpactCard impact={explain.impact} variant="evidence" />}
            {explain?.plain && <PlainLanguage plain={explain.plain} className="mt-6" />}
            {explain?.timeline && <TimeMachine frames={explain.timeline} className="mt-6" />}

            {mission.milestones.length > 0 && <div className="dc-plan-grid"><div className="dc-plan-steps dc-development-plan">
              <header className="dc-development-head"><div><span>DEVELOPMENT PLAN</span><strong>{mission.milestones.length} {zh ? "個可驗收的 Milestones" : "verifiable milestones"}</strong></div><aside><span>TOTAL COMPUTE TOKENS</span><b>{fmtInt(mission.computeGoal, locale)}</b></aside></header>
              <div className="dc-budget-allocation"><div className="dc-allocation-bar">{mission.milestones.map((milestone) => <i key={milestone.id} style={{ flex: milestone.share }} />)}</div><div className="dc-allocation-legend">{mission.milestones.map((milestone, index) => <span key={milestone.id}><i /><b>{String(index + 1).padStart(2, "0")} {lt(milestone.title)}</b><small>{fmtInt(Math.round(mission.computeGoal * milestone.share), locale)} · {fmtPct(milestone.share)}</small></span>)}</div></div>
              <div className="dc-milestone-list">{mission.milestones.map((milestone, index) => <article key={milestone.id}><div className="dc-milestone-marker"><span>{String(index + 1).padStart(2, "0")}</span></div><div className="dc-milestone-body"><div className="dc-milestone-title"><div><span className="dc-milestone-phase">MILESTONE {String(index + 1).padStart(2, "0")}</span><h3>{lt(milestone.title)}</h3></div><aside><b>{fmtInt(Math.round(mission.computeGoal * milestone.share), locale)}</b><span>COMPUTE · {fmtPct(milestone.share)}</span></aside></div><p>{index === 0 ? lt(mission.story.approach) : lt(mission.tagline)}</p><div className="dc-milestone-output"><div><span>DELIVERABLE</span><strong>{mission.acceptanceCriteria[index] ? lt(mission.acceptanceCriteria[index].text) : lt(milestone.title)}</strong></div><div><span>COMPLETION GATE</span><strong>{zh ? "Owner 確認結果與範圍" : "Owner confirms the result and scope"}</strong></div></div></div></article>)}</div>
            </div></div>}
          </section>

          <section id="impact" className="dc-story-section dc-back-impact">
            <div className="dc-story-intro"><span className="dc-index">06</span><div><span className="dc-eyebrow">YOUR BACK IN MOTION</span><h2>{zh ? "你的贊助不會停在進度條上，它會沿著每一步走到 Release。" : "Your backing does not stop at a progress bar. It moves through every step to a release."}</h2></div></div>
            <div className="dc-impact-bridge"><div><span>{zh ? "你的贊助" : "YOUR BACK"}</span><strong>{backAmount.toLocaleString()} compute</strong></div><ArrowRight size={22} /><div><span>{zh ? "推進幅度" : "CAMPAIGN MOVED"}</span><strong>+{personalMove.toFixed(1)}%</strong></div><ArrowRight size={22} /><div><span>{zh ? "新的進度" : "NEW PROGRESS"}</span><strong>{afterBacking.toFixed(1)}%</strong></div></div>
            <section className="dc-delivery-tracker">
              <header><div><span>CAMPAIGN → DELIVERY TRACKER</span><h3>{zh ? "先讓提案達標，再把算力轉成可 Review、可 Merge 的開發成果。" : "Fund the proposal first, then turn compute into reviewable, mergeable work."}</h3></div><b><Github size={14} /> {zh ? "本機 Demo 狀態" : "LOCAL DEMO STATE"}</b></header>
              <div className="dc-delivery-phases">
                <section className="dc-delivery-phase is-proposal">
                  <header><span>PHASE 01</span><div><b>{zh ? "提案到達標" : "Proposal to funded"}</b><small>{zh ? "確認需求、執行計畫與社群算力" : "Confirm need, plan, and community backing"}</small></div><em>{fundingComplete ? (zh ? "已達標" : "FUNDED") : `${fundingPct.toFixed(0)}%`}</em></header>
                  <ol>{proposalStages.map((stage, index) => { const Icon = stage.icon; return <li key={stage.key} className={`${index < deliveryStageIndex ? "is-done" : ""} ${index === deliveryStageIndex ? "is-active" : ""}`}><i><Icon size={16} /></i><span><b>{stage.key}</b><small>{stage.detail}</small></span>{index < proposalStages.length - 1 && <ArrowRight size={13} />}</li>; })}</ol>
                </section>
                <div className={`dc-delivery-handoff ${fundingComplete ? "is-open" : ""}`}><i>{fundingComplete ? <Check size={16} /> : <LockKeyhole size={15} />}</i><span><b>{zh ? "募資達標後啟動開發" : "Development unlocks after funding"}</b><small>{zh ? "未達標前不建立 Branch，也不產生上游變更。" : "No branch or upstream change is created before the goal is reached."}</small></span><ArrowRight size={17} /></div>
                <section className={`dc-delivery-phase is-development ${fundingComplete ? "" : "is-locked"}`}>
                  <header><span>PHASE 02</span><div><b>{zh ? "達標後的開發與 Merge" : "Development and merge after funding"}</b><small>{zh ? "Branch、測試、Review 到 Owner 決策" : "Branch, tests, review, and owner decision"}</small></div><em>{deliveryComplete ? (zh ? "已交付" : "DELIVERED") : fundingComplete ? (zh ? "進行中" : "IN PROGRESS") : (zh ? "尚未啟動" : "LOCKED")}</em></header>
                  <ol>{developmentStages.map((stage, index) => { const absoluteIndex = index + proposalStages.length; const Icon = stage.icon; return <li key={stage.key} className={`${absoluteIndex < deliveryStageIndex ? "is-done" : ""} ${absoluteIndex === deliveryStageIndex ? "is-active" : ""}`}><i><Icon size={16} /></i><span><b>{stage.key}</b><small>{stage.detail}</small></span>{index < developmentStages.length - 1 && <ArrowRight size={13} />}</li>; })}</ol>
                </section>
              </div>
              <footer><p>{zh ? "PR、CI、Review、Merge 與 Release 在 MVP 中以同一個 Campaign ID 對應；目前畫面不會建立真正的 branch／PR 或推送上游。" : "The MVP maps PR, CI, review, merge, and release to one campaign ID. This screen does not create a real branch/PR or push upstream."}</p><a href={p.repoUrl} target="_blank" rel="noreferrer"><Github size={14} />{zh ? "查看公開 Repo" : "View public repo"}<MoveUpRight size={14} /></a></footer>
            </section>
          </section>

          <section id="community" className="dc-story-section dc-community">
            <div className="dc-story-intro"><span className="dc-index">+</span><div><span className="dc-eyebrow">MAKE IT HAPPEN TOGETHER</span><h2>{zh ? `不是一個人多做一點，而是 ${fmtInt(mission.backerCount, locale)} 位贊助者一起讓它發生。` : `Not one person doing more—${fmtInt(mission.backerCount, locale)} backers making it happen together.`}</h2></div></div>
            <div className="dc-community-field"><aside className="dc-community-signal"><div className="dc-signal-kicker"><CircleDot size={14} /> LIVE COMMUNITY SIGNAL</div><div className="dc-signal-summary"><span><b>{fmtInt(mission.backerCount, locale)}</b>{zh ? "位贊助者" : "BACKERS"}</span><span><b>{fmtInt(mission.computePledged, locale)}</b>{zh ? "已投入算力" : "COMPUTE"}</span></div><div className="dc-goal-convergence"><i className="dc-converge-ray r1" /><i className="dc-converge-ray r2" /><i className="dc-converge-ray r3" /><i className="dc-converge-ray r4" />{topPledges.map((pledge, index) => <span className={`dc-backer-stream s${index + 1}`} key={pledge.id}><b>{pledge.contributor.name}</b><small>+{fmtInt(pledge.amount, locale)}</small></span>)}<div className="dc-goal-core"><small>GOAL</small><strong>{releaseVersion ?? mission.issueRef.id}</strong><span>{lt(mission.title)}</span></div></div><div className="dc-signal-compute"><Zap size={17} /><div><strong>{zh ? "每一筆算力，都匯入同一個 Goal" : "Every contribution moves the same goal"}</strong><small>{fmtInt(mission.computePledged, locale)} compute</small></div></div></aside><div className="dc-production-comments"><div className="dc-stream-head"><div><span>SUPPORT STREAM</span><small>{zh ? "每一筆贊助，都可以帶著一則支持" : "Messages can travel with every backing"}</small></div><b><i /> LIVE</b></div><CommentWall missionId={mission.id} /></div></div>
          </section>
            </div>
            <div className="dc-backing-rail hidden lg:block">{fundingPanel}</div>
          </div>
        </div>
      </div>
      {pledgeOpen && <PledgeDialog mission={mission} initialAmount={demoRole ? undefined : backAmount} open onClose={() => setPledgeOpen(false)} onPledged={handlePledged} guidedDemo={autoDemo} />}
    </div>
  );

}

import {
  AudioLines,
  Bot,
  Database,
  Download,
  ExternalLink,
  FileSearch,
  FlaskConical,
  Gauge,
  HeartHandshake,
  House,
  Images,
  MonitorSmartphone,
  Network,
  PencilRuler,
  ScanText,
  Send,
  ShieldAlert,
  Tv,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/index.js";
import { fmtCompact, fmtPct } from "../lib/format.js";
import { loadProjectExplanation } from "../lib/projectPlainLanguage.js";
import { Avatar, Btn, Credits, DataModeBadge, GeneratorBadge, Skeleton, StatusPill } from "./ui.js";
import type { ImpactCard, MissionWithProject, PlainLanguage } from "../../shared/types.js";

type CampaignArtKind = "parser" | "reliability" | "rescue" | "security" | "workflow";

function campaignArtKind(mission: MissionWithProject): CampaignArtKind {
  const haystack = `${mission.project.name} ${mission.tags.join(" ")} ${JSON.stringify(mission.title)}`.toLowerCase();
  if (/security|auth|permission|safe/.test(haystack)) return "security";
  if (/rescue|memory|leak|abandon|stalled/.test(haystack)) return "rescue";
  if (/parser|parse|duration|csv|yaml|format/.test(haystack)) return "parser";
  if (/retry|reliability|timeout|queue|ky\b/.test(haystack)) return "reliability";
  return "workflow";
}

const CAMPAIGN_SCENE_HEADLINES: Record<string, { en: string; "zh-TW": string }> = {
  ms: {
    en: "When a config says ‘1h 30m’, the tool should know exactly how many seconds that means.",
    "zh-TW": "設定檔寫著「1h 30m」時，工具不必再猜這串時間到底是多少秒。",
  },
  "node-csv": {
    en: "A quote split across two chunks should not quietly corrupt the export.",
    "zh-TW": "一個引號跨過串流區塊時，整列匯出資料不該就這樣被截斷。",
  },
  cosign: {
    en: "An empty manifest should never let an unsigned artifact reach production.",
    "zh-TW": "即使 manifest 是空的，未簽章產物也不能就這樣進入正式環境。",
  },
  "quick-lru": {
    en: "After a dev server runs all day, its memory should not keep climbing.",
    "zh-TW": "開發伺服器跑過一天後，記憶體不該還一路只升不降。",
  },
  yaml: {
    en: "When a config points back to itself, CI should explain the error instead of hanging.",
    "zh-TW": "設定檔繞回自己時，CI 應該說清楚錯在哪裡，而不是直接卡死。",
  },
  ky: {
    en: "When a service comes back online, every retry should not hit it at the same second.",
    "zh-TW": "服務剛恢復時，所有重試不該又在同一秒一起撞回來。",
  },
  marked: {
    en: "Put a table inside a quote, and every column should still line up.",
    "zh-TW": "表格放進引用區塊後，每一欄仍然應該整齊對齊。",
  },
  "redis-mock": {
    en: "When tests fast-forward time, cache expiry should move with them.",
    "zh-TW": "測試把時間快轉時，快取的到期時間也應該跟著走。",
  },
  jose: {
    en: "Looking up a token key should not reveal its ID through timing.",
    "zh-TW": "查找權杖金鑰時，不該從回應時間洩漏它的 ID。",
  },
  globset: {
    en: "One crafted pattern should not be able to consume 8 GB of memory.",
    "zh-TW": "一個精心構造的比對模式，不該就能吃掉 8 GB 記憶體。",
  },
  localsend: { en: "A file should cross the room without crossing a cloud.", "zh-TW": "一個檔案穿過房間，不必先繞去雲端。" },
  pdfjs: { en: "A long PDF should stay readable while its text is still loading.", "zh-TW": "長 PDF 的文字還在載入，頁面也應該維持可讀。" },
  tesseractjs: { en: "Words trapped in an image should become searchable again.", "zh-TW": "困在圖片裡的文字，應該重新可以被搜尋。" },
  mermaid: { en: "Change the system, and the diagram should still explain it.", "zh-TW": "系統改了，圖還是要說得清楚。" },
  scrcpy: { en: "Your phone and keyboard should reconnect without starting over.", "zh-TW": "手機與鍵盤重連後，不必一切重來。" },
  immich: { en: "Find the photo you remember—inside a library you control.", "zh-TW": "在自己掌握的相簿裡，找回記得的那張照片。" },
  homeassistant: { en: "When the internet stops, your home should not.", "zh-TW": "網路停了，家裡不必跟著停。" },
  excalidraw: { en: "A shared sketch should survive the reconnect.", "zh-TW": "共同畫下的想法，不該在重連時消失。" },
  whisperx: { en: "Subtitles should break where people naturally pause.", "zh-TW": "字幕應該在人自然停頓的地方斷句。" },
  jellyfin: { en: "Your own media should play without becoming a loading screen.", "zh-TW": "自己的影音，不該只剩載入畫面。" },
  ollama: { en: "Local AI should stay useful on the machine you already have.", "zh-TW": "本機 AI 應該在你已經有的電腦上保持好用。" },
  langgraph: { en: "Resume an agent from the step that actually failed.", "zh-TW": "讓 Agent 從真正失敗的那一步繼續。" },
  deno: { en: "One project. The same behavior from laptop to edge.", "zh-TW": "同一個專案，從筆電到 Edge 都有一致行為。" },
  supabase: { en: "Reconnect realtime data without replaying the same event twice.", "zh-TW": "即時資料重連後，不要把同一事件再播一次。" },
  bun: { en: "Fast tooling only matters when existing projects keep working.", "zh-TW": "既有專案能繼續運作，快才真正有意義。" },
};

const EDITORIAL_SCENES: Record<string, { icon: LucideIcon; from: string; to: string; kind: string }> = {
  localsend: { icon: Send, from: "PHONE", to: "LAPTOP", kind: "transfer" },
  pdfjs: { icon: FileSearch, from: "PAGE 148", to: "SEARCH", kind: "document" },
  tesseractjs: { icon: ScanText, from: "PIXELS", to: "TEXT", kind: "vision" },
  mermaid: { icon: Workflow, from: "WORDS", to: "DIAGRAM", kind: "diagram" },
  scrcpy: { icon: MonitorSmartphone, from: "ANDROID", to: "DESKTOP", kind: "device" },
  immich: { icon: Images, from: "MEMORY", to: "FOUND", kind: "photos" },
  homeassistant: { icon: House, from: "OFFLINE", to: "HOME ON", kind: "home" },
  excalidraw: { icon: PencilRuler, from: "SKETCH", to: "SHARED", kind: "canvas" },
  whisperx: { icon: AudioLines, from: "VOICE", to: "SUBTITLE", kind: "audio" },
  jellyfin: { icon: Tv, from: "LIBRARY", to: "PLAY", kind: "media" },
  ollama: { icon: Bot, from: "MODEL", to: "LOCAL", kind: "localai" },
  langgraph: { icon: Workflow, from: "FAILED", to: "RESUME", kind: "agent" },
  deno: { icon: Network, from: "LAPTOP", to: "EDGE", kind: "runtime" },
  supabase: { icon: Database, from: "OFFLINE", to: "SYNCED", kind: "database" },
  bun: { icon: Gauge, from: "INSTALL", to: "SHIP", kind: "speed" },
};

/**
 * A repo-semantic campaign illustration, not a generic project monogram.
 * The vocabulary is shared (dots, mono labels, violet/mint), while the scene is
 * selected from the repository's actual tags/title so each campaign reads as a
 * different idea at thumbnail size.
 */
export function CampaignArt({ mission, featured }: { mission: MissionWithProject; featured: boolean }) {
  const editorial = EDITORIAL_SCENES[mission.project.slug];
  const kind = campaignArtKind(mission);
  const repo = mission.project.name;
  if (editorial) {
    const Icon = editorial.icon;
    return (
      <div className={`cc-campaign-art cc-editorial-art is-${editorial.kind} ${featured ? "is-featured" : ""}`} aria-hidden="true">
        <div className="cc-art-grid" />
        <div className="cc-art-label">{mission.tags.find((tag) => !["everyday", "public-interest", "builder-trend"].includes(tag)) ?? editorial.kind}</div>
        <div className="cc-editorial-symbol"><Icon /></div>
        <div className="cc-editorial-flow"><span>{editorial.from}</span><i>→</i><span>{editorial.to}</span></div>
        <div className="cc-editorial-pulse p1" /><div className="cc-editorial-pulse p2" /><div className="cc-editorial-pulse p3" />
        <strong className="cc-art-repo">{repo}</strong>
      </div>
    );
  }
  return (
    <div className={`cc-campaign-art is-${kind} ${featured ? "is-featured" : ""}`} aria-hidden="true">
      <div className="cc-art-grid" />
      <div className="cc-art-label">{kind}</div>
      {kind === "parser" && <>
        <div className="cc-parser-input">{repo === "ms" ? "1h 30m" : "raw input"}</div>
        <div className="cc-parser-arrow">→</div>
        <div className="cc-parser-output">{repo === "ms" ? "5400" : "parsed"}</div>
        <span className="cc-token-chip c1">:</span><span className="cc-token-chip c2">[]</span><span className="cc-token-chip c3">✓</span>
      </>}
      {kind === "reliability" && <>
        <div className="cc-retry-orbit"><span /><span /><span /></div>
        <div className="cc-retry-core">RETRY</div>
        <div className="cc-retry-path">request → wait → recover</div>
      </>}
      {kind === "rescue" && <>
        <div className="cc-memory-pool"><i /><i /><i /><i /><i /></div>
        <div className="cc-rescue-line"><span>LEAK</span><b>→</b><span>HEALED</span></div>
      </>}
      {kind === "security" && <>
        <div className="cc-shield-shape"><ShieldAlert /></div>
        <div className="cc-security-rays"><i /><i /><i /></div>
        <div className="cc-security-copy">BOUNDARY VERIFIED</div>
      </>}
      {kind === "workflow" && <>
        <div className="cc-workflow-node n1">INPUT</div><div className="cc-workflow-node n2">BUILD</div><div className="cc-workflow-node n3">SHIP</div>
        <div className="cc-workflow-wire w1" /><div className="cc-workflow-wire w2" />
      </>}
      <strong className="cc-art-repo">{repo}</strong>
    </div>
  );
}

/**
 * A repository presented as a product rather than a repo.
 *
 * The order is the argument: what it is → who made it → what it does for you →
 * what it can do → what it needs right now. Commits, branches and file counts are
 * absent on purpose; a reader who does not write software cannot do anything with
 * them, and the mission page one click away has all of it.
 *
 * Two honesty constraints shape the layout:
 *  - Stars are intentionally absent: popularity does not explain downstream
 *    impact. Dependents and downloads appear only when recorded and carry their
 *    data-mode badge in the same block.
 *  - The plain-language line is generated text, so its GeneratorBadge travels
 *    inside the same block. A card is the unit people screenshot and share.
 *
 * `plain` arrives later than the mission (one `api.explain` call per project), so
 * every slot it fills has a Skeleton of the same height — a card that grows after
 * load shifts the whole grid under the reader's cursor.
 */
export function ProductCard({
  mission,
  plain,
  impact,
  onDonate,
  featured = false,
  compact = false,
  demoAction,
  demoQuery,
}: {
  mission: MissionWithProject;
  plain?: PlainLanguage;
  impact?: ImpactCard;
  /**
   * Gives the lead card on a shelf more presence. Visual weight only — it must not
   * change what the card CLAIMS, so nothing gated on it may add or remove a figure
   * or a provenance label.
   */
  featured?: boolean;
  /** Compact cards are the four supporting campaigns in a category spread. */
  compact?: boolean;
  /**
   * Opens the pledge dialog in place. Without it the donate control degrades to a
   * link to the mission page, which owns the same dialog — the affordance is never
   * silently dropped, because a card whose primary action does nothing is worse
   * than one that navigates.
   */
  onDonate?: () => void;
  /** Optional guided-demo target; it decorates the card's real campaign route. */
  demoAction?: string;
  demoQuery?: string;
}) {
  const { t, lt, locale } = useI18n();
  const project = mission.project;
  const publicRepoUrl = /^https:\/\/github\.com\/[^/]+\/[^/?#]+\/?$/i.test(project.repoUrl)
    ? project.repoUrl
    : null;
  const cardRef = useRef<HTMLElement>(null);
  const [shouldLoadPlain, setShouldLoadPlain] = useState(false);
  const [fetchedExplanation, setFetchedExplanation] = useState<
    { plain: PlainLanguage; impact: ImpactCard } | null
  >();
  const [plainRetry, setPlainRetry] = useState(0);
  const fundable = mission.status === "funding" || mission.status === "stalled";
  const primaryCtaLabel = fundable ? t("product.donate") : t("product.viewCampaign");
  /**
   * No goal means no denominator, and therefore no percentage and no meter — a
   * bar drawn against an unknown target would be pure decoration presented as
   * progress. The credits pledged are still real and still shown.
   */
  const funded = mission.computeGoal > 0 ? mission.computePledged / mission.computeGoal : null;

  /**
   * Explanation generation can be a real model call. Start it only when a card
   * is close to the viewport; the shared loader then deduplicates projects that
   * appear on several shelves and caps global concurrency. Without
   * IntersectionObserver the bounded queue is still the safe fallback.
   */
  useEffect(() => {
    if (plain !== undefined && impact !== undefined) return;
    const node = cardRef.current;
    if (!node || !("IntersectionObserver" in window)) {
      setShouldLoadPlain(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldLoadPlain(true);
        observer.disconnect();
      },
      { rootMargin: "320px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [impact, plain, project.id]);

  useEffect(() => {
    if ((plain !== undefined && impact !== undefined) || !shouldLoadPlain) return;
    let live = true;
    setFetchedExplanation(undefined);
    loadProjectExplanation(project.id).then(
      (value) => {
        if (live) setFetchedExplanation(value);
      },
      () => {
        // A v0.3.x server does not have the explanation endpoint. Stop rendering
        // a permanent skeleton during any mixed-version window and show an
        // honest, retryable technical-description fallback instead.
        if (live) setFetchedExplanation(null);
      }
    );
    return () => {
      live = false;
    };
  }, [impact, plain, plainRetry, project.id, shouldLoadPlain]);

  const shownPlain = plain !== undefined ? plain : fetchedExplanation?.plain;
  const shownImpact = impact !== undefined ? impact : fetchedExplanation?.impact;
  // Scale counts are useful evidence, but the lead sentence should answer the
  // human question in words. Prefer the authored consequence; fall back to a
  // measured line only when no editorial explanation is available.
  const primaryConsequence =
    shownImpact?.consequences.find((consequence) => consequence.basis === "editorial") ??
    shownImpact?.consequences[0];
  const campaignHeadline = CAMPAIGN_SCENE_HEADLINES[project.name]
    ? lt(CAMPAIGN_SCENE_HEADLINES[project.name])
    : shownPlain
      ? lt(shownPlain.oneLiner)
      : lt(mission.story.whoBenefits);
  const visualKind = EDITORIAL_SCENES[project.slug]?.kind ?? campaignArtKind(mission);

  if (featured || compact) {
    return (
      <article
        ref={cardRef}
        className={`cc-home-campaign-card cc-lift group relative overflow-hidden is-${visualKind} ${featured ? "is-featured" : "is-compact"}`}
      >
        <CampaignArt mission={mission} featured={featured} />
        <div className="cc-home-campaign-body">
          <div className="cc-home-campaign-meta">
            <p><span>REPO</span><i>/</i><strong>{project.name}</strong></p>
            <StatusPill status={mission.status} />
          </div>

          <h3 className="cc-home-campaign-title">
            <Link to={`/missions/${mission.id}${demoQuery ?? ""}`} data-demo-action={demoAction} className="after:absolute after:inset-0 after:content-[''] hover:text-brand-text">
              {lt(mission.title)}
            </Link>
          </h3>

          {featured && (
            <p className="cc-home-campaign-scene">{campaignHeadline}</p>
          )}

          <div className="cc-home-campaign-benefit">
            <span>{t("product.releaseBenefit")}</span>
            <p>{primaryConsequence ? lt(primaryConsequence.text) : lt(mission.story.why)}</p>
          </div>

          {funded !== null && (
            <div className="cc-home-campaign-progress">
              <div className="cc-home-campaign-meter"><div className="cc-meter-fill" style={{ width: fmtPct(funded) }} /></div>
              <div>
                <span><Credits n={mission.computePledged} compact /> / <Credits n={mission.computeGoal} compact /></span>
                <span className="font-bold text-brand-text">{fmtPct(funded)} {t("product.funded")}</span>
              </div>
            </div>
          )}

          <div className="cc-home-campaign-foot">
            <span className="inline-flex items-center gap-1.5"><Users size={13} />{fmtCompact(mission.backerCount, locale)} {t("mkt.card.backers")}</span>
            <span>{primaryCtaLabel} →</span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      ref={cardRef}
      className={`cc-glass cc-lift group relative flex h-full flex-col gap-4 rounded-[26px] p-4 sm:p-5 ${
        featured ? "ring-1 ring-brand/40 sm:col-span-2 lg:row-span-2 lg:p-7" : ""
      }`}
    >
      {/* what it is */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`${featured ? "text-2xl sm:text-3xl" : "text-base"} font-bold tracking-tight text-ink`}>
            {/* Block + vertical padding, not a bare inline link: the name is the
                card's route into the mission, and a 19px-tall inline target is
                under the 24px floor WCAG 2.5.8 allows without extra spacing. */}
            <Link
              to={`/missions/${mission.id}${demoQuery ?? ""}`}
              data-demo-action={demoAction}
              className="block truncate py-1 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-brand-text focus-visible:text-brand-text"
              aria-label={`${project.name}: ${lt(mission.title)}`}
            >
              {project.name}
            </Link>
          </h3>
          <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] text-dim">
            <Avatar name={project.maintainer.name} color={project.maintainer.avatarColor} size={16} />
            <span className="shrink-0">{t("product.creator")}</span>
            <span className="truncate font-mono">{project.maintainer.handle}</span>
            {/* This card names a person as a project's creator, so it has to
                carry the same disclaimer the mission card does: every seeded
                maintainer has `verified: true`, and the string behind it says
                what that actually means — a seeded profile whose identity was
                never authenticated. There is no login in this prototype, so an
                unqualified "Creator @handle" would be the strongest identity
                claim on the page and the one thing nothing here can back. */}
            {project.maintainer.verified && (
              <span className="shrink-0" title={t("msn.maintainer.verified")}>
                <FlaskConical size={11} className="text-warn" aria-label={t("msn.maintainer.verified")} role="img" />
              </span>
            )}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusPill status={mission.status} />
        </div>
      </div>

      {/* Lead with the stakes, not the repository category. A potential backer
          first needs to know what would break if this shared dependency went
          away; the compact product explanation follows as supporting context. */}
      {shownImpact ? (
        <div className="rounded-xl border border-warn/30 bg-warn/5 p-3.5">
          <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-warn">
            <ShieldAlert size={14} aria-hidden />
            {t("product.withoutRepo")}
          </h4>
          <p className="mt-2 text-sm font-bold leading-relaxed text-ink">
            {lt(shownImpact.headline)}
          </p>
          {(shownImpact.dependents !== undefined || shownImpact.weeklyDownloads !== undefined) && (
            <div className="mt-3 border-t border-warn/15 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-dim">
                {t("product.estimatedImpact")}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-mut">
                {shownImpact.dependents !== undefined && (
                  <span className="inline-flex items-center gap-1.5">
                    <Network size={13} className="text-fund" aria-hidden />
                    <strong className="font-mono text-ink">{fmtCompact(shownImpact.dependents, locale)}</strong>
                    {t("product.dependentProjects")}
                  </span>
                )}
                {shownImpact.weeklyDownloads !== undefined && (
                  <span className="inline-flex items-center gap-1.5">
                    <Download size={13} className="text-fund" aria-hidden />
                    <strong className="font-mono text-ink">{fmtCompact(shownImpact.weeklyDownloads, locale)}</strong>
                    {t("product.weeklyDownloads")}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <DataModeBadge mode={shownImpact.dataMode} />
              </div>
            </div>
          )}
          {primaryConsequence && (
            <p className="mt-2 border-t border-warn/15 pt-2 text-xs leading-relaxed text-mut">
              {lt(primaryConsequence.text)}
            </p>
          )}
          <GeneratorBadge generator={shownImpact.generator} />
        </div>
      ) : fetchedExplanation === null ? null : (
        <div className="space-y-2 rounded-xl border border-warn/20 bg-warn/5 p-3.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
        </div>
      )}

      {/* what it does for you, in one sentence */}
      {shownPlain ? (
        <div className="space-y-2 rounded-lg border border-line bg-bg0/25 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-dim">
            {t("product.whatItDoes")}
          </p>
          <div className="flex items-start gap-3">
            <span aria-hidden className="shrink-0 text-2xl leading-none">
              {shownPlain.emoji}
            </span>
            <p className="text-sm font-medium leading-relaxed text-ink">{lt(shownPlain.oneLiner)}</p>
          </div>
        </div>
      ) : fetchedExplanation === null ? (
        <div className="space-y-2 rounded-lg border border-line bg-bg0/30 p-3">
          <p className="text-sm leading-relaxed text-mut">{lt(project.description)}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-dim">{t("plain.technical")}</span>
            <button
              type="button"
              onClick={() => setPlainRetry((value) => value + 1)}
              className="relative z-10 inline-flex min-h-11 cursor-pointer items-center px-2 text-xs font-semibold text-fund underline"
            >
              {t("common.retry")}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>
          <Skeleton className="h-4 w-28" />
        </div>
      )}

      {/* Why this particular mission deserves backing. Repository explanations
          answer "what is it?"; these campaign-owned fields answer the missing
          human question: "what changes if I help, for whom, and why now?" */}
      <div className="rounded-xl border border-fund/25 bg-fund/5 p-3.5">
        <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-fund">
          <HeartHandshake size={14} aria-hidden />
          {t("product.backingValue")}
        </h4>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-ink">
          {lt(mission.tagline)}
        </p>
        <div className="mt-3 space-y-2 border-t border-fund/15 pt-3 text-xs leading-relaxed text-mut">
          <p className="flex items-start gap-2">
            <Users size={13} className="mt-0.5 shrink-0 text-fund" aria-hidden />
            <span>
              <strong className="font-semibold text-ink">{t("product.whoBenefits")}</strong>{" "}
              {lt(mission.story.whoBenefits)}
            </span>
          </p>
          <p>
            <strong className="font-semibold text-ink">{t("product.whyNow")}</strong>{" "}
            {lt(mission.story.why)}
          </p>
        </div>
      </div>

      {/* what it needs right now — the mission, in the product's own terms */}
      <div className="mt-auto rounded-xl border border-line bg-bg0/40 p-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-dim">
          {t("product.needs")}
        </h4>
        <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-ink">
          {lt(mission.title)}
        </p>

        {funded !== null && (
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-bg3">
            <div className="cc-meter-fill h-full rounded-full" style={{ width: fmtPct(funded) }} />
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-[11px]">
          <span className="font-mono text-dim">
            <Credits n={mission.computePledged} compact className="font-semibold text-mut" />
            {mission.computeGoal > 0 && (
              <>
                {" / "}
                <Credits n={mission.computeGoal} compact />
              </>
            )}
          </span>
          {funded !== null && (
            <span className="font-mono font-semibold text-brand-text">
              {fmtPct(funded)} {t("product.funded")}
            </span>
          )}
        </div>
      </div>

      {/* the ask */}
      {project.figuresMode === "demo" && (
        <p className="rounded-lg border border-warn/25 bg-warn/5 px-3 py-2 text-[11px] leading-relaxed text-dim">
          {t("product.demoScenario")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {fundable ? (
          onDonate ? (
            <Btn onClick={onDonate} className="relative z-10 min-h-11 flex-1 justify-center">
              ⚡ {primaryCtaLabel}
            </Btn>
          ) : (
            <Link
              to={`/missions/${mission.id}`}
              className="relative z-10 inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-fund px-4 py-2 text-sm font-semibold text-bg0 transition-all hover:brightness-110"
            >
              ⚡ {primaryCtaLabel}
            </Link>
          )
        ) : (
          /* Pledging is closed once a mission is funded or in flight. Saying so
             beats a dead primary button, and beats offering a pledge the server
             would refuse. */
          <Link
            to={`/missions/${mission.id}${demoQuery ?? ""}`}
            data-demo-action={demoAction}
            className="relative z-10 inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-line2 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-bg2"
          >
            {primaryCtaLabel} →
          </Link>
        )}
        {/* Source links and execution workspaces answer different questions.
            Seeded campaigns now carry a separately verified public GitHub URL;
            the local fixture remains the only executable workspace. */}
        {publicRepoUrl && (
          <a
            href={publicRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line2 px-3 text-xs text-mut transition-colors hover:bg-bg3 hover:text-ink"
          >
            <ExternalLink size={13} aria-hidden />
            {t("product.viewRepo")}
          </a>
        )}
      </div>
    </article>
  );
}

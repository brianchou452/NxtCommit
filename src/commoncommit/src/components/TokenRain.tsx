import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, Zap } from "lucide-react";
import { useI18n } from "../i18n/index.js";
import { api } from "../lib/api.js";
import { fmtCompact } from "../lib/format.js";
import { globalStreamUrl, useStream } from "../lib/stream.js";
import { meteorBurstSize } from "../lib/communityVisuals.js";
import type { AchievementCode } from "../../shared/types.js";

/** Matches cc-rain-fall in styles.css — a streak is dropped when its fall ends. */
const FALL_MS = 4600;

/**
 * A funding burst (or a reconnect storm) must not spawn hundreds of nodes. Extra
 * events are dropped, not queued: a queue would replay the burst on resume and
 * turn a past moment into a live-looking one.
 */
const MAX_CONCURRENT = 16;

/**
 * A pledge older than this is history, not an event. The guard matters because
 * the trigger frames only say "this mission changed" — the amount and the donor
 * are then read from the pledge record itself, and without a freshness check an
 * unrelated engine update could rain a donation from an hour ago.
 */
const FRESH_WINDOW_MS = 120_000;

/**
 * The achievement codes `store.evaluatePledgeAchievements` can award. Every other
 * code comes from `evaluateReleaseAchievements` and is published by the engine
 * when a mission is RELEASED, not when someone donates.
 *
 * The distinction is not pedantry: in demo mode a mission can go pledge →
 * auto-execute → release inside the freshness window, so a release frame would
 * otherwise re-present the funding pledge as a donation happening now. The
 * freshness check cannot catch that on its own.
 */
const PLEDGE_ACHIEVEMENTS: ReadonlySet<AchievementCode> = new Set([
  "first_spark",
  "early_backer",
  "final_push",
  "dependency_defender",
]);

interface Streak {
  id: number;
  sponsor: string;
  detail: string;
  topPct: number;
  delayMs: number;
  path: string;
  scale: number;
  primary: boolean;
}

/**
 * Donation rain.
 *
 * Every streak corresponds to a real row in the local database. There is no
 * timer inventing donations: the component watches the global SSE channel (the
 * only two frame kinds that reach it are `mission_update` and `achievement` —
 * see the fan-out rule in server/bus.ts), treats a frame purely as "go look",
 * and reads the handle and the amount from the mission's own pledge list. If
 * nobody donates, nothing falls.
 *
 * A frame never decides WHO donated. Where the frame identifies a contributor,
 * only that contributor's pledges are considered, because the label names a
 * person by handle and attributing someone else's donation to them is a false
 * statement about them, not a rounding error.
 *
 * The amount is labelled in CREDITS, not tokens: a pledge stores credits, and
 * `1 credit ≈ 1K tokens` is a conversion the server owns (it computes
 * `ImpactStats.tokensDonated`). Doing that multiplication here would either
 * misstate the unit by 1000× or risk contradicting the counters on the same page.
 */
export function TokenRain() {
  const { t, locale } = useI18n();
  // Read once: this decides whether the feature exists at all for this visitor.
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [paused, setPaused] = useState(false);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  /**
   * Carries its own id so the live region can swap the child NODE rather than
   * only its text. A screen reader ignores a re-render that leaves the text
   * identical, and two consecutive equal donations (same backer, same amount)
   * are perfectly ordinary — they would go unannounced.
   */
  const [announcement, setAnnouncement] = useState<{ id: number; text: string } | null>(null);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const aliveRef = useRef(true);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const activeRef = useRef(0);
  const seqRef = useRef(0);
  /** Pledge ids already rained, so two frames about one pledge fall once. */
  const seenRef = useRef(new Set<string>());
  /**
   * In-flight lookups keyed by mission + contributor, so the three or four
   * achievement frames one pledge can produce cost a single request.
   */
  const inFlightRef = useRef(new Set<string>());
  /** Last observed pledged total per mission, to detect a real increase. */
  const pledgedRef = useRef(new Map<string, number>());

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      // Nothing may outlive the component: a pending removal timer firing after
      // unmount would setState on a dead tree, and a resolved lookup would keep
      // the closure alive.
      aliveRef.current = false;
      for (const timer of timersRef.current) clearTimeout(timer);
      timersRef.current.clear();
      activeRef.current = 0;
    };
  }, []);

  const spawn = useCallback((sponsor: string, detail: string, amount: number, backerCount: number) => {
    if (!aliveRef.current || pausedRef.current) return;
    const room = Math.max(0, MAX_CONCURRENT - activeRef.current);
    const count = Math.min(room, meteorBurstSize(amount, backerCount));
    if (count === 0) return;
    const viewportWidth = Math.max(window.innerWidth, 320);
    const created = Array.from({ length: count }, (_, index): Streak => {
      const startY = 24 + Math.round(Math.random() * 24);
      const apexY = -72 - Math.round(Math.random() * 96);
      const endY = 8 + Math.round(Math.random() * 64);
      // One cubic Bézier is a genuinely continuous trajectory. Its geometry is
      // computed from the current viewport so a phone and a wide screen both
      // enter and leave fully off-canvas without stitching transform segments.
      const path = `path("M -360 ${startY} C ${Math.round(viewportWidth * 0.18)} ${apexY}, ${Math.round(viewportWidth * 0.68)} ${apexY}, ${viewportWidth + 420} ${endY}")`;
      return {
        id: ++seqRef.current,
        sponsor,
        detail,
        // Keep the primary meteor in the central band so its amount remains
        // readable. Companions carry the sponsor name but are deliberately terse.
        topPct: index === 0 ? 30 + Math.random() * 24 : 10 + Math.random() * 68,
        delayMs: index * 190 + Math.round(Math.random() * 160),
        path,
        scale: 0.72 + Math.random() * 0.68,
        primary: index === 0,
      };
    });
    activeRef.current += created.length;
    setStreaks((prev) => [...prev, ...created]);
    setAnnouncement({ id: created[0].id, text: `${t("rain.srAnnounce")} ${detail}` });
    for (const streak of created) {
      const timer = setTimeout(() => {
        timersRef.current.delete(timer);
        if (!aliveRef.current) return;
        activeRef.current = Math.max(0, activeRef.current - 1);
        setStreaks((prev) => prev.filter((s) => s.id !== streak.id));
      }, FALL_MS + streak.delayMs);
      timersRef.current.add(timer);
    }
  }, [t]);

  /**
   * Turn "something happened on this mission" into a real donation, or into
   * nothing. Failures are silent on purpose — decoration must never surface an
   * error, and must never fall back to a plausible-looking guess.
   *
   * `contributorId`, when the frame carries one, narrows the search to that
   * person's own pledges.
   */
  const rainLatestPledge = useCallback(
    async (missionId: string, contributorId?: string) => {
      if (!aliveRef.current || pausedRef.current) return;
      const lookupKey = `${missionId}:${contributorId ?? "*"}`;
      if (inFlightRef.current.has(lookupKey)) return;
      inFlightRef.current.add(lookupKey);
      try {
        const detail = await api.mission(missionId);
        const candidates = contributorId
          ? detail.pledges.filter((p) => p.contributorId === contributorId)
          : detail.pledges;
        const latest = candidates.reduce<(typeof detail.pledges)[number] | null>(
          (best, p) => (best === null || p.createdAt > best.createdAt ? p : best),
          null
        );
        if (!latest || seenRef.current.has(latest.id)) return;
        seenRef.current.add(latest.id);
        if (Date.now() - new Date(latest.createdAt).getTime() > FRESH_WINDOW_MS) return;
        // Tokens, because that is the unit a donor thinks in and the one the
        // product is named after — but with an explicit "≈". A pledge stores
        // CREDITS; `1 credit ≈ 1K tokens` is a documented approximation, and
        // printing a converted figure as though it were exact is the small lie
        // this marker refuses. The server owns the same conversion for the hero
        // counter, so the two surfaces cannot disagree about the ratio.
        spawn(
          latest.contributor.handle,
          `${latest.contributor.handle} ${t("rain.donated")} ≈${fmtCompact(latest.amount * 1000, locale)} ${t("rain.tokens")}`,
          latest.amount,
          detail.backerCount
        );
      } catch {
        // No streak. A donation we could not read is not a donation we may show.
      } finally {
        inFlightRef.current.delete(lookupKey);
      }
    },
    [locale, spawn, t]
  );

  // Subscribing at all is pointless under reduced motion, where nothing renders.
  // The subscription stays up while paused so resuming cannot replay a backlog.
  useStream(reduced ? null : globalStreamUrl(), (msg) => {
    if (pausedRef.current) return;
    if (msg.kind === "achievement") {
      // Only the pledge-time codes mean "a pledge just landed"; a release code
      // means a mission shipped, which is not a donation and must not fall.
      if (!PLEDGE_ACHIEVEMENTS.has(msg.achievement.code)) return;
      void rainLatestPledge(msg.achievement.missionId, msg.contributorId);
      return;
    }
    if (msg.kind === "mission_update") {
      const previous = pledgedRef.current.get(msg.mission.id);
      pledgedRef.current.set(msg.mission.id, msg.mission.computePledged);
      // The first frame for a mission only establishes a baseline: without a
      // prior value, "pledged is 400" says nothing about when it became 400.
      if (previous !== undefined && msg.mission.computePledged > previous) {
        void rainLatestPledge(msg.mission.id);
      }
    }
  });

  if (reduced) return null;

  return (
    <>
      {/* pointer-events-none is load-bearing: this layer covers the whole page. */}
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden>
        {streaks.map((streak) => (
          <div
            key={streak.id}
            className="cc-rain absolute left-0 flex items-center"
            style={{
              top: `${streak.topPct}%`,
              animationDelay: `${streak.delayMs}ms`,
              offsetPath: streak.path,
              "--cc-meteor-scale": streak.scale,
            } as CSSProperties}
          >
            <span
              className="cc-streak relative block h-0.5 w-28"
              style={{ background: "linear-gradient(to right, transparent, var(--color-brand2))" }}
            />
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand2 shadow-[0_0_18px_6px_color-mix(in_srgb,var(--color-brand2)_55%,transparent)]" />
            <span className="cc-glass ml-2 flex max-w-[min(70vw,20rem)] items-center gap-1.5 overflow-hidden rounded-full border-brand2/40 px-3 py-1.5 text-[11px] font-semibold text-ink shadow-2xl">
                <Zap size={11} className="shrink-0 text-brand2" fill="currentColor" />
                <span className="truncate">{streak.primary ? streak.detail : streak.sponsor}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Announced, not focused: the feed must never move the caret. */}
      <div aria-live="polite" className="sr-only">
        {announcement && <p key={announcement.id}>{announcement.text}</p>}
      </div>

      <div className="fixed bottom-5 left-4 z-40">
        <button
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t("rain.resume") : t("rain.pause")}
          className="cc-glass inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-full px-3 text-xs font-semibold text-mut transition-colors hover:text-ink"
        >
          {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
        </button>
      </div>
    </>
  );
}

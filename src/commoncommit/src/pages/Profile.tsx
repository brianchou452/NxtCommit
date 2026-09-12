import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Download,
  GitPullRequest,
  Receipt,
  Trophy,
  UserX,
  Zap,
} from "lucide-react";
import { useI18n } from "../i18n/index.js";
import { useApp } from "../state/AppContext.js";
import { api } from "../lib/api.js";
import { useStream, globalStreamUrl } from "../lib/stream.js";
import { fmtCompact, fmtInt, timeAgo } from "../lib/format.js";
import { BadgeShelf } from "../components/BadgeShelf.js";
import {
  ACHIEVEMENT_ICONS,
  ACHIEVEMENT_ACCENTS,
  ACHIEVEMENT_CARD_ACCENTS,
  AchievementBadge,
  Avatar,
  Card,
  Credits,
  DataModeBadge,
  EmptyState,
  SectionHeading,
  Skeleton,
  StatusPill,
} from "../components/ui.js";
import type {
  AchievementCode,
  AchievementDef,
  ContributorProfile,
  ImpactReceipt,
} from "../../shared/types.js";

// ── chain primitives (impact receipt flow) ───────────────────────────────────

type Tone = "fund" | "warn" | "verif" | "dev" | "adopt";

const TONE_STYLES: Record<Tone, string> = {
  fund: "border-fund/30 bg-fund/5 text-fund",
  warn: "border-warn/30 bg-warn/5 text-warn",
  verif: "border-verif/30 bg-verif/5 text-verif",
  dev: "border-dev/30 bg-dev/5 text-dev",
  adopt: "border-adopt/30 bg-adopt/5 text-adopt",
};

/** One node in the pledge → release chain. No tone = dim placeholder stage. */
function ChainNode({ tone, children }: { tone?: Tone; children: ReactNode }) {
  const cls = tone ? TONE_STYLES[tone] : "border-dashed border-line2 text-dim";
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] ${cls}`}
    >
      {children}
    </span>
  );
}

function ChainArrow() {
  return <ArrowRight size={12} className="shrink-0 text-dim" />;
}

// ── impact receipt card ──────────────────────────────────────────────────────

function ReceiptCard({
  receipt,
  defsByCode,
}: {
  receipt: ImpactReceipt;
  defsByCode: Map<AchievementCode, AchievementDef>;
}) {
  const { t, lt, locale } = useI18n();
  const r = receipt;

  return (
    <Card className="cc-event-in flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
      {/* mission identity */}
      <div className="min-w-0 shrink-0 lg:w-52">
        <Link
          to={`/missions/${r.missionId}`}
          className="group block min-h-11 rounded-lg px-1 py-1 transition-colors hover:bg-bg2"
        >
          <span className="block truncate text-sm font-bold text-ink transition-colors group-hover:text-fund">{r.projectName}</span>
          <span className="mt-0.5 block truncate text-[11px] text-dim">{lt(r.missionTitle)}</span>
        </Link>
      </div>

      {/* traceability chain: pledge → consume [→ refund] → PR → release → adoption */}
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        <ChainNode tone="fund">
          <Zap size={11} fill="currentColor" className="shrink-0" />
          {fmtInt(r.pledged, locale)} {t("msn.pledged")}
        </ChainNode>
        <ChainArrow />

        {r.consumedShare > 0 ? (
          <ChainNode tone="warn">
            {fmtInt(r.consumedShare, locale)} {t("msn.consumed")}
          </ChainNode>
        ) : (
          <ChainNode>{t("msn.consumed")}</ChainNode>
        )}

        {r.refundedShare > 0 && (
          <>
            <ChainArrow />
            <ChainNode tone="verif">
              {fmtInt(r.refundedShare, locale)} {t("ledger.refund_unused")}
            </ChainNode>
          </>
        )}
        <ChainArrow />

        {r.prTitle ? (
          <ChainNode tone="dev">
            <GitPullRequest size={11} className="shrink-0" />
            <span className="max-w-44 truncate">{lt(r.prTitle)}</span>
          </ChainNode>
        ) : (
          <ChainNode>
            <GitPullRequest size={11} className="shrink-0" />
            {t("event.pr_prepared")}
          </ChainNode>
        )}
        <ChainArrow />

        {r.releaseVersion ? (
          <ChainNode tone="adopt">
            {`v${r.releaseVersion}`}
            {r.releasedAt && <span className="opacity-70">· {timeAgo(r.releasedAt, t)}</span>}
          </ChainNode>
        ) : (
          <ChainNode>{t("event.release")}</ChainNode>
        )}
        <ChainArrow />

        {r.adoption ? (
          <span className="inline-flex items-center gap-1.5">
            <ChainNode tone="adopt">
              <Download size={11} className="shrink-0" />
              {fmtCompact(r.adoption.weeklyDownloads, locale)} {t("msn.adoption.weekly")}
            </ChainNode>
            <DataModeBadge mode={r.adoption.dataMode} />
          </span>
        ) : (
          <ChainNode>{t("dim.adoption")}</ChainNode>
        )}
      </div>

      {/* achievements earned on this mission */}
      {r.achievements.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:max-w-56 lg:justify-end">
          {r.achievements.map((code) => (
            <AchievementBadge
              key={code}
              code={code}
              tier={defsByCode.get(code)?.tier ?? "bronze"}
              size="sm"
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ── achievement card ─────────────────────────────────────────────────────────

const TIER_CIRCLE: Record<AchievementDef["tier"], string> = {
  bronze: "border-[#b3763f]/50 bg-[#b3763f]/10 text-[#e0a878]",
  silver: "border-[#9fb2c8]/50 bg-[#9fb2c8]/10 text-[#c8d6e5]",
  gold: "border-fund/60 bg-fund/10 text-fund",
};

const TIER_CARD: Record<AchievementDef["tier"], string> = {
  bronze: "border-[#b3763f]/35 bg-gradient-to-br from-[#b3763f]/10 via-bg2/70 to-bg2/40",
  silver: "border-[#9fb2c8]/35 bg-gradient-to-br from-[#9fb2c8]/12 via-bg2/70 to-bg2/40",
  gold: "border-fund/40 bg-gradient-to-br from-fund/12 via-bg2/70 to-bg2/40 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-fund)_18%,transparent)]",
};

/**
 * One card per badge type. The same badge can be earned on several missions —
 * show a count instead of repeating the card.
 */
function groupAchievements(
  earned: ContributorProfile["achievements"]
): { code: AchievementCode; def: AchievementDef; count: number; latestAt: string }[] {
  const groups = new Map<AchievementCode, { code: AchievementCode; def: AchievementDef; count: number; latestAt: string }>();
  for (const a of earned) {
    const existing = groups.get(a.code);
    if (existing) {
      existing.count += 1;
      if (a.earnedAt > existing.latestAt) existing.latestAt = a.earnedAt;
    } else {
      groups.set(a.code, { code: a.code, def: a.def, count: 1, latestAt: a.earnedAt });
    }
  }
  return [...groups.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

// ── main page ────────────────────────────────────────────────────────────────

function ProfileView({ profile, reload }: { profile: ContributorProfile; reload: () => void }) {
  const { t, lt, locale } = useI18n();
  const { wallet, boot } = useApp();

  // Live wallet for the demo persona; server snapshot for everyone else.
  const walletValue = profile.isCurrentUser && boot ? wallet : profile.walletBalance;

  const defsByCode = useMemo(() => {
    const map = new Map<AchievementCode, AchievementDef>();
    for (const a of profile.achievements) map.set(a.code, a.def);
    return map;
  }, [profile.achievements]);

  // Refresh when this contributor earns an achievement or missions move stage.
  useStream(globalStreamUrl(), (msg) => {
    if (msg.kind === "achievement" && msg.contributorId === profile.id) reload();
    else if (msg.kind === "mission_update") reload();
  });

  const heroStats: { label: string; value: ReactNode }[] = [
    {
      label: t("prof.wallet"),
      value: <Credits n={walletValue} className="text-lg font-semibold text-ink" />,
    },
    {
      label: t("prof.pledged"),
      value: <Credits n={profile.totalPledged} className="text-lg font-semibold text-ink" />,
    },
    {
      label: t("prof.reputation"),
      value: (
        <span className="font-mono text-lg font-semibold text-fund">
          {fmtInt(profile.reputation, locale)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-8">
      {/* hero */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-dim">{t("prof.title")}</p>
          <DataModeBadge mode={profile.dataMode} />
        </div>
        <Card className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar name={profile.name} color={profile.avatarColor} size={64} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
                  {profile.isCurrentUser && (
                    <span className="rounded-full border border-fund/40 bg-fund/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fund">
                      {t("nav.profile")}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-sm text-dim">{profile.handle}</p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-mut">{lt(profile.bio)}</p>
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-x-8 gap-y-2 border-t border-line pt-4 md:border-l md:border-t-0 md:pl-8 md:pt-1">
              {heroStats.map((s) => (
                <div key={s.label}>
                  {s.value}
                  <p className="mt-0.5 text-xs text-dim">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* stat strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-4">
          <p className="font-mono text-xl font-bold text-ink">
            {fmtInt(profile.stats.missionsSupported, locale)}
          </p>
          <p className="mt-1 text-xs text-dim">{t("prof.stats.supported")}</p>
        </Card>
        <Card className="p-4">
          <p className="font-mono text-xl font-bold text-ink">
            {fmtInt(profile.stats.shipped, locale)}
          </p>
          <p className="mt-1 text-xs text-dim">{t("prof.stats.shipped")}</p>
        </Card>
        <Card className="p-4">
          <Credits n={profile.stats.creditsConsumed} compact className="text-xl font-bold text-ink" />
          <p className="mt-1 text-xs text-dim">{t("prof.stats.consumed")}</p>
        </Card>
        <Card className="p-4">
          <Credits n={profile.stats.creditsRefunded} compact className="text-xl font-bold text-verif" />
          <p className="mt-1 text-xs text-dim">{t("prof.stats.refunded")}</p>
        </Card>
        <Card className="p-4">
          <p className="font-mono text-xl font-bold text-adopt">
            {fmtCompact(profile.stats.downstreamDownloads, locale)}
          </p>
          <p className="mt-1 text-xs text-dim">{t("prof.stats.downloads")}</p>
        </Card>
      </section>

      {/*
        The full shelf, including what is still LOCKED. The grid below shows earned
        badges in detail — award count and when — which answers "what have I done".
        The shelf answers the different question "what is there to do", and an
        achievement system that only ever shows what you already have cannot answer
        it. Both are kept because they are not the same view.
      */}
      <BadgeShelf earned={profile.achievements} />

      {/* achievements */}
      <section>
        <SectionHeading title={t("prof.achievements")} />
        {profile.achievements.length === 0 ? (
          <EmptyState icon={<Trophy size={28} />} title={t("prof.achievements.empty")} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {groupAchievements(profile.achievements).map((g) => (
              <Card key={g.code} className={`relative flex flex-col gap-3 overflow-hidden border-l-4 p-4 ${TIER_CARD[g.def.tier]} ${ACHIEVEMENT_CARD_ACCENTS[g.code]}`}>
                <span className={`absolute -right-5 -top-5 h-20 w-20 rounded-full blur-2xl ${TIER_CIRCLE[g.def.tier]}`} aria-hidden />
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ring-1 ${TIER_CIRCLE[g.def.tier]} ${ACHIEVEMENT_ACCENTS[g.code]}`}
                  >
                    {ACHIEVEMENT_ICONS[g.code]}
                  </span>
                  <span className="font-mono text-[10px] text-dim">{timeAgo(g.latestAt, t)}</span>
                </div>
                <div>
                  <p className="flex items-baseline gap-1.5 text-sm font-bold text-ink">
                    {lt(g.def.name)}
                    {g.count > 1 && (
                      <span className="font-mono text-[11px] font-semibold text-fund">×{g.count}</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-mut">{lt(g.def.description)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* impact receipts */}
      <section>
        <SectionHeading title={t("prof.receipts")} blurb={t("prof.receipts.sub")} />
        {profile.receipts.length === 0 ? (
          <EmptyState icon={<Receipt size={28} />} title={t("prof.receipts.empty")} />
        ) : (
          <div className="space-y-3">
            {profile.receipts.map((r) => (
              <ReceiptCard key={r.missionId} receipt={r} defsByCode={defsByCode} />
            ))}
          </div>
        )}
      </section>

      {/* pledge history */}
      {profile.pledges.length > 0 && (
        <section>
          <SectionHeading title={t("prof.pledges")} />
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {profile.pledges.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-bg2">
                      <td className="max-w-64 px-4 py-3">
                        <Link
                          to={`/missions/${p.missionId}`}
                          className="group block min-h-11 rounded-lg px-1 py-1 transition-colors hover:bg-bg2"
                        >
                          <span className="block truncate font-semibold text-ink transition-colors group-hover:text-fund">{p.projectName}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-dim">{lt(p.missionTitle)}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={p.missionStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Credits n={p.amount} className="font-semibold" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-dim">
                        {timeAgo(p.createdAt, t)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const [error, setError] = useState<"notfound" | "error" | null>(null);

  const load = useCallback(() => {
    if (!id) {
      setError("notfound");
      return;
    }
    api
      .contributor(id)
      .then((p) => {
        setProfile(p);
        setError(null);
      })
      .catch((e: unknown) => {
        const status =
          typeof e === "object" && e !== null && "status" in e
            ? Number((e as { status: unknown }).status)
            : 0;
        setError(status === 404 ? "notfound" : "error");
      });
  }, [id]);

  useEffect(() => {
    setProfile(null);
    setError(null);
    load();
  }, [load]);

  if (error === "notfound") {
    return (
      <div className="py-16">
        <EmptyState icon={<UserX size={28} />} title={t("prof.notFound")} />
      </div>
    );
  }

  if (error === "error") {
    return (
      <div className="py-24 text-center">
        <p className="font-semibold text-danger">{t("common.error")}</p>
        <button
          onClick={() => {
            setError(null);
            load();
          }}
          className="mt-3 cursor-pointer text-sm text-fund underline"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-10 pb-8">
        <div>
          <Skeleton className="mb-3 h-4 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div>
          <Skeleton className="mb-4 h-6 w-48" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-4 h-6 w-48" />
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <ProfileView profile={profile} reload={load} />;
}

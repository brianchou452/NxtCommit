import type { Campaign, ContributorProfile } from "../../shared/home.js";
import type { MissionDetail, PledgeRecord } from "../../shared/mission.js";
import {
  commitmentBadges,
  type CommitmentBadgeCode,
} from "../../shared/commitment.js";
import { en } from "../../src/i18n/en.js";
import { zhTW } from "../../src/i18n/zh-TW.js";

export type ProfileMissionReader = (id: string) => MissionDetail | undefined;
const localized = (key: string) => ({
  en: en[key as keyof typeof en] ?? key,
  "zh-TW": zhTW[key as keyof typeof zhTW] ?? key,
});

/** Read-only projection: the mission service remains the sole ledger/wallet authority. */
export function enrichContributor(
  profile: ContributorProfile,
  campaigns: Campaign[],
  allPledges: PledgeRecord[],
  readMission?: ProfileMissionReader,
): ContributorProfile {
  const recordedReleases = profile.receipts.filter(r => r.status === 'released');
  const legacyMissionId = recordedReleases.length === 1 ? recordedReleases[0]!.missionId : undefined;
  const achievements: ContributorProfile["achievements"] =
    profile.achievements.map((a) => ({
      ...a,
      code: a.code === "ship" ? "ship_it" : a.code,
      ...(!a.missionId && (a.code === 'ship' || a.code === 'ship_it') && legacyMissionId ? {missionId: legacyMissionId} : {}),
    }));
  const award = (
    code: CommitmentBadgeCode,
    missionId: string,
    earnedAt: string,
  ) => {
    if (
      achievements.some(
        (a) => a.code === code && (a.missionId === missionId || !a.missionId),
      )
    )
      return;
    achievements.push({
      id: `${profile.id}:${missionId}:${code}`,
      code,
      missionId,
      earnedAt,
      source: "demo",
    });
  };
  const ownPledges = allPledges
    .filter((p) => p.contributorId === profile.id)
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
  const projects = new Set<string>();
  for (const pledge of ownPledges) {
    const campaign = campaigns.find((m) => m.id === pledge.missionId);
    if (!campaign) continue;
    projects.add(campaign.projectId);
    if (projects.size >= 3)
      award("oss_guardian", pledge.missionId, pledge.createdAt);
    if (new Date(pledge.createdAt).getUTCHours() < 6)
      award("night_owl_sponsor", pledge.missionId, pledge.createdAt);
  }
  const receipts = profile.receipts.map((receipt) => {
    const campaign = campaigns.find((m) => m.id === receipt.missionId)!;
    const detail = readMission?.(receipt.missionId);
    const pledges = (
      detail?.pledges ??
      allPledges.filter((p) => p.missionId === receipt.missionId)
    )
      .slice()
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      );
    let funded = 0;
    for (const [index, pledge] of pledges.entries()) {
      if (pledge.contributorId === profile.id) {
        if (index === 0)
          award("first_spark", receipt.missionId, pledge.createdAt);
        if (campaign.computeGoal > 0 && funded / campaign.computeGoal < 0.25)
          award("early_backer", receipt.missionId, pledge.createdAt);
        if (
          funded < campaign.computeGoal &&
          funded + pledge.amount >= campaign.computeGoal
        )
          award("final_push", receipt.missionId, pledge.createdAt);
        // The integrated projection uses usedByYou to mean backed-by-you, which
        // does not establish a dependency. Only the authored seed flag qualifies.
        if (!detail && campaign.project.usedByYou)
          award("dependency_defender", receipt.missionId, pledge.createdAt);
      }
      funded += pledge.amount;
    }
    const enriched: ContributorProfile["receipts"][number] = {
      ...receipt,
      projectName: campaign.project.name,
      missionTitle: campaign.title,
    };
    if (detail?.catalog?.releaseVersion) enriched.releaseVersion=detail.catalog.releaseVersion;
    if (detail?.catalog?.releasedAt) enriched.releasedAt=detail.catalog.releasedAt;
    if (detail?.catalog?.adoption) enriched.adoption=detail.catalog.adoption;
    if (detail) {
      const consumed = allocateCredits(
        detail.computeConsumed,
        pledges.map((p) => ({ key: p.id, weight: p.amount })),
      );
      enriched.consumedShare = pledges
        .filter((p) => p.contributorId === profile.id)
        .reduce((sum, p) => sum + (consumed.get(p.id) ?? 0), 0);
      const refunds = detail.ledger.filter((r) => r.type === "refund_unused");
      enriched.refundedShare = refunds
        .filter((r) => r.contributorId === profile.id)
        .reduce((sum, r) => sum + r.amount, 0);
      // Legacy unassigned refunds are allocated only when there are no assigned rows.
      if (refunds.length && refunds.every((r) => !r.contributorId)) {
        const allocated = allocateCredits(
          refunds.reduce((sum, r) => sum + r.amount, 0),
          pledges.map((p) => ({ key: p.id, weight: p.amount })),
        );
        enriched.refundedShare = pledges
          .filter((p) => p.contributorId === profile.id)
          .reduce((sum, p) => sum + (allocated.get(p.id) ?? 0), 0);
      }
      if (detail.latestRunId) enriched.runId = detail.latestRunId;
      enriched.artifactPrepared = !!detail.artifact;
    }
    // Release awards require a recorded release/award date, never the read time.
    const releasedAt =
      enriched.releasedAt ??
      (profile.receipts.filter((r) => r.status === "released").length === 1
        ? profile.achievements.find(
            (a) => a.code === "ship" || a.code === "ship_it",
          )?.earnedAt
        : undefined);
    if (receipt.status === "released" && releasedAt) {
      award("ship_it", receipt.missionId, releasedAt);
      if (campaign.project.stars !== undefined && campaign.project.stars < 500)
        award("hidden_gem", receipt.missionId, releasedAt);
      if (campaign.tags.includes("security"))
        award("security_guardian", receipt.missionId, releasedAt);
      if (campaign.tags.includes("rescued"))
        award("project_rescuer", receipt.missionId, releasedAt);
      const feature = campaign.tags.some((t) =>
        ["feature", "dx", "docs"].includes(t),
      );
      const bug = campaign.tags.some((t) =>
        [
          "bug",
          "security",
          "reliability",
          "performance",
          "rescue",
          "rescued",
        ].includes(t),
      );
      if (bug && !feature && pledges[0]?.contributorId === profile.id)
        award("first_bug_hero", receipt.missionId, releasedAt);
      if (
        detail?.artifact?.files.some((f) =>
          /(^|\/)(docs?\/|README|CHANGELOG)|\.mdx?$/i.test(f.path),
        )
      )
        award("documentation_angel", receipt.missionId, releasedAt);
      if (
        detail?.latestRun?.mode === "llm" ||
        detail?.latestRun?.mode === "codex"
      )
        award("ai_architect", receipt.missionId, releasedAt);
    }
    enriched.achievements = achievements
      .filter((a) => a.missionId === receipt.missionId)
      .map((a) => a.code);
    return enriched;
  });
  const measured = receipts.filter((r) => r.consumedShare !== undefined);
  return {
    ...profile,
    receipts,
    achievements: achievements.sort(
      (a, b) =>
        b.earnedAt.localeCompare(a.earnedAt) || a.id.localeCompare(b.id),
    ),
    stats: {
      ...profile.stats,
      ...(measured.length
        ? {
            creditsConsumed: measured.reduce((s, r) => s + r.consumedShare!, 0),
            creditsRefunded: measured.reduce(
              (s, r) => s + (r.refundedShare ?? 0),
              0,
            ),
            accountingPartial: measured.length < receipts.length,
          }
        : {}),
    },
    achievementDefs: commitmentBadges.map((def) => ({
      ...def,
      name: localized(`commitment_badge_${def.code}`),
      description: localized(`commitment_badge_${def.code}_desc`),
    })),
  };
}

export function allocateCredits(
  total: number,
  weights: { key: string; weight: number }[],
): Map<string, number> {
  const amount = Math.max(0, Math.floor(total));
  const aggregated = new Map<string, number>();
  for (const item of weights) {
    const weight = Number.isFinite(item.weight) ? Math.max(0, item.weight) : 0;
    aggregated.set(item.key, (aggregated.get(item.key) ?? 0) + weight);
  }
  const denominator = [...aggregated.values()].reduce(
    (sum, weight) => sum + weight,
    0,
  );
  const result = new Map<string, number>(
    [...aggregated.keys()].map((key) => [key, 0]),
  );
  if (amount === 0 || denominator === 0) return result;

  const ranked = [...aggregated.entries()].map(([key, weight]) => {
    const exact = (amount * weight) / denominator;
    const floor = Math.floor(exact);
    result.set(key, floor);
    return { key, remainder: exact - floor };
  });
  let left =
    amount - [...result.values()].reduce((sum, value) => sum + value, 0);
  ranked.sort(
    (a, b) => b.remainder - a.remainder || a.key.localeCompare(b.key),
  );
  for (let i = 0; i < left; i++) {
    const key = ranked[i]!.key;
    result.set(key, (result.get(key) ?? 0) + 1);
  }
  return result;
}

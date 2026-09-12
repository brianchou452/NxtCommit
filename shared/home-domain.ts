import type { Campaign, MarketplaceSnapshot } from "./home.js";
export function fundable(campaign: Campaign): boolean {
  return (
    ["funding", "stalled"].includes(campaign.status) &&
    campaign.computeGoal > campaign.computePledged
  );
}
export function uniqueCampaigns(snapshot?: MarketplaceSnapshot): Campaign[] {
  const seen = new Map<string, Campaign>();
  for (const mission of snapshot?.sections.flatMap((s) => s.missions) ?? [])
    if (!seen.has(mission.id)) seen.set(mission.id, mission);
  return [...seen.values()];
}
export function editorialGroups(snapshot?: MarketplaceSnapshot) {
  const remaining = new Map(uniqueCampaigns(snapshot).map((m) => [m.id, m]));
  return ["everyday", "public-interest", "builder-trend"]
    .map((key) => {
      const missions = [...remaining.values()].filter((m) =>
        m.tags.includes(key) || (key === "builder-trend" && !m.tags.some(tag => ["everyday", "public-interest"].includes(tag))),
      );
      missions.forEach((m) => remaining.delete(m.id));
      return { key, missions };
    })
    .filter((group) => group.missions.length);
}
export function releaseCampaign(
  snapshot?: MarketplaceSnapshot,
): Campaign | undefined {
  const released = uniqueCampaigns(snapshot).filter(
    (m) => m.status === "released",
  );
  return (
    released.find((m) => m.project.name.toLowerCase() === "marked") ??
    released[0]
  );
}

export const commitmentBadges = [
  {
    code: "first_spark",
    tier: "bronze",
    icon: "Sparkles",
  },
  {
    code: "early_backer",
    tier: "bronze",
    icon: "Sunrise",
  },
  {
    code: "final_push",
    tier: "silver",
    icon: "Rocket",
  },
  {
    code: "ship_it",
    tier: "silver",
    icon: "PackageCheck",
  },
  {
    code: "project_rescuer",
    tier: "gold",
    icon: "LifeBuoy",
  },
  {
    code: "security_guardian",
    tier: "gold",
    icon: "ShieldCheck",
  },
  {
    code: "hidden_gem",
    tier: "silver",
    icon: "Gem",
  },
  {
    code: "dependency_defender",
    tier: "silver",
    icon: "Network",
  },
  {
    code: "first_bug_hero",
    tier: "gold",
    icon: "Bug",
  },
  {
    code: "documentation_angel",
    tier: "silver",
    icon: "BookOpen",
  },
  {
    code: "ai_architect",
    tier: "gold",
    icon: "Cpu",
  },
  {
    code: "oss_guardian",
    tier: "gold",
    icon: "ShieldCheck",
  },
  {
    code: "night_owl_sponsor",
    tier: "bronze",
    icon: "Moon",
  },
] as const;
export type CommitmentBadgeCode = (typeof commitmentBadges)[number]["code"];

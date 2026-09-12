import type { CatalogContent } from "./catalog.js";
import type { Contributor, LocalizedText, MissionStatus } from "./types.js";
export interface Campaign {
  catalog?: CatalogContent;
  id: string;
  projectId: string;
  title: LocalizedText;
  tagline: LocalizedText;
  status: MissionStatus;
  story: {
    what: LocalizedText;
    why: LocalizedText;
    whoBenefits: LocalizedText;
    approach: LocalizedText;
  };
  generator: "demo" | "openai";
  computeGoal: number;
  computePledged: number;
  backerCount: number;
  tags: string[];
  progress: {
    funding: number;
    development: number;
    verification: number;
    adoption: number;
  };
  project: {
    id: string;
    slug: string;
    name: string;
    description: LocalizedText;
    figuresMode: "demo" | "live";
    usedByYou: boolean;
    stars?: number;
    weeklyDownloads?: number;
    dependents?: number;
    language?: string;
  };
}
export type ShelfKey =
  | "almost_funded"
  | "now_building"
  | "under_verification"
  | "recently_shipped"
  | "needs_rescue"
  | "high_impact"
  | "used_by_you";
export interface MarketplaceSnapshot {
  dataMode: "demo";
  stats: {
    dataMode: "demo";
    totalPledged: number;
    missionsShipped: number;
    activeExecutions: number;
    contributors: number;
  };
  sections: { key: ShelfKey; missions: Campaign[] }[];
}
export interface Beacon {
  city: string;
  country: string;
  lat: number;
  lng: number;
  contributorId: string;
  handle: string;
  tokens: number;
}
export interface ImpactSnapshot {
  stats: {
    dataMode: "demo";
    windowLabel: "all_time";
    tokensDonated: number;
    featuresBuilt: number;
    bugsFixed: number;
    projectsRevived: number;
    trend: number[];
  };
  beacons: Beacon[];
}
export interface WallMessage {
  id: string;
  missionId: string;
  authorId: string;
  authorRole: "contributor";
  handle: string;
  body: string;
  createdAt: string;
  source: "demo";
}
export interface Nominee {
  id: string;
  category: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  votes: number;
  votedByYou: boolean;
  basis: { dataMode: "demo"; totalPledged: number };
}
export interface ProfilePledge {
  id: string;
  missionId: string;
  amount: number;
  createdAt: string;
  mission: Campaign;
  source: "demo";
}
export interface ContributorProfile extends Contributor {
  dataMode: "demo";
  stats: {
    missionsSupported: number;
    localReleases: number;
    creditsConsumed?: number;
    creditsRefunded?: number;
    downstreamDownloads?: number;
    accountingPartial?: boolean;
  };
  pledges: ProfilePledge[];
  receipts: {
    missionId: string;
    pledged: number;
    projectName?: string;
    missionTitle?: LocalizedText;
    consumedShare?: number;
    refundedShare?: number;
    runId?: string;
    artifactPrepared?: boolean;
    releaseVersion?: string;
    releasedAt?: string;
    adoption?: { dataMode: "demo" | "live"; weeklyDownloads: number };
    achievements?: string[];
    status: string;
    source: "demo";
  }[];
  achievements: {
    id: string;
    code: string;
    missionId?: string;
    earnedAt: string;
    source: "demo";
  }[];
  achievementDefs: {
    code: string;
    name: LocalizedText;
    description: LocalizedText;
    tier: string;
    icon: string;
  }[];
}

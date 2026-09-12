import type { LocalizedText } from "./primitives.js";
import type { MissionStatus } from "./execution.js";
/** Authored source content, never an engine receipt or upstream assertion. */
export interface CatalogContent {
  source: "commoncommit";
  revision: string;
  originalStatus: MissionStatus;
  seededBackerCount: number;
  seedPledged: number;
  issue: { id: string; title: LocalizedText };
  riskLevel: string;
  riskFactors: LocalizedText[];
  releaseVersion?: string;
  releasedAt?: string;
  adoption?: {
    dataMode: "demo";
    weeklyDownloads: number;
    dependents: number;
    versionAdoption: number;
  };
  history: {
    status: string;
    events: { title: LocalizedText; detail?: LocalizedText }[];
  }[];
  artifact?: {
    title: LocalizedText;
    summary: LocalizedText;
    files: { path: string; diff: string }[];
  };
}

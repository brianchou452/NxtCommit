import { adapt } from "./nxtAdapter.js";
import type {
  AgentActivity,
  BootstrapData,
  CampaignDraft,
  CampaignCritiqueResult,
  ContributorProfile,
  DonorBeacon,
  EarnedAchievement,
  AchievementDef,
  ExecutionEvent,
  ExecutionRun,
  ImpactCard,
  ImpactStats,
  IssueAssistantResult,
  MarketplaceData,
  MissionDetail,
  MissionWithProject,
  MvpNominee,
  PlainLanguage,
  PullRequestArtifact,
  RepoAnalysis,
  EvidenceExplanationResult,
  ShadowReviewResult,
  TimeMachineFrame,
  WallMessage,
} from "../../shared/types.js";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Stable server error code (see server/api.ts ERROR_CODES) for i18n. */
    readonly code?: string
  ) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit, timeoutMs = 20_000): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  let res: Response;
  let body: Record<string, unknown>;
  try {
    res = await fetch(`/api${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
      signal,
    });
    const rawBody = await res.text();
    try {
      body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
    } catch {
      body = {};
    }
  } catch (error) {
    if (timeout.aborted) throw new ApiError("Request timed out", 408, "timeout");
    if (init?.signal?.aborted) throw new ApiError("Request cancelled", 499, "cancelled");
    throw error;
  }
  if (!res.ok) {
    throw new ApiError(
      (body.error as string) ?? `Request failed (${res.status})`,
      res.status,
      body.code as string | undefined
    );
  }
  return adapt(path, body) as T;
}

export type AchievementWithDef = EarnedAchievement & { def: AchievementDef };

export const api = {
  prepareDemo: async () => {
    const {analysis}=await req<{analysis:RepoAnalysis}>("/analyze",{method:"POST",body:JSON.stringify({source:"fixture",url:"fixture://tempo"})});
    const {draft}=await req<{draft:CampaignDraft}>("/campaigns/generate",{method:"POST",body:JSON.stringify({analysis,issueId:"142",mode:"demo"})});
    return req<{mission:MissionWithProject}>("/missions",{method:"POST",body:JSON.stringify({analysis,draft})});
  },
  bootstrap: () => req<BootstrapData>("/bootstrap"),
  marketplace: () => req<MarketplaceData>("/marketplace"),
  mission: (id: string) => req<MissionDetail>(`/missions/${id}`),
  missionEvents: (id: string, runId?: string) =>
    req<{ runId?: string; events: ExecutionEvent[] }>(
      `/missions/${id}/events${runId ? `?runId=${runId}` : ""}`
    ),
  /**
   * `idempotencyKey` must identify the user's INTENT, not the request attempt —
   * the caller generates one key per "pledge this amount" action and reuses it
   * for every retry of that action. Generating a fresh key inside this function
   * would defeat the whole mechanism, since each retry would then look like a new
   * intent and charge again. Omitting it is allowed and unprotected.
   */
  pledge: (missionId: string, amount: number, idempotencyKey?: string) =>
    req<{
      mission: MissionWithProject;
      achievements: AchievementWithDef[];
      wallet: number;
      executionStarting: boolean;
    }>(`/missions/${missionId}/pledge`, {
      method: "POST",
      body: JSON.stringify({ amount }),
      headers: idempotencyKey
        ? { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }
        : undefined,
    }),
  execute: (missionId: string) =>
    req<
      | { dispatch: "inline"; run: ExecutionRun }
      | { dispatch: "queue"; request: { id: string; missionId: string; status: string } }
    >(`/missions/${missionId}/execute`, { method: "POST", body: "{}" }),
  runRequestForMission: (missionId: string) =>
    req<{
      request: { id: string; missionId: string; status: string; resultRunId?: string } | null;
    }>(
      `/missions/${missionId}/run-request`
    ),
  run: (id: string) =>
    req<{ run: ExecutionRun; events: ExecutionEvent[]; artifact?: PullRequestArtifact }>(`/runs/${id}`),
  review: async (runId: string, decision: "approve" | "request_changes", comment: string) => {
    const result = await req<{mission: MissionWithProject; achievements: AchievementWithDef[]}>(`/runs/${runId}/review`, {method:"POST", body:JSON.stringify({decision,comment})});
    if(decision === "approve") {
      const released = await req<{mission: MissionWithProject}>(`/missions/${result.mission.id}/release`, {method:"POST",body:"{}"});
      return {...result,mission:released.mission};
    }
    await req(`/missions/${result.mission.id}/execute`, {method:"POST",body:"{}"});
    return result;
  },
  contributor: (id: string) => req<ContributorProfile>(`/contributors/${id}`),
  analyze: (source: "fixture" | "github", url?: string) =>
    req<{ analysis: RepoAnalysis }>("/analyze", { method: "POST", body: JSON.stringify({ source, url: source === "fixture" ? "fixture://tempo" : url }) }, 30_000),
  generateCampaign: (analysis: RepoAnalysis, issueId: string, mode?: "openai" | "demo") =>
    req<{ draft: CampaignDraft }>(
      "/campaigns/generate",
      { method: "POST", body: JSON.stringify({ analysis, issueId, mode }) },
      200_000
    ),
  assistIssue: (analysis: RepoAnalysis, issueId: string) =>
    req<{ assistant: IssueAssistantResult }>("/analysis/assist", {
      method: "POST", body: JSON.stringify({ analysis, issueId }),
    }, 200_000),
  critiqueCampaign: (analysis: RepoAnalysis, draft: CampaignDraft) =>
    req<{ critique: CampaignCritiqueResult }>("/campaigns/critique", {
      method: "POST", body: JSON.stringify({ analysis, draft }),
    }, 200_000),
  createMission: (analysis: RepoAnalysis, draft: CampaignDraft) =>
    req<{ mission: MissionWithProject }>("/missions", {
      method: "POST",
      body: JSON.stringify({ analysis, draft }),
    }),
  explainRunEvidence: (runId: string) =>
    req<{ explanation: EvidenceExplanationResult }>(`/runs/${encodeURIComponent(runId)}/explain`, undefined, 200_000),
  shadowReview: (runId: string) =>
    req<{ shadow: ShadowReviewResult }>(`/runs/${encodeURIComponent(runId)}/shadow-review`, undefined, 200_000),
  aiFeedback: (traceId: string, feature: string, helpful: boolean) =>
    req<{ recorded: boolean; actor: string }>("/ai/feedback", { method: "POST", body: JSON.stringify({ traceId, feature, helpful }) }),
  releaseLocal: (id: string) => req<{mission: MissionDetail}>(`/missions/${encodeURIComponent(id)}/release`, {method:"POST", body:"{}"}),
  demoReset: () => req<{ ok: boolean }>("/demo/reset", { method: "POST", body: "{}" }),

  // ── landing / community surfaces ───────────────────────────────────────────

  /**
   * Counters and donor map together, because they are one section with one
   * provenance label: `stats.dataMode` is what makes the map honest, and a
   * caller that fetched the beacons alone would have nothing to render it with.
   */
  impact: () => req<{ stats: ImpactStats; beacons: DonorBeacon[] }>("/impact"),
  /** Empty `activities` means nothing is running — render the idle state, not a spinner. */
  liveActivity: () => req<{ activities: AgentActivity[] }>("/live"),
  /**
   * `timeline` is always exactly three frames — past, present, future — because
   * `TimeMachineFrame.passingTests` is a required number and a project that has
   * never been executed therefore cannot be represented by omission. Such a frame
   * arrives with `passingTests: 0` and a `note` that says the zero means "nothing
   * has been measured", NOT "the suite failed". **Render `frame.note`.** Without
   * it that zero is a false measurement, which is the one thing this payload
   * exists to prevent.
   *
   * `plain.generator` / `impact.generator` say which generator actually ran, and
   * the server falls back to labelled demo copy when a real one fails — so the
   * badge is the only reliable indicator of what the reader is looking at.
   *
   * The long timeout matches generateCampaign — when the server has real
   * credentials this is a model call, not a database read.
   */
  explain: (projectId: string) =>
    req<{ plain: PlainLanguage; impact: ImpactCard; timeline: TimeMachineFrame[] }>(
      `/projects/${encodeURIComponent(projectId)}/explain`,
      undefined,
      200_000
    ),
  wall: (missionId: string) =>
    req<{ messages: WallMessage[] }>(`/missions/${encodeURIComponent(missionId)}/wall`),
  /**
   * Only the body travels. The author, role and timestamp are assigned
   * server-side — there is no authentication, so an identity sent from here
   * would be a claim the server has no way to check. Both calls return the whole
   * refreshed thread so the caller never has to merge state itself.
   */
  postWall: (missionId: string, body: string) =>
    req<{ messages: WallMessage[] }>(`/missions/${encodeURIComponent(missionId)}/wall`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  mvp: () => req<{ nominees: MvpNominee[] }>("/mvp"),
  /**
   * One vote per category, enforced by a database constraint. A second vote in a
   * category the local user has already voted in fails — read `votedByYou`
   * across a category's nominees to know it is locked before offering the action.
   */
  vote: (nomineeId: string) =>
    req<{ nominees: MvpNominee[] }>(`/mvp/${encodeURIComponent(nomineeId)}/vote`, {
      method: "POST",
      body: "{}",
    }),
};

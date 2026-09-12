// ─────────────────────────────────────────────────────────────────────────────
// CommonCommit shared domain model.
// One compute credit ≈ 1K tokens of AI inference budget. Credits are NOT a
// currency or tradable asset — they represent donated inference capacity.
// ─────────────────────────────────────────────────────────────────────────────

export type Locale = "en" | "zh-TW";

/**
 * Localized text. Curated/seeded/scripted content carries both languages;
 * live agent output (Codex / LLM) is a plain string in whatever language the
 * agent produced — the UI labels it as agent output rather than translating.
 */
export type L10n = string | { en: string; "zh-TW": string };

export type MissionStatus =
  | "funding"
  | "funded"
  | "executing"
  | "needs_review"
  | "changes_requested"
  | "approved"
  | "released"
  | "failed"
  | "stalled";

export type RunStatus =
  | "running"
  | "succeeded"
  | "failed"
  | "budget_exhausted"
  | "blocked"
  | "cancelled";

/**
 * Execution modes — surfaced verbatim in the UI, never conflated:
 *  codex — OpenAI Codex agent via @openai/codex-sdk (real).
 *  llm   — real LLM agent loop over an OpenAI-compatible gateway (real).
 *  demo  — scripted intelligence, real test execution (clearly labelled).
 */
export type RunnerMode = "codex" | "llm" | "demo";

/** Who produced a piece of information — powers the trust labelling in the UI. */
export type EventSource =
  | "codex" // real Codex agent output
  | "llm" // real gateway-LLM agent output
  | "demo" // scripted demo-runner output (never claims to be an AI result)
  | "engine" // engine-verified fact: real test runs, real diffs, budget accounting
  | "maintainer"
  | "system";

export type ExecutionEventType =
  | "run_started"
  | "analysis"
  | "plan"
  | "plan_revision"
  | "workspace"
  | "environment"
  | "provision"
  | "file_change"
  | "command"
  | "test_run"
  | "test_result"
  | "diagnosis"
  | "quality_check"
  | "review_summary"
  | "pr_prepared"
  | "approval_gate"
  | "feedback"
  | "budget"
  | "retry"
  | "release"
  | "agent_message"
  | "error"
  | "info"
  | "run_finished";

export interface ExecutionEvent {
  id: string;
  runId: string;
  missionId: string;
  seq: number;
  ts: string; // ISO timestamp
  type: ExecutionEventType;
  source: EventSource;
  title: L10n;
  detail?: L10n;
  /** True when the engine itself observed/produced this fact (test output, diff). */
  verified: boolean;
  computeDelta: number; // credits consumed by this step
  payload?: EventPayload;
}

export interface EventPayload {
  files?: FileChange[];
  command?: string;
  exitCode?: number;
  output?: string; // truncated command/test output
  tests?: TestSummary;
  attempt?: number;
  milestoneId?: string;
  version?: string;
  /** LLM call evidence (never includes the prompt secret parts). */
  llm?: { model: string; requestId?: string; latencyMs: number; inputTokens: number; outputTokens: number };
  langfuseTraceId?: string;
  [key: string]: unknown;
}

export interface FileChange {
  path: string;
  kind: "add" | "modify" | "delete";
  additions?: number;
  deletions?: number;
}

export interface TestSummary {
  pass: number;
  fail: number;
  total: number;
  durationMs: number;
  failures?: { name: string; message: string }[];
}

/** Server-owned planning estimate. The model may describe scope, but cannot set this budget. */
export interface ComputeEstimate {
  method: "server-heuristic-v2";
  estimatedCredits: number;
  range: { low: number; high: number };
  confidence: "low" | "medium" | "high";
  /** Inputs disclose absence as well as presence; unknown is never presented as zero. */
  inputs: {
    repositoryMeasurement: "filesystem" | "host_metadata" | "unknown";
    linesOfCode?: number;
    files?: number;
    testFiles?: number;
    issueCharacters: number;
    acceptanceCriteria: number;
    feasibility: FeasibilityRead["level"];
    plannedAttempts: number;
  };
  breakdown: { key: "base" | "repository" | "issue" | "verification" | "risk"; credits: number; basis: L10n }[];
  calibration: { sampleSize: number; multiplier: number };
  caveats: L10n[];
}

export interface VerificationExperiment {
  phase: "baseline" | "agent_attempt";
  attempt?: number;
  command: string;
  exitCode: number;
  tests: TestSummary;
  source: "engine" | "demo";
}

export interface VerificationDossier {
  experiments: VerificationExperiment[];
  qualityGates: {
    key: "baseline_green" | "full_suite_green" | "test_count_not_shrunk" | "protected_paths_unchanged" | "reviewable_diff";
    passed: boolean;
    detail: L10n;
  }[];
  criteria: { id: string; status: AcceptanceCriterion["status"]; verifiedBy?: string }[];
}

export type RiskLevel = "low" | "medium" | "high";

export interface Milestone {
  id: string;
  title: L10n;
  share: number; // 0..1 slice of the compute budget
  status: "pending" | "active" | "done";
}

export interface AcceptanceCriterion {
  id: string;
  text: L10n;
  status: "pending" | "suite_passed" | "verified" | "failed";
  /** How it was verified: "tests" | "review" | "engine" */
  verifiedBy?: string;
}

export interface Maintainer {
  id: string;
  name: string;
  handle: string;
  avatarColor: string;
  verified: boolean;
  role: L10n;
}

export interface AdoptionPoint {
  week: string; // e.g. "W1"
  downloads: number;
}

export interface AdoptionStats {
  /** Clearly labelled: "live" (real observed) vs "demo" (simulated for the demo). */
  dataMode: "live" | "demo";
  weeklyDownloads: number;
  downloadsDelta: number; // percent change since release
  dependents: number;
  versionAdoption: number; // 0..1 of dependents on the new version
  series: AdoptionPoint[];
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: L10n;
  repoUrl: string;
  /**
   * Popularity and health are OPTIONAL for the same reason as on RepoAnalysis:
   * a project imported from a host we only read metadata from, or a bundled
   * fixture, genuinely has no download count. `undefined` renders as nothing;
   * it must never be coerced to 0, because a displayed 0 is a measurement claim.
   */
  language?: string;
  license?: string;
  stars?: number;
  weeklyDownloads?: number;
  dependents?: number;
  healthScore?: number; // 0..100 maintenance-health heuristic
  /**
   * Whether the popularity figures above were OBSERVED or AUTHORED.
   *
   * The seed writes plausible numbers for fictional packages — 2.1M weekly
   * downloads for `tempo`, 14,302 dependents — and that was acceptable while the
   * only surface rendering them was the marketplace, whose section-level
   * `dataMode: "demo"` label covered the whole shelf.
   *
   * The product card and the impact card broke that arrangement: they render the
   * same figures in isolation, where the section label is gone, and an impact card
   * that says "14,302 packages depend on this" beside a badge reading "Measured"
   * is a fabricated measurement no matter how the surrounding page is labelled.
   *
   * So provenance travels with the row. Every consumer derives its label from this
   * field instead of remembering to add one, because "remember to add a label" is
   * the instruction that eventually gets forgotten.
   */
  figuresMode: "live" | "demo";
  maintainer: Maintainer;
  /** True for projects the demo persona depends on ("Used by your projects"). */
  usedByYou: boolean;
  workspace: WorkspaceSource;
}

export type WorkspaceSource =
  | { kind: "fixture"; path: string } // bundled demo repository — reliably executable
  | { kind: "github"; url: string; commitSha?: string } // imported metadata; execution remains gated
  | { kind: "none" };

export type MissionSection =
  | "almost_funded"
  | "now_building"
  | "under_verification"
  | "recently_shipped"
  | "high_impact"
  | "needs_rescue"
  | "used_by_you";

export interface Mission {
  catalog?: import("../../../shared/catalog.js").CatalogContent;
  id: string;
  projectId: string;
  title: L10n;
  tagline: L10n;
  status: MissionStatus;
  /** Campaign story sections, AI-generated (generator recorded below). */
  story: {
    what: L10n;
    why: L10n;
    whoBenefits: L10n;
    approach: L10n;
  };
  /** Which generator wrote the campaign: "openai" (real LLM) or "demo" (labelled). */
  generator: "openai" | "demo";
  issueRef: { id: string; title: L10n; url?: string };
  computeGoal: number;
  /** Present for campaigns created by the explainable server estimator. */
  computeEstimate?: ComputeEstimate;
  computePledged: number;
  computeReserved: number;
  computeConsumed: number;
  riskLevel: RiskLevel;
  riskFactors: L10n[];
  acceptanceCriteria: AcceptanceCriterion[];
  milestones: Milestone[];
  tags: string[]; // e.g. ["security", "performance"] — mapped to localized labels in UI
  createdAt: string;
  fundedAt?: string;
  releasedAt?: string;
  releaseVersion?: string;
  adoption?: AdoptionStats;
  /** Progress in each dimension, 0..1. Never collapsed into one number. */
  progress: {
    funding: number;
    development: number;
    verification: number;
    adoption: number;
  };
  latestRunId?: string;
  executionMode: RunnerMode | null; // set once execution starts
  backerCount: number;
}

export interface Contributor {
  id: string;
  handle: string;
  name: string;
  avatarColor: string;
  bio: L10n;
  walletBalance: number; // spendable credits
  totalPledged: number;
  reputation: number;
  joinedAt: string;
  isCurrentUser?: boolean;
}

export interface Pledge {
  id: string;
  missionId: string;
  contributorId: string;
  amount: number;
  createdAt: string;
}

export interface ExecutionRun {
  id: string;
  missionId: string;
  mode: RunnerMode;
  status: RunStatus;
  computeBudget: number;
  computeUsed: number;
  attempt: number; // current/last attempt number
  maxAttempts: number;
  startedAt: string;
  endedAt?: string;
  /** Reason for terminal non-success states. */
  outcomeNote?: L10n;
  currentActivity?: L10n;
  /** Non-secret observability correlation. */
  langfuseTraceId?: string;
  model?: string;
}

export interface PullRequestArtifact {
  runId: string;
  missionId: string;
  branch: string;
  title: L10n;
  summary: L10n;
  risks: L10n[];
  files: ArtifactFile[];
  testEvidence: TestSummary;
  /** Explicit provenance; never infer this from which runner produced code. */
  testEvidenceSource?: "engine" | "demo";
  /** Every real test execution and deterministic gate used to admit this artifact. */
  verification?: VerificationDossier;
  commands: { command: string; exitCode: number }[];
  additions: number;
  deletions: number;
  createdAt: string;
  mode: RunnerMode;
  /** Self-critique performed on the real diff before a maintainer sees it. */
  review?: DiffReview;
}

/**
 * A pre-review pass over the diff the engine actually produced.
 *
 * `by` is what makes this honest: `"llm"` means a real model read the real diff;
 * `"static"` means the finding came from counting the diff, not from judgment.
 * The UI must never present the second as the first.
 */
export interface DiffReview {
  verdict: "approve" | "concerns" | "reject";
  by: "llm" | "static";
  model?: string;
  /** One-line rationale for the verdict. */
  notes: L10n;
  /** Criteria the reviewer could not confirm from the diff alone. */
  unverified: L10n[];
}

export interface ArtifactFile {
  path: string;
  kind: "add" | "modify" | "delete";
  additions: number;
  deletions: number;
  patch: string; // unified diff
}

export type LedgerEntryType =
  | "pledge"
  | "reserve"
  | "consume"
  | "refund_unused";

export interface LedgerEntry {
  id: string;
  ts: string;
  missionId: string;
  runId?: string;
  contributorId?: string;
  type: LedgerEntryType;
  amount: number; // credits; positive magnitude, type carries direction
  memo: L10n;
}

export type AchievementCode =
  | "first_spark"
  | "early_backer"
  | "final_push"
  | "ship_it"
  | "project_rescuer"
  | "security_guardian"
  | "hidden_gem"
  | "dependency_defender"
  // Added for the community layer. Every one of these is awarded from a signal the
  // product already records — a tag partition, a diff path, the resolved runner
  // mode, a distinct-project count, a pledge timestamp. A badge that cannot be
  // earned is decoration, and decoration on an achievement shelf is a small lie
  // about what the holder did.
  | "first_bug_hero"
  | "documentation_angel"
  | "ai_architect"
  | "oss_guardian"
  | "night_owl_sponsor";

export interface AchievementDef {
  code: AchievementCode;
  name: L10n;
  description: L10n;
  icon: string; // lucide icon name
  tier: "bronze" | "silver" | "gold";
}

export interface EarnedAchievement {
  id: string;
  contributorId: string;
  code: AchievementCode;
  missionId: string;
  earnedAt: string;
}

export interface ReviewDecision {
  id: string;
  runId: string;
  missionId: string;
  maintainerId: string;
  decision: "approve" | "request_changes";
  comment: string;
  createdAt: string;
}

/** Per-contributor traceability: pledge → milestone → run → PR → release → impact. */
export interface ImpactReceipt {
  missionId: string;
  missionTitle: L10n;
  projectName: string;
  contributorId: string;
  pledged: number;
  consumedShare: number; // credits of theirs actually consumed
  refundedShare: number;
  runId?: string;
  prTitle?: L10n;
  releaseVersion?: string;
  releasedAt?: string;
  adoption?: { dataMode: "live" | "demo"; weeklyDownloads: number; dependents: number };
  achievements: AchievementCode[];
}

// ── AI analysis / campaign generation ────────────────────────────────────────

/**
 * Repository analysis.
 *
 * Every numeric field here is OPTIONAL on purpose. `undefined` means "we did not
 * measure this", and the UI must render nothing rather than a zero — a displayed
 * `0 files` is a measurement claim, and it was a lie on the GitHub path for the
 * whole of v0.1–v0.3. If a value cannot be obtained from the actual repository,
 * it does not appear.
 *
 * Popularity metrics (stars/downloads/dependents) used to be hardcoded literals
 * for the bundled fixture — 412 stars for a local directory that cannot have
 * stargazers — and were then handed to the campaign model under the header
 * "real, observed" and re-emitted as fundraising copy. They are now present only
 * when actually fetched.
 */
export interface RepoAnalysis {
  /** Opaque, short-lived server capability binding this exact observed snapshot. */
  serverToken?: string;
  source: "fixture" | "github";
  name: string;
  description: string;
  /** Derived from the file extensions actually present, not assumed. */
  language?: string;
  /** SPDX id as declared by the repo. undefined = no license found. */
  license?: string;
  files?: number;
  linesOfCode?: number;
  testFiles?: number;
  /** undefined = not checked. Never assume. */
  hasCi?: boolean;
  readmeExcerpt?: string;
  stars?: number;
  weeklyDownloads?: number;
  dependents?: number;
  /** undefined when there was not enough observed signal to score. */
  healthScore?: number;
  /** Each note states what was observed. Nothing here may assert a test result. */
  healthNotes: L10n[];
  issues: AnalyzedIssue[];
  repoUrl: string;
  /** Immutable host-observed revision. Presence does not itself authorize execution. */
  commitSha?: string;
  defaultBranch?: string;
  /**
   * What the analysis actually did, per field group, so the UI can label it and
   * a reader can tell measurement from absence.
   */
  measured: {
    /** True only when real files on disk were counted. */
    filesystem: boolean;
    /** True only when a package registry was queried. */
    popularity: boolean;
    /** True only when the host API was queried. */
    hostMetadata: boolean;
  };
}

export interface AnalyzedIssue {
  id: string;
  title: string;
  body: string;
  labels: string[];
  /**
   * Whether this issue looks automatable. Was a hardcoded constant until v0.3.1
   * ("high" for the fixture, "medium" for literally every GitHub issue) while the
   * UI called it an "AI feasibility read" — a three-colour badge over a literal.
   * It is now a transparent scored heuristic that publishes its own inputs.
   */
  feasibility: FeasibilityRead;
  url?: string;
}

/** One piece of evidence the feasibility heuristic weighed, quoted from the issue. */
export interface FeasibilitySignal {
  /** Stable key, e.g. "expected_vs_actual", "design_question", "label:good first issue". */
  key: string;
  direction: "up" | "down";
  /** Contribution to the score. Published so the reader can disagree with it. */
  weight: number;
  /** The actual text or fact that triggered it. */
  evidence: string;
}

/**
 * A feasibility read.
 *
 * `by: "heuristic"` is the honest label and currently the only value: this is
 * code reading the issue text, not a model. That is deliberate — the house rule
 * is that a signal derivable from facts should be derived, not asked of an LLM,
 * and a transparent heuristic that shows its work is more useful to a maintainer
 * than a confident one-word guess.
 */
export interface FeasibilityRead {
  level: "high" | "medium" | "low";
  /** 0-100. Published alongside the level so the threshold is inspectable. */
  score: number;
  by: "heuristic";
  /**
   * The one genuinely confident call this heuristic makes: 72.6% correct on the
   * not-automatable judgement against a 37.1% base rate — a bigger departure
   * from base than the top band achieves. It covers only ~12% of issues, so it
   * is a strong verdict on a minority, not general discriminative power.
   */
  needsHuman: boolean;
  /** Priced signals. Every weight traceable to a measured effect. */
  signals: FeasibilitySignal[];
  /**
   * True, checkable statements the corpus cannot PRICE — surfaced without a
   * number rather than dropped or guessed at. Deliberately separate from
   * `signals`: mixing priced and unpriced would repeat the original defect of
   * presenting an unearned number.
   */
  observations: { key: string; note: string }[];
  /**
   * Shipped with every read so the UI can never show a score without its
   * referent. A bare "81" is meaningless; "81% vs a 63% base rate" is a claim.
   */
  calibration: {
    /** Share of issues in this band that were resolved by a small PR. */
    bandPrecision: number;
    /** Same figure across the whole corpus — the number to beat. */
    baseRate: number;
    corpusSize: number;
  };
}

/**
 * Campaign generation contract: the generator (real LLM or labelled demo)
 * must produce BOTH locales for narrative fields in a single structured
 * result, so no structured Mission data is lost in translation.
 */
export interface CampaignDraft {
  generator: "openai" | "demo";
  /** Opaque server capability binding provenance, analysis snapshot, and issue. */
  serverToken?: string;
  /** Server-bound issue selected when this draft was generated. */
  sourceIssueId?: string;
  title: L10n;
  tagline: L10n;
  story: Mission["story"];
  acceptanceCriteria: L10n[];
  milestones: { title: L10n; share: number }[];
  riskLevel: RiskLevel;
  riskFactors: L10n[];
  computeGoal: number;
  /** Server-owned; generated model numbers are overwritten before issuing the draft. */
  computeEstimate?: ComputeEstimate;
  computeRationale: L10n;
  tags: string[];
  /** Non-secret generation evidence when produced by a real LLM. */
  evidence?: { model: string; requestId?: string; latencyMs: number; inputTokens: number; outputTokens: number };
}

/** Common provenance attached to every optional model-assistance layer. */
export interface AiEvidence {
  generator: "openai" | "fallback";
  feature: "issue-triage" | "criteria" | "campaign-critic" | "evidence-explanation" | "shadow-review";
  model?: string;
  promptKey: string;
  promptVersion: number;
  traceId?: string;
  variant: "control" | "candidate" | "shadow";
  fallbackReason?: "not_configured" | "rollout_control" | "timeout" | "gateway" | "invalid_json" | "schema";
  latencyMs?: number;
}

export interface IssueAssistantResult {
  triage: {
    type: "bug" | "feature" | "docs" | "maintenance" | "question" | "unknown";
    summary: L10n;
    ambiguity: "low" | "medium" | "high";
    affectedSurface: L10n[];
    missingContext: L10n[];
    maintainerQuestions: L10n[];
  };
  criteria: { text: L10n; needsMaintainerDecision: boolean }[];
  evidence: AiEvidence;
}

export interface CampaignCritiqueResult {
  grounding: "pass" | "needs_revision";
  actionability: "pass" | "needs_revision";
  bilingualParity: "pass" | "needs_revision";
  findings: L10n[];
  suggestedCriteria: L10n[];
  evidence: AiEvidence;
}

export interface EvidenceExplanationResult {
  summary: L10n;
  verifiedFacts: L10n[];
  openQuestions: L10n[];
  evidence: AiEvidence;
}

export interface ShadowReviewResult {
  verdict: "approve" | "concerns" | "reject" | "unavailable";
  notes: L10n;
  risks: L10n[];
  unverified: L10n[];
  /** Always false in Phase 1/2. This result cannot change engine or review state. */
  affectedGate: false;
  evidence: AiEvidence;
}

// ── API composites ───────────────────────────────────────────────────────────

export interface MissionWithProject extends Mission {
  project: Project;
}

export interface MissionDetail extends MissionWithProject {
  pledges: (Pledge & { contributor: Pick<Contributor, "id" | "handle" | "name" | "avatarColor"> })[];
  runs: ExecutionRun[];
  ledger: LedgerEntry[];
  artifact?: PullRequestArtifact;
  reviews: ReviewDecision[];
}

export interface MarketplaceData {
  /** This prototype's aggregate state is seeded/local, not an authenticated live marketplace. */
  dataMode: "demo";
  sections: { key: MissionSection; missions: MissionWithProject[] }[];
  stats: {
    totalPledged: number;
    missionsShipped: number;
    activeExecutions: number;
    contributors: number;
  };
}

export interface ContributorProfile extends Contributor {
  /** Persona, achievements, receipts and aggregates originate in the local demo store. */
  dataMode: "demo";
  pledges: (Pledge & { missionTitle: L10n; projectName: string; missionStatus: MissionStatus })[];
  achievements: (EarnedAchievement & { def: AchievementDef })[];
  receipts: ImpactReceipt[];
  stats: {
    missionsSupported: number;
    shipped: number;
    creditsConsumed: number;
    creditsRefunded: number;
    downstreamDownloads: number;
  };
}

export interface BootstrapData {
  currentUser: Contributor;
  personas: { contributor: Contributor; maintainers: Maintainer[] };
  /** Resolved execution mode for new runs + non-secret credential evidence. */
  execution: {
    configured: "auto" | "codex" | "llm" | "demo";
    /**
     * `null` when the configured mode is REFUSED — a real agent asked for where no
     * per-run OS boundary was measured. Not "demo": the server will not quietly
     * run a simulation in place of the agent that was requested, so there is no
     * mode to report, and `error` carries why.
     */
    resolved: RunnerMode | null;
    /** Present only when `resolved` is null. Operator-facing, no secrets. */
    error?: string;
    model?: string;
    gatewayHost?: string; // host only, never the key
    llmValidated: boolean;
    langfuseEnabled: boolean;
    /**
     * Whether runs get a real per-run OS boundary, as MEASURED at startup rather
     * than configured (see server/engine/isolation.ts and validation experiment
     * SEC-00). Surfaced because a user cannot otherwise tell whether the code
     * that ran had a kernel boundary around it, and "the deployment probably has
     * one" is exactly the assumption this field exists to remove.
     */
    isolation: {
      kind: "container" | "process";
      osIsolated: boolean;
      detail: string;
    };
  };
}

// ── SSE wire format ──────────────────────────────────────────────────────────

export type StreamMessage =
  | { kind: "exec_event"; event: ExecutionEvent }
  | { kind: "mission_update"; mission: MissionWithProject }
  | { kind: "run_update"; run: ExecutionRun }
  | { kind: "achievement"; achievement: EarnedAchievement & { def: AchievementDef }; contributorId: string }
  | { kind: "heartbeat" };

// ── landing / community surfaces ─────────────────────────────────────────────

/**
 * Aggregate impact shown on the first screen.
 *
 * Every field is COMPUTED from the local database — pledges, released missions,
 * artifact diffs — never a decorative constant. `dataMode` is part of the payload
 * rather than a UI-side assumption so the number and its provenance cannot be
 * separated: a screenshot of this section always carries the label with it.
 *
 * `windowLabel` says which window the counts cover ("today", "all time"). A big
 * number with no window is the easiest kind of dishonesty to ship by accident.
 */
export interface ImpactStats {
  dataMode: "demo";
  windowLabel: "today" | "all_time";
  tokensDonated: number;
  featuresBuilt: number;
  bugsFixed: number;
  projectsRevived: number;
  /** Per-day totals, oldest first, for the sparkline under the counters. */
  trend: number[];
}

/**
 * A donor beacon on the world map.
 *
 * `city`/`lat`/`lng` come from the seeded contributor profiles. Real donor
 * geolocation is NOT collected and must not be inferred from an IP address, so
 * this is demo data by construction — `ImpactStats.dataMode` labels the whole
 * section and the map repeats it, because a glowing map reads as live telemetry.
 */
export interface DonorBeacon {
  city: string;
  country: string;
  lat: number;
  lng: number;
  contributorId: string;
  handle: string;
  tokens: number;
}

/** One step of the live agent activity strip. */
export interface AgentActivity {
  runId: string;
  missionId: string;
  projectName: string;
  /** The engine's own event type, so the strip cannot invent a phase. */
  phase: "reading" | "searching" | "writing" | "testing" | "reviewing" | "waiting";
  label: L10n;
  at: string;
  source: EventSource;
  /** The exact engine event behind `phase`; the UI must not replace it with generic copy. */
  eventType: ExecutionEventType;
  detail?: L10n;
  verified: boolean;
  /** Bounded recent evidence from this same run, newest facts last. */
  evidence: AgentEvidence[];
}

/** A compact, provenance-preserving event for the landing-page live feed. */
export interface AgentEvidence {
  type: ExecutionEventType;
  label: L10n;
  detail?: L10n;
  at: string;
  source: EventSource;
  verified: boolean;
  files?: FileChange[];
  tests?: TestSummary;
  command?: string;
}

/**
 * Plain-language explanation of a repository, for readers who do not read
 * READMEs.
 *
 * `generator` distinguishes a model-written explanation from the bundled demo
 * copy, exactly as campaign generation already does. A plain-language summary is
 * a CLAIM about what software does, so its provenance has to travel with it.
 */
export interface PlainLanguage {
  generator: "openai" | "demo";
  emoji: string;
  /** One sentence a non-engineer understands. */
  oneLiner: L10n;
  /** Concrete places this is useful. */
  useCases: L10n[];
  /** What the GitHub description says, kept for comparison. */
  technicalSummary: string;
}

/**
 * "If this project disappeared, what would the world lose?"
 *
 * `evidence` is the honest part. Each consequence carries whether it is grounded
 * in an observed measurement or is an editorial judgement, because the whole
 * card is persuasive by design and an ungrounded number in it would be the most
 * damaging thing on the page.
 */
export interface ImpactCard {
  generator: "openai" | "demo";
  /**
   * Provenance of the SCALE figures below, copied from `Project.figuresMode`.
   *
   * Separate from `generator`, which describes who wrote the prose. A model can
   * write an honest sentence about an invented number, and a bundled demo string
   * can quote a real one — the two questions are independent and the card has to
   * answer both.
   */
  dataMode: "live" | "demo";
  headline: L10n;
  /** Observed scale, when there is one. Absent rather than zero when unknown. */
  dependents?: number;
  weeklyDownloads?: number;
  consequences: { text: L10n; basis: "measured" | "editorial" }[];
}

/**
 * Time Machine snapshots: what the project looked like, looks like, and is
 * PROJECTED to look like.
 *
 * `kind` is not cosmetic. "future" is a projection from the current mission
 * backlog and must never render with the same authority as an observed past
 * state; the UI reads this field to decide that.
 */
export interface TimeMachineFrame {
  kind: "past" | "present" | "future";
  label: L10n;
  at: string;
  /**
   * Optional because "never measured" has to be expressible.
   *
   * These were required, which forced a project that has never been executed to
   * ship `passingTests: 0` — and a UI rendering "0 passing tests" under a label
   * that says "passing tests" states a measurement that was never taken. The same
   * mistake as a download count of 0 for a package nobody has ever published.
   *
   * Absent means not measured. Zero means measured as zero, which for a test
   * suite is a real and different fact.
   */
  openIssues?: number;
  passingTests?: number;
  /** Absent for a projection, because there is nothing measured to show. */
  releasedVersion?: string;
  note: L10n;
}

/** A message on a project's comment wall. */
export interface WallMessage {
  id: string;
  missionId: string;
  /** Local demo actors only — there is no authentication (see SECURITY.md). */
  authorRole: "sponsor" | "maintainer";
  authorHandle: string;
  authorColor: string;
  body: string;
  createdAt: string;
}

/** Monthly community awards. Categories, not a sponsor leaderboard. */
export type MvpCategory = "most_helpful_project" | "most_efficient_agent" | "community_choice";

export interface MvpNominee {
  id: string;
  category: MvpCategory;
  title: L10n;
  subtitle: L10n;
  votes: number;
  /** Whether the local demo user has already voted in this category. */
  votedByYou: boolean;
  /** The measurement behind the nomination, when there is one. */
  basis?: L10n;
}

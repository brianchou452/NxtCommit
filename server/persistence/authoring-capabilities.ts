import { randomBytes } from 'node:crypto';

export class CapabilityError extends Error {
  readonly code = 'capability_expired';
  constructor() { super('Analysis or draft capability is unavailable. Analyze the repository again.'); }
}

interface Entry<T> { snapshot: T; expiresAt: number }
interface CampaignEntry<D> { analysisToken: string; draft: D; missionId?: string }

/** Process-local provenance capabilities, never an authentication mechanism. */
export class AuthoringCapabilities<A, D> {
  private readonly analyses = new Map<string, Entry<A>>();
  private readonly campaigns = new Map<string, Entry<CampaignEntry<D>>>();

  constructor(
    private readonly capacity = 256,
    private readonly ttlMs = 30 * 60 * 1000,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isSafeInteger(capacity) || capacity < 1 || !Number.isFinite(ttlMs) || ttlMs <= 0 || ttlMs > 30 * 60 * 1000) {
      throw new Error('Invalid capability limits');
    }
  }

  private issue<T>(store: Map<string, Entry<T>>, snapshot: T, expiresAt = this.now() + this.ttlMs): string {
    for (const [token, entry] of store) if (entry.expiresAt <= this.now()) store.delete(token);
    while (store.size >= this.capacity) store.delete(store.keys().next().value!);
    const token = randomBytes(32).toString('hex');
    store.set(token, { snapshot: structuredClone(snapshot), expiresAt });
    return token;
  }

  private entry<T>(store: Map<string, Entry<T>>, token: unknown): Entry<T> {
    if (typeof token !== 'string') throw new CapabilityError();
    const entry = store.get(token);
    if (!entry || entry.expiresAt <= this.now()) {
      store.delete(token);
      throw new CapabilityError();
    }
    return entry;
  }

  issueAnalysis(analysis: A): string { return this.issue(this.analyses, analysis); }
  analysis(token: unknown): A { return structuredClone(this.entry(this.analyses, token).snapshot); }

  issueCampaign(analysisToken: string, draft: D): string {
    const analysis = this.entry(this.analyses, analysisToken);
    return this.issue(this.campaigns, { analysisToken, draft }, analysis.expiresAt);
  }

  campaign(analysisToken: unknown, campaignToken: unknown): CampaignEntry<D> {
    this.entry(this.analyses, analysisToken);
    const campaign = this.entry(this.campaigns, campaignToken).snapshot;
    if (campaign.analysisToken !== analysisToken) throw new CapabilityError();
    return structuredClone(campaign);
  }

  /** Called synchronously within the mission writer's transaction. */
  bindMission(analysisToken: unknown, campaignToken: unknown, create: (draft: D) => string): string {
    const snapshot = this.campaign(analysisToken, campaignToken);
    if (snapshot.missionId) return snapshot.missionId;
    const missionId = create(snapshot.draft);
    if (!missionId) throw new Error('Mission writer returned no identity');
    this.entry(this.campaigns, campaignToken).snapshot.missionId = missionId;
    return missionId;
  }

  clear(): void { this.analyses.clear(); this.campaigns.clear(); }
}

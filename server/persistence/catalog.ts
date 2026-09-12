import raw from "./commoncommit-catalog.json" with { type: "json" };
import type { PersistenceAdapter } from "./database.js";
import { MissionStore } from "./mission-store.js";
import type {
  MissionRecord,
  PledgeRecord,
  LedgerRecord,
} from "../../shared/mission.js";
import type { Contributor } from "../../shared/types.js";
import type { LocalizedText } from "../../shared/primitives.js";
import type { CatalogContent } from "../../shared/catalog.js";

interface SourceMission {
  id: string;
  projectId: string;
  title: LocalizedText;
  tagline: LocalizedText;
  story: MissionRecord["story"];
  status: MissionRecord["status"];
  tags: string[];
  computeGoal: number;
  computePledged: number;
  computeConsumed: number;
  backerCount: number;
  createdAt: string;
  acceptanceCriteria: { id: string; text: LocalizedText; status: string }[];
  milestones: MissionRecord["milestones"];
  issueRef: CatalogContent["issue"];
  riskLevel: string;
  riskFactors: LocalizedText[];
  releaseVersion?: string;
  releasedAt?: string;
  adoption?: CatalogContent["adoption"];
}
interface SourceProject {
  id: string;
  slug: string;
  name: string;
  repoUrl: string;
  description: LocalizedText;
  maintainer: MissionRecord["project"]["maintainer"];
  stars?: number;
  weeklyDownloads?: number;
  dependents?: number;
  language?: string;
  license?: string;
  usedByYou?: boolean;
}
const data = raw as unknown as {
  revision: string;
  capturedAt: string;
  projects: SourceProject[];
  missions: SourceMission[];
  contributors: Contributor[];
  pledges: PledgeRecord[];
  ledger: (Omit<LedgerRecord, "createdAt"> & { ts: string })[];
  runs: { id: string; missionId: string; status: string }[];
  events: { runId: string; title: LocalizedText; detail?: LocalizedText }[];
  artifacts: ({ missionId: string } & NonNullable<
    CatalogContent["artifact"]
  >)[];
  wall: {
    id: string;
    missionId: string;
    authorHandle: string;
    body: string;
    createdAt: string;
  }[];
};
export const catalogMissionIds = data.projects.map((p) => `catalog-${p.slug}`);
const contributorId = (id: string) => `catalog-${id}`;
const marker = "commoncommit-catalog-v1";
/** Additive and idempotent: existing personas, wallets, pledges and routes survive. */
export function installCatalog(adapter: PersistenceAdapter): void {
  const store = new MissionStore(adapter);
  if (store.get("catalog-import", marker)) return;
  adapter.transaction((db) => {
    for (const contributor of data.contributors) {
      const persona = {
        ...contributor,
        id: contributorId(contributor.id),
        isCurrentUser: false,
      };
      db.prepare(
        "INSERT INTO home_contributors(id,snapshot,location) VALUES (?,?,NULL) ON CONFLICT(id) DO NOTHING",
      ).run(persona.id, JSON.stringify(persona));
    }
    const pool = {
      ...data.contributors[0]!,
      id: "catalog-pool",
      name: "Demo community pool",
      handle: "demo-community",
      isCurrentUser: false,
      walletBalance: 0,
      reputation: 0,
    };
    db.prepare(
      "INSERT INTO home_contributors(id,snapshot,location) VALUES (?,?,NULL) ON CONFLICT(id) DO NOTHING",
    ).run(pool.id, JSON.stringify(pool));
    for (const original of data.missions) {
      const project = data.projects.find((p) => p.id === original.projectId)!;
      if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(project.repoUrl))
        throw Error("Catalog repository must be a public GitHub project URL");
      const id = `catalog-${project.slug}`,
        projectId = `catalog-project-${project.slug}`;
      if (store.get("mission", id))
        throw Error("Catalog identity already belongs to another mission");
      const sourcePledges = data.pledges.filter(
        (p) => p.missionId === original.id,
      );
      const rowTotal = sourcePledges.reduce((sum, p) => sum + p.amount, 0);
      // Preserve the source's authored pool when it has no per-person rows. When
      // rows exist, their ledger sum is authoritative (node-csv has a stale total).
      const seedPledged = Math.max(rowTotal, original.computePledged);
      const catalog: CatalogContent = {
        source: "commoncommit",
        revision: data.revision,
        originalStatus: original.status,
        seededBackerCount: Math.max(
          original.backerCount,
          new Set(sourcePledges.map((p) => p.contributorId)).size,
        ),
        seedPledged,
        issue: original.issueRef,
        riskLevel: original.riskLevel,
        riskFactors: original.riskFactors,
        ...(original.releaseVersion
          ? { releaseVersion: original.releaseVersion }
          : {}),
        ...(original.releasedAt ? { releasedAt: original.releasedAt } : {}),
        ...(original.adoption ? { adoption: original.adoption } : {}),
        history: data.runs
          .filter((r) => r.missionId === original.id)
          .map((run) => ({
            status: run.status,
            events: data.events
              .filter((e) => e.runId === run.id)
              .map(({ title, detail }) => ({
                title,
                ...(detail ? { detail } : {}),
              })),
          })),
        ...(data.artifacts.find((a) => a.missionId === original.id)
          ? {
              artifact: data.artifacts.find(
                (a) => a.missionId === original.id,
              )!,
            }
          : {}),
      };
      const mission: MissionRecord = {
        id,
        projectId,
        title: original.title,
        tagline: original.tagline,
        story: original.story,
        status: original.status,
        generator: "demo",
        dataMode: "demo",
        tags: original.tags,
        computeGoal: original.computeGoal,
        computePledged: seedPledged,
        computeConsumed: original.computeConsumed,
        computeReserved: 0,
        catalog,
        acceptanceCriteria: original.acceptanceCriteria.map((c) => ({
          id: c.id,
          text: c.text,
          status: c.status === "pending" ? "pending" : "unknown",
        })),
        milestones: original.milestones,
        project: {
          ...project,
          id: projectId,
          figuresMode: "demo",
          maintainer: { ...project.maintainer, verified: false },
          workspace: { kind: "none" },
        },
      };
      store.put("mission", id, projectId, mission);
      for (const pledge of sourcePledges)
        store.put("pledge", `catalog-${pledge.id}`, id, {
          ...pledge,
          id: `catalog-${pledge.id}`,
          missionId: id,
          contributorId: contributorId(pledge.contributorId),
        });
      if (seedPledged > rowTotal) {
        const pledge = {
          id: `${id}-pool`,
          missionId: id,
          contributorId: pool.id,
          amount: seedPledged - rowTotal,
          createdAt: original.createdAt,
        };
        store.put("pledge", pledge.id, id, pledge);
        store.put("ledger", `${id}-pool-ledger`, id, {
          ...pledge,
          id: `${id}-pool-ledger`,
          type: "pledge",
        });
      }
      for (const entry of data.ledger.filter(
        (l) => l.missionId === original.id,
      )) {
        const { ts, ...rest } = entry;
        store.put("ledger", `catalog-${entry.id}`, id, {
          ...rest,
          id: `catalog-${entry.id}`,
          missionId: id,
          createdAt: ts,
          ...(entry.contributorId
            ? { contributorId: contributorId(entry.contributorId) }
            : {}),
        });
      }
      const recordedConsumption = data.ledger
        .filter(
          (entry) =>
            entry.missionId === original.id && entry.type === "consume",
        )
        .reduce((sum, entry) => sum + entry.amount, 0);
      if (original.computeConsumed > recordedConsumption)
        store.put("ledger", `${id}-authored-consumption`, id, {
          id: `${id}-authored-consumption`,
          missionId: id,
          type: "consume",
          amount: original.computeConsumed - recordedConsumption,
          createdAt: data.capturedAt,
        });
      // Establish Home FKs before source wall rows. Live projection refresh owns updates.
      db.prepare("INSERT INTO home_projects(id,snapshot) VALUES (?,?)").run(
        projectId,
        JSON.stringify(mission.project),
      );
      db.prepare(
        "INSERT INTO home_missions(id,project_id,snapshot) VALUES (?,?,?)",
      ).run(
        id,
        projectId,
        JSON.stringify({
          ...mission,
          backerCount: catalog.seededBackerCount,
          progress: {
            funding: seedPledged / mission.computeGoal,
            development: 0,
            verification: 0,
            adoption: 0,
          },
        }),
      );
      for (const note of data.wall.filter((w) => w.missionId === original.id)) {
        const author = data.contributors.find(
          (c) => c.handle === note.authorHandle,
        );
        const authorId = author
          ? contributorId(author.id)
          : `catalog-maintainer-${project.slug}`;
        if (!author)
          db.prepare(
            "INSERT INTO home_contributors(id,snapshot,location) VALUES (?,?,NULL) ON CONFLICT(id) DO NOTHING",
          ).run(
            authorId,
            JSON.stringify({
              ...pool,
              id: authorId,
              name: project.maintainer.name,
              handle: note.authorHandle,
            }),
          );
        db.prepare(
          "INSERT INTO home_wall(id,mission_id,author_id,body,created_at) VALUES (?,?,?,?,?)",
        ).run(`catalog-${note.id}`, id, authorId, note.body, note.createdAt);
      }
    }
    store.put("catalog-import", marker, marker, {
      revision: data.revision,
      missions: catalogMissionIds.length,
    });
  });
}

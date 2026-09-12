import type { DatabaseSync } from "node:sqlite";
import type { Migration, PersistenceAdapter } from "./database.js";
import type {
  Campaign,
  ImpactSnapshot,
  MarketplaceSnapshot,
  ContributorProfile,
  Beacon,
  ProfilePledge,
  Nominee,
  WallMessage,
  ShelfKey,
} from "../../shared/home.js";
import type { Contributor, LocalizedText } from "../../shared/types.js";
import { readCurrentPersona } from "./seed.js";
import { randomUUID } from "node:crypto";
const copy = (en: string, zh: string): LocalizedText => ({ en, "zh-TW": zh });
export const homeMigration: Migration = {
  id: 2,
  name: "home-community-read-model",
  up(db) {
    db.exec(`
CREATE TABLE home_projects(id TEXT PRIMARY KEY, snapshot TEXT NOT NULL CHECK(json_valid(snapshot)));
CREATE TABLE home_missions(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES home_projects(id), snapshot TEXT NOT NULL CHECK(json_valid(snapshot)));
CREATE TABLE home_contributors(id TEXT PRIMARY KEY, snapshot TEXT NOT NULL CHECK(json_valid(snapshot)), location TEXT CHECK(json_valid(location)));
CREATE TABLE home_pledges(id TEXT PRIMARY KEY, mission_id TEXT NOT NULL REFERENCES home_missions(id), contributor_id TEXT NOT NULL REFERENCES home_contributors(id), amount INTEGER NOT NULL CHECK(amount>0), created_at TEXT NOT NULL);
CREATE TABLE home_achievements(id TEXT PRIMARY KEY, contributor_id TEXT NOT NULL REFERENCES home_contributors(id), code TEXT NOT NULL, earned_at TEXT NOT NULL);
CREATE TABLE home_wall(sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, mission_id TEXT NOT NULL REFERENCES home_missions(id), author_id TEXT NOT NULL REFERENCES home_contributors(id), body TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE home_votes(category TEXT NOT NULL, contributor_id TEXT NOT NULL REFERENCES home_contributors(id), nominee_id TEXT NOT NULL REFERENCES home_contributors(id), PRIMARY KEY(category, contributor_id));
`);
  },
};
const projects = [
  [
    "Mermaid",
    "Keep diagrams understandable after the system changes again.",
    "讓系統變動後的圖表仍清楚易懂。",
  ],
  [
    "PDF.js",
    "Make scanned PDFs readable without losing the page you were on.",
    "讓掃描 PDF 容易閱讀，保留目前頁面。",
  ],
  [
    "scrcpy",
    "Control your phone from your computer without adding another account.",
    "從電腦控制手機，不用新增帳號。",
  ],
  [
    "Tesseract.js",
    "Turn words trapped in an image back into text you can use.",
    "將圖片中的文字轉成可使用的文字。",
  ],
  [
    "LocalSend",
    "Send a file across the room without sending it through the cloud.",
    "在房間內傳送檔案，不必經過雲端。",
  ],
  [
    "Immich",
    "Find the photo you remember without giving your library to another cloud.",
    "尋找記憶中的照片，不必交出相簿。",
  ],
  [
    "WhisperX",
    "Make subtitles break where people naturally pause.",
    "讓字幕在自然停頓的位置換行。",
  ],
  [
    "Jellyfin",
    "Stream your own media without turning your living room into a loading screen.",
    "順暢播放自己的影音內容。",
  ],
  [
    "Excalidraw",
    "Keep a shared sketch editable after the meeting ends.",
    "讓共享草圖在會議後仍可編輯。",
  ],
  [
    "Home Assistant",
    "Let your home keep working when the internet does not.",
    "網路中斷時，讓家中設備繼續運作。",
  ],
  [
    "Ollama",
    "Keep a local AI model useful when memory is tight.",
    "記憶體不足時，讓本機 AI 模型仍可使用。",
  ],
  [
    "Bun",
    "Make fast JavaScript tooling reliable on the projects people already have.",
    "讓快速 JavaScript 工具可靠支援既有專案。",
  ],
  [
    "Supabase",
    "Keep realtime app data in sync without hiding the database underneath.",
    "同步即時應用資料，保留資料庫透明度。",
  ],
  [
    "Deno",
    "Make one JavaScript project behave the same on a laptop and at the edge.",
    "讓 JavaScript 專案在筆電與邊緣環境行為一致。",
  ],
  [
    "LangGraph",
    "Let an AI workflow resume from the step where it actually failed.",
    "讓 AI 工作流程從實際失敗的步驟恢復。",
  ],
  ["marked", "Table alignment in nested blockquotes", "巢狀引用中的表格對齊"],
];
const locations: [string, string, number, number][] = [
  ["Berlin", "Germany", 52.52, 13.4],
  ["Paris", "France", 48.86, 2.35],
  ["São Paulo", "Brazil", -23.55, -46.63],
  ["Taipei", "Taiwan", 25.03, 121.56],
  ["Tokyo", "Japan", 35.68, 139.69],
  ["Toronto", "Canada", 43.65, -79.38],
  ["Nairobi", "Kenya", -1.29, 36.82],
  ["Buenos Aires", "Argentina", -34.6, -58.38],
  ["London", "United Kingdom", 51.51, -0.13],
  ["Seoul", "South Korea", 37.57, 126.98],
  ["Dubai", "United Arab Emirates", 25.2, 55.27],
  ["Sydney", "Australia", -33.87, 151.21],
  ["Bengaluru", "India", 12.97, 77.59],
  ["Mexico City", "Mexico", 19.43, -99.13],
  ["San Francisco", "United States", 37.77, -122.42],
  ["Singapore", "Singapore", 1.35, 103.82],
  ["Amsterdam", "Netherlands", 52.37, 4.9],
  ["Lagos", "Nigeria", 6.52, 3.38],
  ["Stockholm", "Sweden", 59.33, 18.07],
  ["Cape Town", "South Africa", -33.92, 18.42],
];
export function clearHome(db: DatabaseSync) {
  db.exec(
    "DELETE FROM home_votes; DELETE FROM home_achievements; DELETE FROM home_wall; DELETE FROM home_pledges; DELETE FROM home_missions; DELETE FROM home_projects; DELETE FROM home_contributors;",
  );
}
export function seedHome(db: DatabaseSync) {
  const current = readCurrentPersona(db);
  locations.forEach(([city, country, lat, lng], i) => {
    const id = i === 3 ? current.id : `backer-${i}`;
    const persona: Contributor =
      i === 3
        ? current
        : {
            ...current,
            id,
            name: `${city} Backer`,
            handle: `backer-${i}`,
            isCurrentUser: false,
          };
    db.prepare("INSERT INTO home_contributors VALUES (?,?,?)").run(
      id,
      JSON.stringify(persona),
      JSON.stringify({ city, country, lat, lng }),
    );
  });
  projects.forEach(([name, en, zh], i) => {
    const id = name!.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const title = copy(en!, zh!);
    const project: Campaign["project"] = {
      id,
      slug: id,
      name: name!,
      description: title,
      figuresMode: "demo",
      usedByYou: i % 3 === 0,
    };
    const status: Campaign["status"] =
      i === 15
        ? "released"
        : i === 12
          ? "executing"
          : i === 13
            ? "needs_review"
            : i === 14
              ? "stalled"
              : "funding";
    const campaign: Campaign = {
      id,
      projectId: id,
      title,
      tagline: title,
      status,
      story: {
        what: title,
        why: title,
        whoBenefits: copy(
          "People using this open-source project.",
          "使用此開源專案的人。",
        ),
        approach: copy(
          "A bounded change with regression tests.",
          "透過回歸測試驗證範圍明確的變更。",
        ),
      },
      generator: "demo",
      computeGoal: 5000 + i * 100,
      computePledged: 0,
      backerCount: 0,
      tags: [
        i < 5 ? "everyday" : i < 10 ? "public-interest" : "builder-trend",
        i === 15 ? "bug" : "feature",
      ],
      progress: {
        funding: 0,
        development: status === "released" ? 1 : 0,
        verification: status === "released" ? 1 : 0,
        adoption: 0,
      },
      project,
    };
    db.prepare("INSERT INTO home_projects VALUES (?,?)").run(
      id,
      JSON.stringify(project),
    );
    db.prepare("INSERT INTO home_missions VALUES (?,?,?)").run(
      id,
      id,
      JSON.stringify(campaign),
    );
  });
  locations.forEach((_location, i) => {
    const contributor = i === 3 ? current.id : `backer-${i}`;
    const mission = projects[i % 16]![0]!.toLowerCase().replace(
      /[^a-z0-9]+/g,
      "-",
    );
    db.prepare("INSERT INTO home_pledges VALUES (?,?,?,?,?)").run(
      `pledge-${i}`,
      mission,
      contributor,
      200 + i * 35,
      `2026-09-${String(1 + (i % 12)).padStart(2, "0")}T12:00:00.000Z`,
    );
  });
  db.prepare("INSERT INTO home_pledges VALUES (?,?,?,?,?)").run(
    "current-release",
    "marked",
    current.id,
    500,
    "2026-09-11T12:00:00.000Z",
  );
  // Seed funding totals are derived from the very same pledge graph as beacons/profiles.
  for (const row of db.prepare("SELECT id,snapshot FROM home_missions").all()) {
    const campaign = JSON.parse(String(row.snapshot)) as Campaign;
    const sum = db
      .prepare(
        "SELECT SUM(amount) AS amount, COUNT(DISTINCT contributor_id) AS backers FROM home_pledges WHERE mission_id=?",
      )
      .get(String(row.id))!;
    campaign.computePledged = Number(sum.amount ?? 0);
    campaign.backerCount = Number(sum.backers);
    campaign.progress.funding = Math.min(
      1,
      campaign.computePledged / campaign.computeGoal,
    );
    if (campaign.status === "released") {
      campaign.computeGoal = campaign.computePledged;
      campaign.progress.funding = 1;
    }
    db.prepare("UPDATE home_missions SET snapshot=? WHERE id=?").run(
      JSON.stringify(campaign),
      campaign.id,
    );
  }
  db.prepare(
    `INSERT INTO home_achievements SELECT p.contributor_id || '-ship', p.contributor_id, 'ship', MIN(p.created_at) FROM home_pledges p JOIN home_missions m ON m.id=p.mission_id WHERE json_extract(m.snapshot,'$.status')='released' GROUP BY p.contributor_id`,
  ).run();
}
export class HomeStore {
  constructor(readonly store: PersistenceAdapter) {}
  campaigns(): Campaign[] {
    return this.store.db
      .prepare("SELECT snapshot FROM home_missions ORDER BY rowid")
      .all()
      .map((r) => JSON.parse(String(r.snapshot)) as Campaign);
  }
  mission(id: string) {
    return this.campaigns().find((m) => m.id === id);
  }
  marketplace(): MarketplaceSnapshot {
    return this.store.transaction(() => {
      const missions = this.campaigns();
      const sections: [ShelfKey, (m: Campaign) => boolean][] = [
        ["almost_funded", (m) => m.status === "funding"],
        ["now_building", (m) => m.status === "executing"],
        ["under_verification", (m) => m.status === "needs_review"],
        ["recently_shipped", (m) => m.status === "released"],
        ["needs_rescue", (m) => m.status === "stalled"],
        ["high_impact", (m) => m.tags.includes("public-interest")],
        ["used_by_you", (m) => m.project.usedByYou],
      ];
      return {
        dataMode: "demo",
        stats: {
          dataMode: "demo",
          totalPledged: missions.reduce((n, m) => n + m.computePledged, 0),
          missionsShipped: missions.filter((m) => m.status === "released")
            .length,
          activeExecutions: missions.filter((m) => m.status === "executing")
            .length,
          contributors: Number(
            this.store.db
              .prepare("SELECT COUNT(*) AS n FROM home_contributors")
              .get()!.n,
          ),
        },
        sections: sections
          .map(([key, filter]) => ({ key, missions: missions.filter(filter) }))
          .filter((s) => s.missions.length),
      };
    });
  }
  impact(): ImpactSnapshot {
    return this.store.transaction(() => {
      const missions = this.campaigns(),
        released = missions.filter((m) => m.status === "released");
      const beacons = this.store.db
        .prepare(
          "SELECT c.id,c.snapshot,c.location,SUM(p.amount) AS tokens FROM home_contributors c JOIN home_pledges p ON p.contributor_id=c.id WHERE c.location IS NOT NULL GROUP BY c.id ORDER BY c.rowid",
        )
        .all()
        .map(
          (r) =>
            ({
              ...JSON.parse(String(r.location)),
              contributorId: String(r.id),
              handle: (JSON.parse(String(r.snapshot)) as Contributor).handle,
              tokens: Number(r.tokens),
            }) as Beacon,
        );
      const latest = this.store.db
        .prepare("SELECT MAX(created_at) AS latest FROM home_pledges")
        .get()?.latest;
      const end = latest
        ? new Date(String(latest)).getTime()
        : Date.UTC(2026, 8, 12);
      const trend = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(end - (13 - i) * 86400000)
          .toISOString()
          .slice(0, 10);
        return (
          Number(
            this.store.db
              .prepare(
                "SELECT COALESCE(SUM(amount),0) AS n FROM home_pledges WHERE substr(created_at,1,10)=?",
              )
              .get(date)!.n,
          ) * 1000
        );
      });
      return {
        stats: {
          dataMode: "demo",
          windowLabel: "all_time",
          tokensDonated:
            missions.reduce((n, m) => n + m.computePledged, 0) * 1000,
          featuresBuilt: released.filter(
            (m) => m.tags.includes("feature") && !m.tags.includes("bug"),
          ).length,
          bugsFixed: released.filter((m) => m.tags.includes("bug")).length,
          projectsRevived: new Set(released.map((m) => m.projectId)).size,
          trend,
        },
        beacons,
      };
    });
  }
  profile(id: string): ContributorProfile | undefined {
    return this.store.transaction(() => {
      const row = this.store.db
        .prepare("SELECT snapshot FROM home_contributors WHERE id=?")
        .get(id);
      if (!row) return;
      const persona = JSON.parse(String(row.snapshot)) as Contributor;
      if (id === readCurrentPersona(this.store.db).id)
        Object.assign(persona, readCurrentPersona(this.store.db));
      const pledges = this.store.db
        .prepare(
          "SELECT * FROM home_pledges WHERE contributor_id=? ORDER BY created_at DESC,id",
        )
        .all(id)
        .map((r) => ({
          id: String(r.id),
          missionId: String(r.mission_id),
          amount: Number(r.amount),
          createdAt: String(r.created_at),
          mission: this.mission(String(r.mission_id))!,
          source: "demo" as const,
        }));
      const grouped = new Map<string, number>();
      pledges.forEach((p) =>
        grouped.set(p.missionId, (grouped.get(p.missionId) ?? 0) + p.amount),
      );
      const receipts = [...grouped].map(([missionId, pledged]) => ({
        missionId,
        pledged,
        status: this.mission(missionId)!.status,
        source: "demo" as const,
      }));
      const releases = receipts.filter((r) => r.status === "released");
      return {
        ...persona,
        totalPledged: pledges.reduce((n, p) => n + p.amount, 0),
        dataMode: "demo",
        stats: {
          missionsSupported: grouped.size,
          localReleases: releases.length,
        },
        pledges: pledges as ProfilePledge[],
        receipts,
        achievements: this.store.db
          .prepare(
            "SELECT * FROM home_achievements WHERE contributor_id=? ORDER BY earned_at,id",
          )
          .all(id)
          .map((r) => ({
            id: String(r.id),
            code: String(r.code),
            earnedAt: String(r.earned_at),
            source: "demo" as const,
          })),
        achievementDefs: [
          {
            code: "ship",
            name: copy("Ship It", "完成交付"),
            description: copy(
              "Backed a recorded local demo release.",
              "支持一筆已記錄的本機示範發布。",
            ),
            tier: "demo",
            icon: "package",
          },
        ],
      };
    });
  }
  nominees(): Nominee[] {
    const voter = readCurrentPersona(this.store.db).id;
    return this.store.db
      .prepare(
        "SELECT id,snapshot FROM home_contributors ORDER BY rowid LIMIT 3",
      )
      .all()
      .map((r) => {
        const p = JSON.parse(String(r.snapshot)) as Contributor;
        return {
          id: p.id,
          category: "community",
          title: copy(p.name, p.name),
          subtitle: copy("Local community compute", "本機社群算力"),
          votes: Number(
            this.store.db
              .prepare(
                "SELECT COUNT(*) AS n FROM home_votes WHERE nominee_id=?",
              )
              .get(p.id)!.n,
          ),
          votedByYou: !!this.store.db
            .prepare(
              "SELECT 1 FROM home_votes WHERE category=? AND contributor_id=?",
            )
            .get("community", voter),
          basis: {
            dataMode: "demo",
            totalPledged: this.profile(p.id)!.totalPledged,
          },
        };
      });
  }
  vote(id: string) {
    return this.store.transaction(() => {
      const nominee = this.nominees().find((n) => n.id === id);
      if (!nominee || nominee.votedByYou) throw new Error("invalid_vote");
      this.store.db
        .prepare("INSERT INTO home_votes VALUES (?,?,?)")
        .run(nominee.category, readCurrentPersona(this.store.db).id, id);
      return this.nominees();
    });
  }
  wall(id: string): WallMessage[] {
    return this.store.db
      .prepare(
        "SELECT w.*,c.snapshot FROM home_wall w JOIN home_contributors c ON c.id=w.author_id WHERE mission_id=? ORDER BY sequence",
      )
      .all(id)
      .map((r) => ({
        id: String(r.id),
        missionId: id,
        authorId: String(r.author_id),
        authorRole: "contributor",
        handle: (JSON.parse(String(r.snapshot)) as Contributor).handle,
        body: String(r.body),
        createdAt: String(r.created_at),
        source: "demo",
      }));
  }
  post(id: string, body: unknown) {
    if (
      !this.mission(id) ||
      typeof body !== "string" ||
      !body.trim() ||
      [...body].length > 280
    )
      throw new Error("invalid_comment");
    const redacted = body
      .trim()
      .replace(
        /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g,
        "[REDACTED]",
      )
      .replace(
        /\b(?:sk-[\w-]{8,}|gh[pousr]_[\w]{8,}|github_pat_[\w]{8,}|AKIA[A-Z0-9]{12,})\b/g,
        "[REDACTED]",
      )
      .replace(
        /((?:authorization\s*:\s*bearer|api[_-]?key|token|password|secret)\s*[:=]?\s*)[^\s,;]+/gi,
        "$1[REDACTED]",
      );
    this.store.db
      .prepare(
        "INSERT INTO home_wall(id,mission_id,author_id,body,created_at) VALUES (?,?,?,?,?)",
      )
      .run(
        randomUUID(),
        id,
        readCurrentPersona(this.store.db).id,
        redacted,
        new Date().toISOString(),
      );
    return this.wall(id);
  }
}

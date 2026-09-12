import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startTestServer } from "./test-support/http.js";
import { request } from "./test-support/authoring.js";
import { catalogMissionIds } from "./persistence/catalog.js";
import type { MissionDetail } from "../shared/mission.js";
import type { MarketplaceSnapshot } from "../shared/home.js";

test("full source catalog exposes 25 real repo links and bilingual fundraisers without duplicate legacy cards", async () => {
  const server = await startTestServer();
  try {
    const market = await request<MarketplaceSnapshot>(
      server.url,
      "/api/marketplace",
    );
    const unique = new Map(
      market.sections.flatMap((s) => s.missions).map((m) => [m.id, m]),
    );
    assert.equal([...unique.values()].filter((m) => m.catalog).length, 25);
    assert.equal(
      [...unique.values()].filter((m) => m.project.name === "Mermaid").length,
      1,
    );
    for (const id of catalogMissionIds) {
      const mission = await request<MissionDetail>(
        server.url,
        `/api/missions/${id}`,
      );
      assert.match(mission.project.repoUrl, /^https:\/\/github.com\//);
      assert.equal(mission.project.workspace.kind, "none");
      assert.equal(mission.project.maintainer.verified, false);
      assert.ok(mission.title.en && mission.title["zh-TW"]);
      assert.ok(mission.story.why.en && mission.story.approach["zh-TW"]);
      assert.ok(mission.acceptanceCriteria.length >= 1);
      assert.equal(mission.milestones.length, 3);
      assert.equal(
        mission.computePledged,
        mission.pledges.reduce((sum, p) => sum + p.amount, 0),
      );
      assert.equal(
        mission.computePledged,
        mission.ledger
          .filter((l) => l.type === "pledge")
          .reduce((sum, l) => sum + l.amount, 0),
      );
      assert.equal(mission.latestRun, undefined);
      assert.equal(mission.artifact, undefined);
    }
    const yaml = await request<MissionDetail>(
      server.url,
      "/api/missions/catalog-yaml",
    );
    assert.ok(yaml.catalog?.history[0]?.events.length);
    assert.equal(yaml.latestRunId, undefined);
    assert.equal(
      (
        await request<MissionDetail>(
          server.url,
          "/api/missions/catalog-node-csv",
        )
      ).computePledged,
      2900,
    );
    await request(server.url, "/api/missions/catalog-mermaid/execute", {}, 400);
  } finally {
    await server.stop();
  }
});

test("catalog upgrade, pledge, retry, restart and reset retain one ledger authority and existing records", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nxt-catalog-"));
  const databasePath = join(dir, "app.sqlite");
  let server = await startTestServer({ databasePath, integrateSlices: false });
  try {
    await request(server.url, "/api/missions/mermaid/wall", {
      body: "Keep this existing note",
    });
    await server.stop();
    server = await startTestServer({ databasePath });
    const count = server.context.store.db
      .prepare("SELECT COUNT(*) n FROM b_records")
      .get()!.n;
    await server.stop();
    server = await startTestServer({ databasePath });
    assert.equal(
      server.context.store.db.prepare("SELECT COUNT(*) n FROM b_records").get()!
        .n,
      count,
    );
    assert.ok(
      server.context.home
        .wall("mermaid")
        .some((m) => m.body === "Keep this existing note"),
    );
    assert.equal(
      server.context.home.profile("demo-contributor")!.totalPledged,
      805,
    );
    const pledge = () =>
      fetch(server.url + "/api/missions/catalog-mermaid/pledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "catalog-pledge",
        },
        body: JSON.stringify({ amount: 690 }),
      }).then((r) => r.json());
    const funded = await pledge();
    assert.equal(funded.wallet, 9310);
    assert.equal(funded.mission.status, "funded");
    assert.equal(funded.executionStarting, false);
    assert.deepEqual(await pledge(), funded);
    await request(server.url, "/api/missions/catalog-quick-lru/pledge", {
      amount: 10,
    });
    assert.equal(
      (
        await request<MissionDetail>(
          server.url,
          "/api/missions/catalog-quick-lru",
        )
      ).status,
      "funding",
    );
    await server.stop();
    server = await startTestServer({ databasePath });
    assert.equal(
      (
        await request<MissionDetail>(
          server.url,
          "/api/missions/catalog-mermaid",
        )
      ).computePledged,
      5000,
    );
    assert.equal(
      server.context.home.profile("demo-contributor")!.totalPledged,
      1505,
    );
    await request(server.url, "/api/demo/reset", {});
    assert.equal(
      (
        await request<MissionDetail>(
          server.url,
          "/api/missions/catalog-mermaid",
        )
      ).computePledged,
      4310,
    );
    assert.equal(
      server.context.home.profile("demo-contributor")!.totalPledged,
      805,
    );
  } finally {
    await server.stop();
    rmSync(dir, { recursive: true, force: true });
  }
});

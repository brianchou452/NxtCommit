import { test } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "../test-support/http.js";
import {
  editorialGroups,
  fundable,
  releaseCampaign,
  uniqueCampaigns,
} from "../../shared/home-domain.js";
import type { ImpactSnapshot, MarketplaceSnapshot } from "../../shared/home.js";
test("impact-snapshot-keeps-counts-and-map-provenance-together", async () => {
  const s = await startTestServer();
  try {
    const impact = (await (
      await fetch(s.url + "/api/impact")
    ).json()) as ImpactSnapshot;
    const market = (await (
      await fetch(s.url + "/api/marketplace")
    ).json()) as MarketplaceSnapshot;
    assert.equal(impact.stats.tokensDonated, market.stats.totalPledged * 1000);
    assert.equal(impact.beacons.length, 20);
    assert.equal(impact.stats.trend.length, 14);
    assert.equal(impact.stats.dataMode, "demo");
    assert.equal(
      impact.beacons.reduce((n, b) => n + b.tokens, 0) * 1000,
      impact.stats.tokensDonated,
    );
    for (const b of impact.beacons) {
      assert.ok(
        b.lat >= -90 &&
          b.lat <= 90 &&
          b.lng >= -180 &&
          b.lng <= 180 &&
          b.tokens > 0,
      );
    }
    s.context.store.db
      .prepare(
        "UPDATE home_missions SET snapshot=json_set(snapshot,'$.computePledged',1234) WHERE id='mermaid'",
      )
      .run();
    const next = (await (
      await fetch(s.url + "/api/impact")
    ).json()) as ImpactSnapshot;
    assert.notEqual(next.stats.tokensDonated, impact.stats.tokensDonated);
  } finally {
    await s.stop();
  }
});
test("marketplace-provides-deduplicable-shelves-and-provenance and ordered editorial assignment", async () => {
  const s = await startTestServer();
  try {
    const m = s.context.home.marketplace();
    assert.equal(m.dataMode, "demo");
    assert.equal(m.stats.dataMode, "demo");
    const groups = editorialGroups(m);
    assert.deepEqual(
      groups.map((g) => g.key),
      ["everyday", "public-interest", "builder-trend"],
    );
    assert.ok(groups.every((g) => g.missions.length >= 5));
    const ids = groups.flatMap((g) => g.missions.map((c) => c.id));
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(uniqueCampaigns(m).length, 16);
    assert.equal(releaseCampaign(m)?.project.name, "marked");
    const campaign = uniqueCampaigns(m)[0]!;
    assert.equal(campaign.project.stars, undefined);
    assert.equal(fundable(campaign), true);
    assert.equal(fundable({ ...campaign, status: "executing" }), false);
    assert.equal(
      fundable({ ...campaign, computeGoal: campaign.computePledged }),
      false,
    );
    const duplicate = { ...campaign, title: { en: "later", "zh-TW": "後續" } };
    assert.equal(
      uniqueCampaigns({
        ...m,
        sections: [{ key: "almost_funded", missions: [campaign, duplicate] }],
      })[0]?.title.en,
      campaign.title.en,
    );
  } finally {
    await s.stop();
  }
});
test("reset-restores-home-demo-fixture-only and globally invalidates committed data", async () => {
  const s = await startTestServer();
  const abort = new AbortController();
  try {
    const response = await fetch(s.url + "/api/stream", {
      signal: abort.signal,
    });
    assert.match(response.headers.get("content-type")!, /event-stream/);
    const reader = response.body!.getReader();
    await reader.read();
    const expected = s.context.home.marketplace();
    s.context.home.post("mermaid", "a local note");
    s.context.home.vote("backer-0");
    const reset = await fetch(s.url + "/api/demo/reset", { method: "POST" });
    assert.deepEqual(await reset.json(), { ok: true });
    const frame = await reader.read();
    assert.match(
      new TextDecoder().decode(frame.value),
      /event: mission_update/,
    );
    assert.deepEqual(s.context.home.marketplace(), expected);
    assert.deepEqual(s.context.home.wall("mermaid"), []);
    assert.ok(s.context.home.nominees().every((n) => !n.votedByYou));
    assert.deepEqual(
      s.context.store.db.prepare("PRAGMA foreign_key_check").all(),
      [],
    );
  } finally {
    abort.abort();
    await s.stop();
  }
});
test("reset blocks concurrent community mutations while draining participants", async () => {
  let release!: () => void;
  const barrier = new Promise<void>((r) => (release = r));
  const s = await startTestServer({
    resetParticipants: [
      {
        id: "test-drain",
        quiesce: () => barrier,
        clear: () => {},
        seed: () => {},
      },
    ],
  });
  try {
    const reset = s.context.reset();
    const r = await fetch(s.url + "/api/mvp/backer-0/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(r.status, 503);
    release();
    await reset;
    assert.equal(s.context.home.nominees()[0]?.votes, 0);
  } finally {
    release();
    await s.stop();
  }
});

test('desktop map labels are bounded and do not collide', async () => {
  const { mapLabels } = await import('../../shared/map-layout.js');
  const s = await startTestServer();
  try {
    const labels = mapLabels(s.context.home.impact().beacons);
    assert.equal(labels.length, 20);
    for (const [i, a] of labels.entries()) {
      const width = a.city.length * 5.8 + 8;
      assert.ok(a.x >= 0 && a.x + width <= 1000 && a.y >= 15 && a.y <= 485);
      for (const b of labels.slice(i + 1)) {
        const otherWidth = b.city.length * 5.8 + 8;
        assert.ok(!(a.x < b.x + otherWidth && a.x + width > b.x && a.y - 12 < b.y + 3 && a.y + 3 > b.y - 12));
      }
    }
  } finally { await s.stop(); }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./test-support/http.js";
import { request } from "./test-support/authoring.js";
import { allocateCredits } from "./persistence/commitment-profile.js";
import type { ContributorProfile } from "../shared/home.js";

test("commitment allocation preserves whole credits, duplicate backer pledges and zero weights", () => {
  assert.deepEqual(
    [
      ...allocateCredits(5, [
        { key: "a", weight: 1 },
        { key: "a", weight: 1 },
        { key: "b", weight: 1 },
      ]),
    ],
    [
      ["a", 3],
      ["b", 2],
    ],
  );
  assert.deepEqual(
    [
      ...allocateCredits(2, [
        { key: "c", weight: 1 },
        { key: "a", weight: 1 },
        { key: "b", weight: 1 },
      ]),
    ].sort(),
    [
      ["a", 1],
      ["b", 1],
      ["c", 0],
    ],
  );
  assert.equal(allocateCredits(10, [{ key: "a", weight: 0 }]).get("a"), 0);
});

test("profile exposes all 13 bilingual badges, deterministic awards and honest unknowns without read mutations", async () => {
  const server = await startTestServer({ integrateSlices: false });
  try {
    const profile = await request<ContributorProfile>(
      server.url,
      "/api/contributors/demo-contributor",
    );
    assert.equal(profile.achievementDefs.length, 13);
    assert.equal(new Set(profile.achievementDefs.map((d) => d.code)).size, 13);
    assert.ok(
      profile.achievementDefs.every(
        (d) => typeof d.name !== "string" && d.name.en && d.name["zh-TW"],
      ),
    );
    assert.ok(profile.achievements.some((a) => a.code === "ship_it"));
    assert.ok(profile.achievements.some((a) => a.code === "first_spark"));
    assert.ok(!profile.achievements.some((a) => a.code === "ai_architect"));
    assert.ok(profile.receipts.find(r=>r.status==='released')?.achievements?.includes('ship_it'));
    assert.equal(profile.stats.creditsConsumed, undefined);
    assert.equal(profile.stats.downstreamDownloads, undefined);
    assert.ok(
      profile.receipts.every(
        (r) => r.projectName && r.missionTitle && !r.adoption,
      ),
    );
    const changes = server.context.store.db
      .prepare("SELECT total_changes() AS n")
      .get()!.n;
    const again = await request<ContributorProfile>(
      server.url,
      "/api/contributors/demo-contributor",
    );
    assert.deepEqual(again, profile);
    assert.equal(
      server.context.store.db.prepare("SELECT total_changes() AS n").get()!.n,
      changes,
    );
  } finally {
    await server.stop();
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { startTestServer } from "../test-support/http.js";
import type { ContributorProfile, WallMessage } from "../../shared/home.js";
const post = (url: string, body: unknown) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("contributor-profile-route and mvp-list-route derive local records without fabricated external evidence", async () => {
  const s = await startTestServer();
  try {
    const p = (await (
      await fetch(s.url + "/api/contributors/demo-contributor")
    ).json()) as ContributorProfile;
    assert.equal(p.dataMode, "demo");
    assert.equal(
      p.totalPledged,
      p.pledges.reduce((n, r) => n + r.amount, 0),
    );
    assert.equal(p.stats.localReleases, 1);
    assert.equal(
      p.stats.missionsSupported,
      new Set(p.pledges.map((p) => p.missionId)).size,
    );
    assert.equal(p.stats.creditsConsumed, undefined);
    assert.equal(p.achievements[0]?.source, "demo");
    assert.ok(!JSON.stringify(p).includes("weeklyDownloads"));
    assert.equal((await fetch(s.url + "/api/contributors/absent")).status, 404);
    const n = await (await fetch(s.url + "/api/mvp")).json();
    assert.equal(n.nominees.length, 3);
    assert.equal(n.nominees[0].basis.dataMode, "demo");
  } finally {
    await s.stop();
  }
});
test("one-local-vote-per-category survives concurrent requests and process reopen; wall redacts before storage", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nxt-community-"));
  const path = join(dir, "state.sqlite");
  let s = await startTestServer({ databasePath: path });
  try {
    const responses = await Promise.all([
      post(s.url + "/api/mvp/backer-0/vote", { contributorId: "spoof" }),
      post(s.url + "/api/mvp/backer-1/vote", {}),
    ]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
    const secret = "sk-" + "synthetic".repeat(4);
    const body = `Please check ${secret}`;
    const response = await post(s.url + "/api/missions/mermaid/wall", {
      body,
      authorId: "spoof",
      authorRole: "maintainer",
      createdAt: "yesterday",
    });
    assert.equal(response.status, 200);
    const { messages } = (await response.json()) as { messages: WallMessage[] };
    assert.equal(messages[0]?.authorId, "demo-contributor");
    assert.equal(messages[0]?.authorRole, "contributor");
    assert.match(messages[0]!.body, /\[REDACTED\]/);
    assert.ok(
      !JSON.stringify(
        s.context.store.db.prepare("SELECT * FROM home_wall").all(),
      ).includes(secret),
    );
    assert.equal(
      (
        await post(s.url + "/api/missions/mermaid/wall", {
          body: "😀".repeat(281),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await post(s.url + "/api/missions/mermaid/wall", {
          body: "😀".repeat(280),
        })
      ).status,
      200,
    );
    assert.equal(
      (await post(s.url + "/api/missions/mermaid/wall", { body: " " })).status,
      400,
    );
    await s.stop();
    s = await startTestServer({ databasePath: path });
    assert.equal(s.context.home.wall("mermaid").length, 2);
    assert.equal(
      s.context.home.nominees().reduce((n, r) => n + r.votes, 0),
      1,
    );
    assert.equal(
      (await post(s.url + "/api/mvp/backer-2/vote", {})).status,
      400,
    );
    assert.ok(!readFileSync(path).includes(Buffer.from(secret)));
    await s.context.reset();
    assert.equal(s.context.home.wall("mermaid").length, 0);
  } finally {
    await s.stop();
    rmSync(dir, { recursive: true, force: true });
  }
});

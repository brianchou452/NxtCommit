import test from "node:test";
import assert from "node:assert/strict";
import worker from "./worker.mjs";

const env = { DEPLOYMENT_STAGE: "infrastructure-only", COMMIT_SHA: "abc123", GITHUB_RUN_URL: "https://github.com/example/actions/runs/1", PRIVATE_TOKEN: "must-not-leak" };
const request = (path, method = "GET") => worker.fetch(new Request(`https://example.com${path}`, { method }), env);

test("receipt identifies exact revision and does not claim product readiness or expose secrets", async () => {
  const response = await request("/__deployment");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { service: "nxtcommit-delivery", stage: "infrastructure-only", commit: "abc123", runUrl: env.GITHUB_RUN_URL, applicationReady: false });
});

test("unimplemented application and health endpoints cannot look healthy", async () => {
  assert.equal((await request("/")).status, 503);
  for (const path of ["/healthz", "/readyz", "/api/bootstrap", "/anything"]) {
    assert.equal((await request(path)).status, 404);
  }
});

test("HEAD has no body and mutation methods are refused", async () => {
  assert.equal(await (await request("/__deployment", "HEAD")).text(), "");
  const response = await request("/__deployment", "POST");
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});

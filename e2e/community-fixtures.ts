import express from "express";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createApplication } from "../server/app.js";
import { routeModules } from "../server/routes/index.js";
/** Test-only fixture authority; each browser context receives a fresh SQLite directory. */
const app = express();
app.get("/healthz", (_req, res) => res.json({ ok: true }));
const instances = new Map<string, ReturnType<typeof createApplication>>();
const directories: string[] = [];
app.get("/__fixture/:name", (request, response) => {
  const mode = request.params.name,
    id = randomUUID(),
    dir = mkdtempSync(join(tmpdir(), "nxt-home-e2e-"));
  directories.push(dir);
  let impactRequests = 0,
    marketRequests = 0,
    resetRequests = 0,
    wallPosts = 0,
    profileRequests = 0,
    heartbeats = 0;
  let instance: ReturnType<typeof createApplication>;
  instance = createApplication({ integrateSlices: false,
    databasePath: join(dir, "state.sqlite"),
    staticDirectory: resolve("dist"),
    modules: [
      (context) => {
        const router = express.Router();
        router.get("/__evidence", (_req, res) =>
          res.json({
            impactRequests,
            marketRequests,
            resetRequests,
            wallPosts,
            heartbeats,
            impact: context.home.impact(),
            wall: context.home.wall("mermaid"),
            nominees: context.home.nominees(),
          }),
        );
        router.get("/api/impact", async (_req, res, next) => {
          impactRequests++;
          if (mode === "slow") await new Promise((r) => setTimeout(r, 1200));
          if (mode === "home-error" && impactRequests <= 2) {
            res.status(503).json({ error: "Fixture impact failure" });
            return;
          }
          next();
        });
        router.get("/api/marketplace", async (_req, res, next) => {
          marketRequests++;
          if (mode === "slow") await new Promise((r) => setTimeout(r, 1200));
          if (mode === "market-error" && marketRequests <= 2) {
            res.status(503).json({ error: "Fixture marketplace failure" });
            return;
          }
          next();
        });
        router.post("/api/demo/reset", async (_req, res, next) => {
          resetRequests++;
          await new Promise((r) => setTimeout(r, 200));
          if (mode === "reset-error" && resetRequests === 1) {
            res.status(503).json({ error: "Fixture reset failure" });
            return;
          }
          next();
        });
        router.post("/api/missions/:id/wall", (_req, res, next) => {
          wallPosts++;
          if (mode === "wall-error" && wallPosts === 1) {
            res.status(503).json({ error: "Fixture post failure" });
            return;
          }
          next();
        });
        router.get("/api/contributors/:id", (req, res, next) => {
          profileRequests++;
          if (mode === "render-error" && profileRequests === 1) {
            res.json({ ...context.home.profile(req.params.id), pledges: null });
            return;
          }
          if (mode === "profile-error" && profileRequests === 1) {
            res.status(503).json({ error: "Fixture failure" });
            return;
          }
          next();
        });
        if (mode === "heartbeat") {
          const timer = setInterval(() => {
            heartbeats++;
            context.events.publish("heartbeat", {});
          }, 250);
          timer.unref();
        }
        return router;
      },
      ...routeModules,
    ],
  });
  if (mode === "empty-map")
    instance.context.store.db.exec(
      "UPDATE home_contributors SET location=NULL",
    );
  if (mode === "empty-market")
    instance.context.store.db.exec(
      "UPDATE home_missions SET snapshot=json_set(snapshot,'$.status','approved','$.tags',json('[]'),'$.project.usedByYou',json('false'))",
    );
  if (mode === "empty-profile")
    instance.context.store.db.exec(
      "DELETE FROM home_pledges WHERE contributor_id='demo-contributor'; DELETE FROM home_achievements WHERE contributor_id='demo-contributor'",
    );
  if (mode === "stream" || mode === "reconnect") {
    instance.context.store.db.exec(
      "UPDATE home_missions SET snapshot=json_set(snapshot,'$.computePledged',42) WHERE id='mermaid'",
    );
    if (mode === "reconnect") {
      const publish = instance.context.events.publish.bind(
        instance.context.events,
      );
      instance.context.events.publish = (name, payload) => {
        if (name === "mission_update") instance.context.events.close();
        else publish(name, payload);
      };
    }
  }
  instances.set(id, instance);
  response.cookie("nxt-fixture", id, { httpOnly: true, sameSite: "strict" });
  response.redirect(
    mode === "market-error" || mode === "empty-market"
      ? "/marketplace"
      : mode === "reset-error"
        ? "/demo"
        : mode === "wall-error"
          ? "/missions/mermaid"
          : ["empty-profile", "render-error", "profile-error"].includes(mode)
            ? "/contributors/demo-contributor"
            : "/",
  );
});
app.use((request, response, next) => {
  const id = request.headers.cookie?.match(/(?:^|; )nxt-fixture=([^;]+)/)?.[1];
  const instance = id ? instances.get(id) : undefined;
  if (instance) instance.app(request, response, next);
  else response.status(404).json({ error: "Create a fixture first." });
});
const server = app.listen(4179, "127.0.0.1");
process.once("SIGTERM", () => {
  for (const instance of instances.values()) instance.context.events.close();
  server.close(() => {
    for (const instance of instances.values()) instance.close();
    directories.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  });
  server.closeAllConnections();
});

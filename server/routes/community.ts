import { Router } from "express";
import type { RouteModule } from "./types.js";
export const communityRoutes: RouteModule = (context) => {
  const router = Router();
  router.get("/api/contributors/:id", (request, response) => {
    const profile = context.home.profile(request.params.id);
    if (!profile) {
      response
        .status(404)
        .json({ error: "Contributor not found.", code: "not_found" });
      return;
    }
    response.json(profile);
  });
  router.get("/api/mvp", (_request, response) =>
    response.json({ nominees: context.home.nominees() }),
  );
  router.post("/api/mvp/:id/vote", (request, response) => {
    try {
      response.json({ nominees: context.home.vote(request.params.id) });
    } catch (error) {
      if (error instanceof Error && error.message === "invalid_vote")
        response
          .status(400)
          .json({
            error: "Invalid nominee or category already voted.",
            code: "invalid_vote",
          });
      else throw error;
    }
  });
  router.get("/api/missions/:id/wall", (request, response) => {
    if (!context.home.mission(request.params.id)) {
      response
        .status(404)
        .json({ error: "Mission not found.", code: "not_found" });
      return;
    }
    response.json({ messages: context.home.wall(request.params.id) });
  });
  router.post("/api/missions/:id/wall", (request, response) => {
    try {
      response.json({
        messages: context.home.post(request.params.id, request.body?.body),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "invalid_comment")
        response
          .status(400)
          .json({
            error:
              "Comment must contain 1–280 characters for an existing mission.",
            code: "invalid_comment",
          });
      else throw error;
    }
  });
  return router;
};

// Infrastructure receipt only. Product API health/readiness are not implemented here.
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { ...headers, allow: "GET, HEAD" } });
    }
    if (path === "/__deployment") {
      const body = JSON.stringify({
        service: "nxtcommit-delivery",
        stage: env.DEPLOYMENT_STAGE,
        commit: env.COMMIT_SHA,
        runUrl: env.GITHUB_RUN_URL,
        applicationReady: false,
      });
      return new Response(request.method === "HEAD" ? null : body, {
        headers: { ...headers, "content-type": "application/json; charset=utf-8" },
      });
    }
    const body = "NxtCommit: deployment infrastructure is available. Product application is not integrated yet.\nNxtCommit：部署基礎設施已就緒；產品應用程式尚未接入。\n";
    return new Response(request.method === "HEAD" ? null : body, {
      status: path === "/" ? 503 : 404,
      headers: { ...headers, "content-type": "text/plain; charset=utf-8" },
    });
  },
};

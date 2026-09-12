# OpenAI configuration in local and Cloudflare environments

Both Node runtimes import `server/services/openai.ts`. It calls the official Responses API with a 45-second timeout, no automatic retries, at most 1,024 output tokens, and `store:false`. Successful output carries the real model, response ID, prompt version, latency and measured tokens; unavailable usage stays null. Provider error bodies and keys are not logged. This does not install an execution runner or complete Phase 2 authoring routes.

Local: put `OPENAI_API_KEY` in the ignored root `.env`, and optionally set `OPENAI_MODEL` (default `gpt-5-mini`). Run `node --import tsx scripts/check-openai.mjs` once for a small, billable provider verification. The script prints provenance only.

Cloudflare: save the same key as the `OPENAI_API_KEY` Worker secret for `nxtcommit-delivery`. The Container class forwards it only at runtime; it is never a Docker build argument or frontend variable. Only api.openai.com is allowed for outbound connections. A newly started container is needed after secret changes. OPENAI_MODEL may be a non-secret Worker variable. A valid key in one environment does not prove the other works; record both live checks separately.

An event credit redemption code is not an API key. Redeem credits in the OpenAI project first, then create a project key in the provider UI. Never commit or paste the key into checkpoint files. API/project budget alerts are not claimed as configured. The hosting cutoff blocks cloud traffic and stops the container at 2026-09-13 01:00 Asia/Taipei; local processes must also be stopped when the demonstration ends.

[Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) · [Model](https://developers.openai.com/api/docs/models/gpt-5-mini)

## Deployment connection evidence

The container adapter offers POST `/__openai-check` only with the separate `OPENAI_CHECK_TOKEN` bearer secret. Without that secret it returns 404. It accepts no prompt input, performs at most one fixed-prompt provider call per process, and returns only provenance/usage. It uses the same compiled server client as local development. Normal health probes never call OpenAI. This is an operational check, not an authoring feature.

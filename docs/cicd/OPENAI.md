# OpenAI configuration in local and Cloudflare environments

## Product connection update — 0.7.18

The production entrypoint now loads the same authoring configuration as local Node. The official OpenAI endpoint uses Responses, matching the existing restricted key; explicitly configured compatible gateways retain Chat Completions. Product advice requests strict bilingual JSON, a 12-second deadline, a 1,024-output-token ceiling and minimal reasoning on gpt-5-mini. Fixture execution remains scripted demo; advice cannot change deterministic evidence or approve a run.

Successful product evidence includes provider response ID, model, duration and actual token usage. Langfuse exports metadata only, with actual span start/end, model, token usage, prompt version and release SHA; raw prompts, repository text, output prose and secrets are excluded. Export waiting is bounded at 1.5 seconds and failure is nonfatal. Fallback observations are spans, not model generations.

Langfuse Cloud setup: complete account login, create/select the NxtCommit project, then configure GitHub secrets `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY`, plus variable `LANGFUSE_BASE_URL` for the chosen EU/US/JP endpoint. The deploy workflow syncs these through stdin to Worker secrets before deploying. Never paste keys into chat. The gateway allows only OpenAI and these Langfuse Cloud hosts; model and trace credentials are forwarded at runtime only. Verify product evidence trace IDs through Langfuse after deployment; `langfuseEnabled` alone is not proof of ingestion. The Cloud account has its own retention and lifecycle; the application cutoff does not delete hosted traces or close that account.

Both Node runtimes import `server/services/openai.ts`. It calls the official Responses API with a 45-second timeout, no automatic retries, at most 1,024 output tokens, and `store:false`. Successful output carries the real model, response ID, prompt version, latency and measured tokens; unavailable usage stays null. Provider error bodies and keys are not logged. This does not install an execution runner or complete Phase 2 authoring routes.

Local: put `OPENAI_API_KEY` in the ignored root `.env`, and optionally set `OPENAI_MODEL` (default `gpt-5-mini`). Run `node --import tsx scripts/check-openai.mjs` once for a small, billable provider verification. The script prints provenance only.

Cloudflare: save the same key as the `OPENAI_API_KEY` Worker secret for `nxtcommit-delivery`. The Container class forwards it only at runtime; it is never a Docker build argument or frontend variable. Only api.openai.com is allowed for outbound connections. A newly started container is needed after secret changes. OPENAI_MODEL may be a non-secret Worker variable. A valid key in one environment does not prove the other works; record both live checks separately.

An event credit redemption code is not an API key. Confirm credits in the correct OpenAI organization first, then create a project key in the provider UI. Never commit or paste the key into checkpoint files. Organization spend alerts are configured at USD 80, 90 and 95, sent to ianjuantw@gmail.com, with the existing USD 100 owner alert retained (CP-016). The hosting cutoff blocks cloud traffic and stops the container at 2026-09-13 01:00 Asia/Taipei; local processes must also be stopped when the demonstration ends.

[Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) · [Model](https://developers.openai.com/api/docs/models/gpt-5-mini)

## Deployment connection evidence

The container adapter offers POST `/__openai-check` only with the separate `OPENAI_CHECK_TOKEN` bearer secret. Without that secret it returns 404. It accepts no prompt input, performs at most one fixed-prompt provider call per process, and returns only provenance/usage. It uses the same compiled server client as local development. Normal health probes never call OpenAI. This is an operational check, not an authoring feature.

## Key inventory and replacement runbook

| Setting | Hackathon configuration |
| --- | --- |
| Organization / project | Personal Organization / Default project |
| Project ID | `proj_1BGh59tTmK8tJBTCxbxfjlIN` |
| Key name | `NxtCommit Hackathon Local and Cloudflare` |
| Permissions | Restricted: Responses (`/v1/responses`) Write only |
| Expiration selected | 1 day; check the key's actual expiry in OpenAI Platform |
| Local secret | Root `.env`: `OPENAI_API_KEY`; file mode 0600, ignored by Git |
| Cloud secret | Worker `nxtcommit-delivery`: `OPENAI_API_KEY` |
| Model | `OPENAI_MODEL=gpt-5-mini` |

Key expiration and credit exhaustion are different. Replacing a key does not replenish the organization's credits. If credits are exhausted, resolve the organization's billing/credit balance; if the key expires or is revoked, create a replacement. Never put a promotional redemption code in `OPENAI_API_KEY`.

1. In [OpenAI API keys](https://platform.openai.com/settings/organization/api-keys), confirm Personal Organization and Default project. Create a replacement with the name above (optionally add the date), Restricted → Model capabilities → Responses → Write, and the required expiration. Keep other permissions at None. Record the actual expiration without recording the secret.
2. Update only `OPENAI_API_KEY` in each active local checkout's ignored root `.env`. This session configured `/Users/ian_juan/Documents/GitHub/NxtCommit/.env` and `/Users/ian_juan/Documents/GitHub/NxtCommit-delivery/.env`. Preserve unrelated variables; keep mode 0600. Do not put it in `VITE_*`, GitHub source, Docker arguments, or command-line arguments.
3. Restart local server processes so they load the new environment. From the delivery worktree with Node 24 and dependencies installed, run `node --import tsx scripts/check-openai.mjs`. Require `ok:true`, `generator:openai`, `fallback:false` and real usage. A running process does not automatically reload `.env`.
4. In the Cloudflare owning account, open Workers & Pages → `nxtcommit-delivery` → Settings → Variables and Secrets. Replace `OPENAI_API_KEY` as a **Secret**, save/apply it, then stop/restart the existing container so runtime `envVars` receives the new value. A Worker secret update alone is not proof that an already-running Node process has the new key. Restarts may erase the ephemeral SQLite demo state.
5. Check the live `/__deployment` receipt and health/readiness. Send an authenticated POST to `/__openai-check`, using the separate `OPENAI_CHECK_TOKEN` as the Bearer credential—not the OpenAI key. The delivery worktree's ignored `.env` stores this separate operational token. Require a successful result from the newly started container. This endpoint caches one provider result per process, so an old process's cached success cannot prove rotation worked.
6. After both environments pass, revoke the superseded key in OpenAI Platform. Update bilingual checkpoints with time, key name/expiry, environment, release SHA, model, response ID and token usage; never include key values. For a compromised key, revoke it promptly and accept interruption while replacing it.

The authorized hackathon cutoff remains **2026-09-13 01:00 Asia/Taipei**. Do not restart/redeploy the closed cloud demonstration merely to test a renewed key; extending hosting beyond that deadline requires a new user instruction. Renewing credentials does not extend the deployment lifetime.

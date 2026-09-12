# Delivery checkpoints

## CP-001 — Requirements and initial workspace / 2026-09-12

User authorized GitHub → Cloudflare CI/CD, an ianjuan.com subdomain, and checkpoint evidence for hackathon judging. Initial Hackthon directory had an empty Git repository, no remote or source. Initial planning records remain in that workspace; this repository now holds the implementation record.

## CP-002 — Cloudflare read-only verification / 2026-09-12

Token verification returned active. Account listing and ianjuan.com zone query succeeded; zone status was active and its owning account was identified. No write permissions, DNS change, deployment or token rotation were established by these checks. Credential values are excluded from this record.

## CP-003 — Correct repository / 2026-09-12

User supplied NxtCommit. Confirmed remote brianchou452/NxtCommit, main at e60996320699133f8b64eb11b0ac85a2a7cd7b18, clean worktree and no product source/package/CI configuration. Read AGENTS.md and relevant contracts. Referenced root maintainer/operations/security/reality documents were absent. Existing contracts mention SQLite and process execution; full application hosting remains a runtime integration task. Created codex/cloudflare-cicd without changing main.

## CP-004 — GitHub identity / 2026-09-12

CLI credential helper had no GitHub credential. Connector identity ian-juan_tmemu had pull=true, push=false. User requested personal account ianjuantw@gmail.com. GitHub Desktop was already signed in as ianjuantw; Safari showed push access and an accessible Actions secrets page. Created CLOUDFLARE_API_TOKEN through the authenticated repository UI; GitHub confirmed “Repository secret added.” No connector identity switch is claimed.

## CP-005 — Implementation and local verification / 2026-09-12

Added CI, serialized main-only deployment, custom-domain collision preflight, revision smoke verification, infrastructure Worker and bilingual handoff. Updated inherited GitLab/Argo statements to match the user's Cloudflare choice. Product-source guard prevents accidental placeholder releases after application code appears.

Verified locally: 125 spec schemas passed; 13 referenced product test files are absent and explicitly reported. Three infrastructure behavior tests passed. Wrangler 4.131.1 dry-run succeeded. npm audit reported zero vulnerabilities. Node 22.23.2 was downloaded from nodejs.org and its archive verified against official SHA256 checksums.

## Pending checkpoints

| ID | Completion evidence | Status |
| --- | --- | --- |
| CP-006 | Account variable saved, branch published and GitHub CI run linked | Complete; see CP-006 below |
| CP-007 | main deployment run, Cloudflare version and HTTPS matching receipt | Credential handoff; see CP-007 below |
| CP-008 | Actual framework/runtime integrated; product test and readiness evidence | Awaiting product source/stack |
| CP-009 | Rollback drill with restored serving revision | Not executed |

Each subsequent entry must include time, change, verification, result, evidence link and unresolved work. A configured secret or green contract check is not proof of a deployed product.

## CP-006 — Cloud configuration, CI and concurrent documentation / 2026-09-12

CLOUDFLARE_ACCOUNT_ID was saved and verified in the repository UI. Branch c2eacb9 was published through ianjuantw. [Push CI](https://github.com/brianchou452/NxtCommit/actions/runs/34668690840) and [PR CI](https://github.com/brianchou452/NxtCommit/actions/runs/34668726022) both succeeded. [PR #1](https://github.com/brianchou452/NxtCommit/pull/1) was created. Teammate commit c21d4ed added historical documents concurrently; resolved the two add/add conflicts by retaining their documents and moving this Cloudflare runbook to docs/cicd/RUNBOOK. Added explicit historical-scope labels without removing incident history. The newly imported documents were read; they are not evidence of product source or a current deployment.

## CP-007 — First main deployment rejected by Cloudflare / 2026-09-12 02:55 UTC

[PR #1](https://github.com/brianchou452/NxtCommit/pull/1) merged as c21dbf5d14d8ea6eeef6e86f54067a5bc9f50a06 after both updated-branch CI checks passed ([PR run](https://github.com/brianchou452/NxtCommit/actions/runs/34668873422), [push run](https://github.com/brianchou452/NxtCommit/actions/runs/34668871294)).

[Deployment run 34668938513](https://github.com/brianchou452/NxtCommit/actions/runs/34668938513) passed CI, credential-presence checks, and account/zone/DNS/custom-domain preflight. Worker upload was rejected with Cloudflare authentication error 10000 at the Workers Scripts API. HTTPS verification was correctly skipped, and failure evidence was uploaded. No successful deployment, version ID, domain binding or live application is claimed.

Confirmed the supplied token was the same token shown in the user's Cloudflare UI. Prepared a dedicated NxtCommit GitHub Actions token summary: Workers Scripts:Edit on the owning account, Zone:Read and DNS:Read on ianjuan.com only. Official upload and custom-domain APIs require Workers Scripts Write. Creation is pending the user's final UI action; no new token was generated by the assistant. This grants deployment access, so the computer-use credential handoff rule requires the user to submit. After creation: update the existing GitHub secret, rerun the failed deployment, and verify the serving SHA/run receipt.

The local checkout was fast-forwarded to the merged main. The checkpoint-only follow-up uses [skip ci] so documenting a permission failure does not produce an identical deployment failure. It changes no runtime or workflow code.

## CP-010 — New token and application source / 2026-09-12 03:15 UTC

The user created the dedicated token and supplied it for deployment. GitHub confirmed the existing secret was updated. [Attempt 2](https://github.com/brianchou452/NxtCommit/actions/runs/34668938513/attempts/2) successfully uploaded the Worker, then failed during Wrangler's zone Workers Routes listing with code 10000. Workers Scripts write is now verified; hostname binding and HTTPS remain unverified. Wrangler additionally requires Workers Routes:Read for its collision check. No credential values are recorded.

The user requested deployment of newly pushed application source. Inspected main d376137: React/Vite, Express, Node 24 and synchronous node:sqlite persistence. Workers exposes node:sqlite only as a non-functional stub; direct deployment of this server is incompatible. Cloudflare Containers or an existing Node host is required without redesigning the application's database boundary; runtime choice was requested from the user. Containers use ephemeral local disk.

Node 24.19.0 was downloaded with official SHA256 verification. Locked dependency installation reported zero vulnerabilities. Local typechecks and production builds passed; server tests reported 14 pass, 77 TODO, zero failures. Docker Desktop rejected local browser builds due to enforced corporate organization sign-in. Added a separate GitHub-hosted application CI job with locked install, typechecks, server tests, production build, version check and Docker foundation browser journeys; its run is pending publication. The existing product deployment guard remains until runtime integration.

Verification follow-up: [GitHub CI 34669746467](https://github.com/brianchou452/NxtCommit/actions/runs/34669746467) passed both contracts-and-delivery and application-foundation, including Docker foundation journeys, on feb0a21. A local production process returned 200 for /, /healthz, /readyz and /api/bootstrap, with db=true and execution.resolved=null; /api/missions returned 404 as expected for this foundation. These are local/CI results, not public deployment evidence.

## CP-011 — Paid containers, monitoring and cutoff / 2026-09-12 03:35 UTC

User authorized Workers Paid and resource monitoring. Activated the USD 5/month plus usage plan; dashboard verified Paid as Current plan. Configured a non-root Node 24 image, one basic container (1/4 vCPU, 1 GiB RAM, 4 GB ephemeral disk), and one named SQLite instance. User subsequently required two-hour idle sleep and shutdown at 2026-09-13 01:00 Asia/Taipei (2026-09-12 17:00 UTC). Added gateway cutoff, timed Node exit, deadline-guarded container deletion workflow with retries, and Codex one-time follow-up (automation ID nxtcommit). Renewal cancellation is still pending verification.

Monitoring checks HTTP/SQLite and Cloudflare resource/usage data every half hour. Estimates are not invoices; missing analytics is not zero usage. After cutoff, deployment and probes refuse further activity. User supplied another dedicated Cloudflare token; it is being saved in GitHub Secrets, never source. Live container deployment remains to be verified.

Added a shared server-only OpenAI Responses client for local and cloud runtimes, safe errors, bounded output/timeout, provenance, environment template and connection-check script. Local typechecks/build passed, 17 tests passed and 77 remain TODO. The short event code is not an API key; live checks require a valid key. The hosting adapter does not implement the Phase 2 runner or authoring routes.

CP-011 build correction: GitHub CI 34670771366 found the production Docker context omitted spec/assets, imported by ApplicationShell. Added the branding assets to the build stage (excluded from the final image except bundled output). This was a packaging failure; product tests passed independently. Source image registry advanced to 0.7.12.

## CP-012 — Container provisioned; startup repair and subscription decision / 2026-09-12 04:10 UTC

CI 34670900558 passed on 0d4b9a1. Deployment run 34670900648 built and pushed image sha256:ff6d414aabebc6355e01c7d8201940f5f23febf8d0d2d1525743c2c329baaca7, created application a03eb9ab-e1c7-4f5b-a61d-585856b9e28d and bound hackathon.ianjuan.com; Worker version df9cf4a8-4cc9-4909-a357-821c612624d6. Its smoke gate failed with HTTP 403. A later local HTTPS probe returned HTTP 500 explaining the missing ContainerProxy export; added that SDK export. Successful public startup is still pending.

User explicitly requested undoing the subscription cancellation. Cloudflare Billing now shows Workers Paid Active, renewing October 12, 2026. Updated shutdown automation to preserve this subscription. The September 13 01:00 Taiwan application shutdown remains in force; it stops container usage, not the recurring subscription fee. Local production-entry checks passed all five endpoints; a 100-request/20-concurrent bootstrap probe measured p95 2.02 ms and RSS 77.59 MiB. These are local results, not Cloudflare capacity evidence.

CP-012 follow-up / 04:15 UTC: the proxy export fixed startup. HTTPS /__deployment returned 200 and the exact 022bf985585be9a4996d625907149851cf5ec4a9/run 34672260466 identity. Python's default User-Agent was separately rejected by Cloudflare with 1010/403; an explicit NxtCommit service User-Agent returned 200 without changing firewall policy. Applied that identifier to deployment verification. Replaced recurring application probes with a read-only Container getState RPC, because application probes every 30 minutes would otherwise prevent the required two-hour idle sleep. This monitor checks gateway/lifecycle plus analytics; database readiness remains a deployment check.

## CP-013 — Verified release and live monitoring / 2026-09-12 04:19 UTC

Release 186fea4640545716698a88143c0219e1e9e9eb52 is serving at https://hackathon.ianjuan.com. [CI 34672509416](https://github.com/brianchou452/NxtCommit/actions/runs/34672509416) and [deployment 34672509651](https://github.com/brianchou452/NxtCommit/actions/runs/34672509651) both passed, including container build, foundation browser journeys, and public homepage/bootstrap/health/SQLite checks. The live Node /__deployment receipt matches this exact SHA and deployment run. Previous failed runs are retained as incident evidence, not erased or relabeled.

[Monitoring 34672602388](https://github.com/brianchou452/NxtCommit/actions/runs/34672602388) passed with no alerts. Cloudflare returned this application's peak memory 136835072 bytes (~130.50 MiB) and CPU p95 0.27944 (~27.94%); retain basic/1 GiB/max 1 at this observed load. Ingested trailing-24-hour gross container estimate was USD 0.0005 at the time of sampling, reflecting only the brief runtime so far, excluding monthly fees and other billed products; this is not a day-long projection or invoice. Periodic lifecycle RPCs do not reset container idle time. The two-hour configuration is tested and deployed; a full two-hour idle observation has not yet elapsed.

Workers Paid is Active and remains renewable per the user's latest instruction. Runtime cutoff, guarded deletion workflow and one-time Codex verification remain set for September 13 01:00 Taiwan. Future shutdown has not yet occurred. OpenAI shared local/cloud configuration and bounded client are committed, but no valid API key is available; no successful provider call or completed AI product feature is claimed. Teammates' uncommitted dev/computer-c checkout was preserved.

Cloudflare Worker version: `213a4d22-7a4f-46cc-9e71-da680361ec60`; image digest: `sha256:7ddfb5661277cb7c3e8a03963922a49e4a789c75d47801801511a8afd3f2a977`.

## CP-014 — OpenAI credentials and local verification / 2026-09-12

Confirmed USD 100 promotion already applied in Personal Organization; did not redeem again. User created a restricted Responses Write key and supplied it. Saved it in mode-0600, Git-ignored .env files for both the teammate checkout and delivery worktree, and in the Cloudflare OPENAI_API_KEY secret. Local fixed-prompt validation succeeded with gpt-5-mini-2025-08-07: 11 input, 64 output, 75 total tokens, 2836 ms, no fallback. No credential values recorded. Added a separately authenticated, cached fixed-prompt container check to verify the actual cloud runtime; cloud result is pending. This does not implement product authoring routes or an execution runner.

CP-014 cloud correction: the container check reached the compiled client but returned sanitized openai_transport_failed. Cloudflare's default interceptHttps=false means the HTTP allowlist does not enable HTTPS with global Internet disabled. Added scoped HTTPS interception, an api.openai.com handler, and NODE_EXTRA_CA_CERTS pointing at Cloudflare's runtime CA, preserving TLS verification and the allowlist. Placement required several minutes; extended the receipt retry window. Cloud success remains pending.

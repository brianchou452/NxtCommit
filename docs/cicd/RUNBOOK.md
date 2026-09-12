# GitHub → Cloudflare application delivery

> **Phase 3 merge (`0.7.17`):** The image now packages A/B/C, both bundled fixtures and Git; `/__deployment` reports `phase3-integrated` and `bundled-fixtures-only`. The original foundation deployment history remains in checkpoints. Product advice stays on labelled fallbacks; the Responses-only credential and OpenAI-only egress are preserved. Public GitHub metadata import requires local server network access. Cutoff, single-container capacity and ephemeral storage are unchanged.

This deployment packages the integrated React/Vite frontend and Node 24 / Express / SQLite server. The user authorized Workers Paid and Cloudflare Containers. The adapter uses the product's bundled fixture engine; it never grants arbitrary repository execution.

## Runtime and size

`nxtcommit-delivery` forwards requests to one named `NxtCommitContainer` at `hackathon.ianjuan.com`. The `basic` size provides 1/4 vCPU, 1 GiB memory and 4 GB ephemeral disk; `max_instances=1` prevents unbounded scaling and separate SQLite copies. It runs as a non-root user, with outbound Internet disabled. Idle sleep is 2 hours. Monitoring reads lifecycle metadata without starting the container or resetting idle time. Restart/redeploy/sleep can erase demo SQLite data. This is not durable application storage.

## Release and verification

See [CI speed and measured demo capacity](PERFORMANCE.md). Main runs one reusable CI gate; application checks share one pinned Docker build and still execute every journey. Worker dry-run only bundles the Worker; deployment builds the production container.

Main pushes run contracts/gateway checks, a Worker bundle dry-run, Node 24 typechecks/server tests/production build, version checks and all integrated Docker browser journeys before deploying. Wrangler builds the production image during deployment and embeds the exact Git SHA and Actions run URL as image build arguments. `/__deployment` is answered by the running Node image, not the fronting Worker. Release smoke checks validate that receipt plus the homepage, bootstrap, liveness and SQLite readiness.

The Worker and image are deployed together; cold provisioning can take several minutes. A 503 is a real unavailable container, never a healthy placeholder. GitHub `cloudflare-production` is serialized. CI Actions are SHA-pinned, credentials are not persisted in Git, and evidence artifacts retain 30 days.

The same main CI gate also publishes the complete production website for `linux/arm64` to GitHub Container Registry. CI starts the immutable commit image under QEMU and verifies its deployment receipt plus SQLite readiness before promoting the version and `arm64-latest` tags. This is independent of Cloudflare deployment and uses the repository-scoped `GITHUB_TOKEN`; no registry password is added. Prefer the immutable commit tag for deployment:

```bash
docker pull ghcr.io/brianchou452/nxtcommit:sha-<full-git-sha>-arm64
docker run --rm --init -p 8080:8080 ghcr.io/brianchou452/nxtcommit:sha-<full-git-sha>-arm64
```

Version tags such as `0.7.33-arm64` are stable release references, while `arm64-latest` moves on every successful main publication. The package is initially private unless its GHCR visibility is explicitly changed; authenticate with a token that has `read:packages` when required. Local container state remains ephemeral, and provider-backed functions require their server-side environment configuration.

## Credentials

GitHub secret `CLOUDFLARE_API_TOKEN` and variable `CLOUDFLARE_ACCOUNT_ID` refer only to the account owning ianjuan.com. The dedicated token requires Account Workers Scripts Edit, Containers Edit, Account Analytics Read; Zone Zone Read, DNS Read and Workers Routes Read scoped to ianjuan.com. The latter is required by Wrangler's route collision check even for a custom domain. No tokens belong in source or evidence. Chat-exposed tokens should be rotated directly in the provider and repository secret UI.

## Usage monitoring

`Monitor NxtCommit availability and usage` runs twice hourly. It checks gateway and container lifecycle state without application requests and queries Cloudflare workload and usage analytics for the last 24 hours. It records resource data and a gross container estimate, excluding allowances, Workers/DO/log charges, base fee and tax; this is not an invoice. Current analytics scope is all containers in the owning account and is labelled accordingly. Missing analytics is an alert, never zero usage. Alerts: HTTP failure, memory above 80% of basic capacity, CPU p95 above 80%, disk above 80%, or gross container usage above USD 2/day. Failures are visible in Actions; the Codex follow-up reports meaningful changes. No automatic resize, paid upgrade, restart or rollback occurs from these read-only checks.

Workers Paid starts at USD 5/month plus usage. Limits cap capacity, not the total bill. Deployment probes check HTTP/SQLite readiness; periodic monitoring preserves idle sleep. Compare estimated usage with the Cloudflare Billing dashboard. Only increase size after measured saturation; don't add replicas while using a local SQLite database.

## Recovery

Retry transient cold starts; inspect resource logs before resizing. Redeployment restarts can reset data. Restore a prior verified Git revision and rebuild/redeploy its image through Actions; verify the serving image SHA and run URL. A Worker-only rollback is not proof of a container rollback. No rollback drill is claimed. See CHECKPOINTS.md for actual outcomes and historical failures.

[Container pricing](https://developers.cloudflare.com/containers/platform/pricing/) · [Usage metrics](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-container-metrics/)

## Mandatory cutoff

At 2026-09-13 01:00 Asia/Taipei (2026-09-12 17:00 UTC), the gateway returns 410 and the Node process exits. Monitor and deployment scripts refuse to wake or deploy containers after cutoff. Scheduled deletion attempts at 17:00, 17:05 and 17:15 UTC target only this named container app. GitHub schedules can be delayed; runtime cutoff is independent. Codex verifies deletion. Per the latest explicit user instruction, Workers Paid remains Active and renews on October 12, 2026; application shutdown does not cancel its monthly fee. Future shutdown is not claimed as completed.

## Shared demo protection — v0.7.19

Cloudflare always protects reset, failing closed without an operator token. The footer hides public reset and guided demos keep existing progress. Visitors still share a demo identity; this is destructive-reset protection, not authentication or full session isolation. Local development remains resettable unless `DEMO_PROTECTED=1`. The server-side `OPENAI_CHECK_TOKEN`, separate from the provider key, authorizes operator reset and backup.

```bash
# Operator checkout with ignored .env; no secret in arguments.
node scripts/demo-control.mjs backup https://hackathon.ianjuan.com artifacts/demo-backups/before-demo.sqlite
# Destructive: only when the operator explicitly wants fresh shared state.
node scripts/demo-control.mjs reset https://hackathon.ianjuan.com
```

Backup uses SQLite online backup. Concurrent exports and reset during export are rejected; temporary server files are deleted after download. The CLI creates a new mode-0600 local file, refusing overwrites. Keep backups private. For local recovery, stop the target server, preserve its old VAR_DIR, copy the backup as `nxtcommit.sqlite` into a NEW empty VAR_DIR, then start the same source/schema version and verify readiness and expected missions. Never replace a live SQLite file or its WAL.

Cloudflare replacement still loses ephemeral state: this export is an offline recovery copy, not automatic cloud persistence or restore. Take a backup before planned redeployments and avoid deploying while presenting. Two-hour idle and the Taiwan 9/13 01:00 cutoff remain intact.

Projection refresh now checks SQLite `total_changes()` and `data_version`: unchanged reads do no projection writes; writes from the same process or a separate worker invalidate the snapshot. This reduces repeated work without claiming a throughput improvement until measured.

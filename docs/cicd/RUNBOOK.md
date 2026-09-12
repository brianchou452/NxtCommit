# GitHub → Cloudflare application delivery

This deployment packages the repository's Phase 1 React/Vite frontend and Node 24 / Express / SQLite server. The user authorized Workers Paid and Cloudflare Containers. No runner or Phase 2 implementation is invented by the hosting adapter.

## Runtime and size

`nxtcommit-delivery` forwards requests to one named `NxtCommitContainer` at `hackathon.ianjuan.com`. The `basic` size provides 1/4 vCPU, 1 GiB memory and 4 GB ephemeral disk; `max_instances=1` prevents unbounded scaling and separate SQLite copies. It runs as a non-root user, with outbound Internet disabled. Idle sleep is 2 hours. Monitoring reads lifecycle metadata without starting the container or resetting idle time. Restart/redeploy/sleep can erase demo SQLite data. This is not durable application storage.

## Release and verification

Main pushes run contracts/gateway checks, a Docker image dry-run build, Node 24 typechecks/server tests/production build, version checks and Docker foundation browser journeys before deploying. Wrangler embeds the exact Git SHA and Actions run URL as image build arguments. `/__deployment` is answered by the running Node image, not the fronting Worker. Release smoke checks validate that receipt plus the homepage, bootstrap, liveness and SQLite readiness.

The Worker and image are deployed together; cold provisioning can take several minutes. A 503 is a real unavailable container, never a healthy placeholder. GitHub `cloudflare-production` is serialized. CI Actions are SHA-pinned, credentials are not persisted in Git, and evidence artifacts retain 30 days.

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

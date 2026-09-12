# Collaboration guide

[繁體中文](COLLABORATION.zh-TW.md) · [Branch inventory](BRANCHES.md)

## Start a task

1. Read the current branch README, AGENTS.md, handoff and relevant specs. Root SKILL.md is absent in the inspected checkouts; use AGENTS.md and actual topic documents rather than treating the historical translation as a new executable rule.
2. Confirm worktree, branch, base SHA and uncommitted changes. Do not switch or clean a teammate's active checkout.
3. Identify owner, scope, shared files and the expected terminal outcome in the handoff.
4. Agree on shared contracts and APIs before implementation; have the integrator review central registry changes.


```bash
git status --short --branch
git worktree list
git branch -vv
git log --oneline -5
# Choose an unused directory and branch name for a new task:
git worktree add ../NxtCommit-docs-task -b codex/docs-task main
```

Install dependencies in the new worktree using the development guide. Never copy production `.env` into shared files or artifacts; configure credentials separately using the OpenAI runbook.

## Frontend design system

All frontend contributors, including remote developers and coding agents, must read and follow the [Design System](DESIGN-SYSTEM.md) before changing frontend layout, styling, components, interactions, or visual assets. Check the applicable design-system YAML, component/page/visual contracts, and approved goldens in the document's authority order. Complete its design review checklist and attach screenshots, contract-check output, or issue links to the PR/handoff; explicitly identify unverified items and missing mobile visual coverage. A documentation update alone is not visual acceptance.

The [Traditional Chinese document](DESIGN-SYSTEM.zh-TW.md) preserves the user-provided `commoncommit/docs/DESIGN-SYSTEM.md` source verbatim; the English document is its translation. Its 2026-09-12 synchronization and implementation statements describe that source baseline, not a fresh verification of this checkout. This repository contains `spec/design-systems/nxtcommit.yaml`, `spec/components/release-update.yaml`, `spec/pages/home.yaml`, `spec/visual/home.yaml`, and the declared `e2e/golden/home-desktop-ready.png`; their presence does not prove that the current UI matches them. The source's `src/styles.css` path is absent here: inspect this repository's `src/styles/*.css` instead. If a referenced contract, golden, or implementation is missing or differs, record the gap and reconcile the canonical artifacts before claiming conformity; do not infer coverage or import unrelated implementation automatically.

## Ownership and integration

| Workstream | Responsibility | Integration boundary |
| --- | --- | --- |
| A / integrator | Shell, community, shared types and registries | package/lock, router, migration/reset, i18n, Playwright |
| B | Missions, funding, execution, events and measured test evidence | Single mission authority, ExecutionEvidenceReader, stop/reset |
| C | Repository analysis, authoring, review and operations | Consume B evidence; synthetic adapter tests do not establish fresh execution |
| Delivery | GitHub Actions, Cloudflare, OpenAI, alerts and cutoff | Secrets, source SHA, HTTPS receipt, ephemeral DB and costs |
| Local experiments | Chaos and bounded self-update | Separate local state, off/demo lock, no automatic cloud promotion |

These are module responsibilities, not an assumed personnel roster.

## Before merging

1. Fetch and compare target main with the source branch. Merge in a clean integration worktree. Never force-push or resolve conflicts by blindly choosing an entire side.
2. C is already an ancestor of chaos; do not apply it twice. Integrate separate A/B workstreams around the shared foundation and mission/evidence ports before considering optional experiments.
3. Review shared exports, route registries, migration/reset order, context, i18n, package scripts, Playwright projects, versions and CI together.
4. Preserve main's Cloudflare Docker/HTTPS egress, secret injection, receipt, two-hour idle, cutoff and monitoring. Compare local server wiring with the deploy/node entrypoint so a localhost feature does not disappear in deployment.
5. A Responses Write key must not be assumed to authorize Chat Completions. C and chaos assistance use `/chat/completions`; reconcile adapters or explicitly configure suitable permissions and verify local/cloud independently. Do not silently broaden permissions to hide incompatibility.
6. Run relevant checks and a complete integrated journey; retain outstanding visual approval. Lead PRs/handoffs with changed user behavior, then evidence and limitations.
7. After main changes, verify CI, deployment and the `/__deployment` SHA independently. Documentation updates do not establish a new rollout. Do not bypass the cutoff through a merge.

## Handoff and judging evidence

Use the [slice template](SLICE-HANDOFF-TEMPLATE.md). Include source/target SHA, owner, changed files, APIs/contracts, exact verification commands/results, CI/deployment links, incomplete work, rollback and next recipient.

Distinguish source implemented, offline tests, browser verified, live provider and deployed. Test counts do not replace terminal outcomes; configuration does not replace a real call; a generated local self-update release is not a Git commit. Append operational checkpoints to [delivery evidence](cicd/CHECKPOINTS.md), without secrets, full environments or sensitive payloads.

## Documentation map

| Document | Scope |
| --- | --- |
| [Design System](DESIGN-SYSTEM.md) | Required frontend guide, authority order, and design review checklist |
| [Development](DEVELOPMENT.md) | Current main setup and commands |
| [Branches](BRANCHES.md) | Local, separate clone and cached remote refs |
| [Spec delivery](SPEC-DELIVERY.md) | YAML to tests and implementation |
| [Foundation](PHASE1-FOUNDATION.md) | Historical shared contract baseline |
| [Feature reality](FEATURE-REALITY.md) | Current notice and historical product context |
| [Architecture](ARCHITECTURE.md) | Reference; compare against branch implementation |
| [Agent architecture](AGENT-ARCHITECTURE.md) | Capabilities and authority |
| [Security](SECURITY.md) | Threat model and limits |
| [LLM observability](LLM-OBSERVABILITY-PLAN.md) | Planning and promotion gates |
| [Experiments](experiment-report.md) | Dated, revision-specific evidence |
| [Roadmap](PHASE-ROADMAP.md) | Phase plan, not deployment proof |
| [GitHub operations](GITHUB-OPERATIONS.md) | Cloudflare entry and historical GitLab/Argo record |
| [Gotchas](GOTCHAS.md) | Stable incident IDs |
| [Deployment](cicd/RUNBOOK.md) | Active deployment procedure |
| [Keys](cicd/OPENAI.md) | API, rotation and alerts |

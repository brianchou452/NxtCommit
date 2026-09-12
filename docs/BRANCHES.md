# Branch and file inventory — 2026-09-12

[繁體中文](BRANCHES.zh-TW.md) · [Collaboration](COLLABORATION.md)

> Pre-push update: remote main advanced to `111df8b`, including the `974ed8b` CI performance work. This documentation delivery incorporates that remote history. The table and JSON retain the earlier `e73f296` inspection baseline; the CI branch is now integrated. Subsequent uncommitted teammate agents/Langfuse work is outside this pinned snapshot and was left untouched.
This is a local snapshot, not a guarantee of current GitHub tips. Inspection covered every local branch's tracked file tree, differences and handoffs; it did not run every branch's tests or merge code. The [JSON inventory](branch-inventory.json) records all paths and Git object IDs without file contents, ignored environments, databases or private runtime artifacts.

## Working directories

- `NxtCommit` and `NxtCommit-delivery` share a Git object store and work on chaos and main respectively; both were clean when inspected.
- `NxtCommit-ci-performance` is a separate clone with its own local CI branch; it was clean when inspected.
- Seven local branch refs (including two main refs) across two repositories are covered. A/B in the original repository exist only as cached remote refs and are listed separately.

## Local branches


| Repository | Branch | Pinned SHA | Scope / relation to delivery main `e73f296` |
| --- | --- | --- | --- |
| shared | `main` | `e73f296` | Foundation + Cloudflare + Responses + key runbook |
| shared | `codex/cloudflare-cicd` | `5b2dcfe` | Infrastructure history; fully contained in main |
| shared | `codex/product-delivery` | `026f710` | Initial container delivery; fully contained in main |
| shared | `dev/computer-c` | `ec95912` | Authoring/review; 1 branch-only and 10 main-only commits |
| shared | `codex/chaos-experiment-agents` | `e3b692a` | Includes C, chaos and self-update; 6 branch-only and 10 main-only commits |
| ci-performance | `main` | `e228efd` | Older local main; not the delivery source of truth |
| ci-performance | `codex/ci-speed-capacity` | `974ed8b` | CI consolidation, capacity probe and measured report; contains `e73f296` |

## Branch-specific documents and limits

Read a pinned revision in the corresponding repository without switching a teammate's checkout:

```bash
git show ec95912:docs/PHASE2-C.md
git show ec95912:docs/PHASE2-C-VISUAL-REVIEW.md
git show e3b692a:docs/CHAOS-AGENTS.md
git show e3b692a:docs/SELF-UPDATE.md
# In NxtCommit-ci-performance:
git show 974ed8b:docs/cicd/PERFORMANCE.md
```

Each document above has a `.zh-TW.md` counterpart.

- C: repository analysis, campaign drafts, reviewability, review persistence, operations and frontend pages. Its handoff reports eight C browser journeys passing, with 14 visual comparisons still failing/pending approval. It needs B's real execution evidence and a single mission authority.
- Chaos: 17 controlled-fault scenarios and sequential advisory roles; not a deployed mission-agent fleet.
- Self-update: bounded local frontend updates, default off and demo locked. Branch documentation records live local verification, but generated release snapshots are outside Git source. This is not a Cloudflare rollout claim.
- CI performance: reports individual application CI samples of 68→59 seconds, contracts 41→26 seconds and 720 read-only warm requests. These are not sustained-load, LLM or integrated-product capacity evidence. The latest local branch differs from cached remote `5400dbc`; identify `974ed8b` explicitly in handoff.

## Cached A/B remote references


| Ref | SHA | Read without checkout |
| --- | --- | --- |
| `origin/dev/computer-a` | `24b211f` | `git show 24b211f:docs/PHASE2-COMPUTER-A.md` |
| `origin/dev/computer-b` | `e6057bd` | `git show e6057bd:docs/PHASE2-COMPUTER-B-HANDOFF.md` |
| B coverage | `e6057bd` | `git show e6057bd:docs/PHASE2-COMPUTER-B-COVERAGE.md` |

A/B are not local branches in the JSON inventory. Fetch and recheck SHAs/handoffs before integration; cached references are not treated as merged features here.

## Refreshing the snapshot

At material handoffs rerun `git branch -vv`, `git worktree list`, `git rev-list --left-right --count main...BRANCH` and compare full trees using `git ls-tree -r BRANCH`. Counts apply only to the pinned baseline above; subsequent documentation commits also change ahead/behind. This newly added inventory does not exist in the inventoried baseline trees.

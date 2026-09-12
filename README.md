# NxtCommit

[繁體中文](docs/README.zh-TW.md) · [Collaboration guide](docs/COLLABORATION.md) · [Branch inventory](docs/BRANCHES.md)

NxtCommit explores turning contributed AI compute into reviewable open-source work.
This repository is being reconstructed by separate A/B/C and delivery workstreams.
A feature present on a local branch is not automatically integrated or deployed.

At the documentation baseline `e73f296` (2026-09-12), main contains the TypeScript
foundation, bilingual shell, SQLite lifecycle, Cloudflare delivery and a bounded
OpenAI Responses client. Product routes remain placeholders; A/B/C product work
is inventoried separately. The last recorded serving revision is `19ed079`;
[deployment checkpoints](docs/cicd/CHECKPOINTS.md) own the evidence.

## Start locally

Use Node 24.x, npm and uv. Python only validates YAML specifications.

```bash
npm ci
uv sync --locked
npm run dev
```

Web: http://localhost:5173. API: http://127.0.0.1:4177.
For optional server credentials, create `.env` from `.env.example` only if it does
not already exist. Never commit it or put a key in `VITE_` variables.
See [development](docs/DEVELOPMENT.md) for checks and separate worktree state.

## Find the right document

| Need | Read |
| --- | --- |
| First contribution, ownership, merge and handoff | [Collaboration](docs/COLLABORATION.md) |
| What exists on each branch | [Branch snapshot](docs/BRANCHES.md) |
| Current commands and configuration | [Development](docs/DEVELOPMENT.md) |
| Shared foundation contracts | [Phase 1](docs/PHASE1-FOUNDATION.md) |
| Deploy, monitor, rollback and timed shutdown | [Cloudflare runbook](docs/cicd/RUNBOOK.md) |
| OpenAI setup, key replacement and spend alerts | [OpenAI runbook](docs/cicd/OPENAI.md) |
| Judging evidence and operational history | [Checkpoints](docs/cicd/CHECKPOINTS.md) |
| Full topic index and historical references | [Documentation map](docs/COLLABORATION.md#documentation-map) |

Cloudflare uses one basic container with ephemeral SQLite and a two-hour idle
sleep. The requested cutoff is **2026-09-13 01:00 Asia/Taipei**. Workers Paid
remains active; application shutdown does not cancel that subscription.

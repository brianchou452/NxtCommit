# Development

[繁體中文](DEVELOPMENT.zh-TW.md) · [Collaboration](COLLABORATION.md)

Baseline: main `e73f296`. Branch-specific commands belong to that branch's
package.json and handoff. Historical CommonCommit worker, seed and sandbox
commands do not apply to this foundation.

## Install and run

Use Node 24.x, npm and uv. Browser verification additionally requires a working Docker daemon.

```bash
npm ci
uv sync --locked
npm run dev
# Production-style local run:
npm run build
npm start
```

Web defaults to 5173 and API to 4177. The `/api` proxy in `vite.config.ts` is pinned to 4177; update the proxy when changing the API port.

`.env` is optional and ignored; do not overwrite an existing file. Each worktree needs its own `.env`, `var/`, dependencies and build output. Shared Git history does not share configuration or databases.

| Variable | Default | Scope |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | API bind address |
| `PORT` | `4177` | API port |
| `VAR_DIR` | `var` | Local SQLite directory |
| `EXECUTION_MODE` | `auto` | Foundation refuses execution until a runner is integrated |
| `RUN_DISPATCH_MODE` | `inline` | Other modes fail startup |
| `OPENAI_API_KEY` | unset | Server-only Responses credential |
| `OPENAI_MODEL` | `gpt-5-mini` | Bounded Responses client |

See the [OpenAI runbook](cicd/OPENAI.md) for permissions, rotation, Cloudflare injection and verification. Configuring a key does not connect every product AI feature.

## Verification before handoff

```bash
npm run check
npm run lint:spec
npm run test:spec-tools
npm run check-version
npm run test:e2e
# Separate visual comparison; preserve approved baselines:
npm run test:visual
git diff --check
```

Select checks appropriate to the change. Documentation-only edits require link, bilingual and diff checks; never report tests that were not run as passing. Report TODO/skip and visual differences separately; do not update approved screenshots to hide failures.

Image changes update Makefile VERSION, the k8s nonprod newTag and bilingual CHANGELOG together, followed by the version check. Documentation-only changes need no image bump.

SQLite lives under VAR_DIR; replacing a container may lose cloud ephemeral state. Demo reset mutates data, so target only your own test instance. See [collaboration](COLLABORATION.md) for evidence and handoff fields.

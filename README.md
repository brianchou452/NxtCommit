# NxtCommit

[繁體中文](docs/README.zh-TW.md) · [Collaboration](docs/COLLABORATION.md) · [Branch inventory](docs/BRANCHES.md)

For local Chaos Agent / Experiment Agent runs and iteration evidence, see [the agent runbook](docs/CHAOS-AGENTS.md).

Main integrates the A/B/C product slices with the existing Cloudflare delivery.
React/Vite and Node 24 / Express / SQLite implement the product; Python validates
YAML specifications. See the [Phase 3 evidence](docs/PHASE3-INTEGRATION.md).

## Start locally

```bash
npm ci
uv sync --locked
npm run dev
```

Web: http://localhost:5173. API: http://127.0.0.1:4177. Open `/demo` for the
maintainer or provider walkthrough. The maintainer creates a duration fixture
campaign, funds it, runs actual fixture tests and reviews the persisted diff.
Marketplace, profiles, comments, voting, reset and recovery share the same state.

Mission intelligence is scripted; tests, diffs and local accounting are real.
Public GitHub import is read-only metadata. Optional assistance retains generator
and fallback labels. No authentication, payment, arbitrary repository execution
or upstream publication is implemented. Create a local `.env` only if one does
not already exist; keep keys server-only. Read [development](docs/DEVELOPMENT.md)
and the [OpenAI runbook](docs/cicd/OPENAI.md) for API permission differences.

`npm run test:e2e` runs all interactive journeys in pinned Docker Chromium.
`npm run test:visual` compares all 40 approved references; their outstanding
mismatches remain a failed gate. `bash scripts/phase4-gate.sh` runs both.

## Delivery and collaboration

Cloudflare uses one basic container, ephemeral SQLite and two-hour idle sleep.
The production image includes both bundled fixtures and Git for measured diffs.
Existing OpenAI-only egress is preserved: cloud product advice uses labelled
fallbacks, and GitHub metadata import needs the local server's network access.
A Responses probe does not verify Chat Completions assistance.

The mandatory cutoff remains **2026-09-13 01:00 Asia/Taipei**; Workers Paid
remains active. A main push triggers CI and deployment, whose serving SHA must
be verified separately. Source integration is not a deployment receipt.

| Need | Read |
| --- | --- |
| Ownership and merge workflow | [Collaboration](docs/COLLABORATION.md) |
| Historical branch snapshot | [Branches](docs/BRANCHES.md) |
| Integrated behavior and verification | [Phase 3](docs/PHASE3-INTEGRATION.md) |
| Approved screenshot differences | [Visual review](docs/PHASE3-VISUAL-REVIEW.md) |
| Deploy, monitor, rollback and cutoff | [Cloudflare runbook](docs/cicd/RUNBOOK.md) |
| Serving revision and operational evidence | [Checkpoints](docs/cicd/CHECKPOINTS.md) |

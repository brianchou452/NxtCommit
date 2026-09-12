# NxtCommit

[繁體中文](docs/README.zh-TW.md)

The A/B/C slices are integrated on `codex/dev-spec-integration`. Frontend and
backend use TypeScript with browser-safe contracts in `shared/`; Python validates
YAML specifications. See the [Phase 3 evidence ledger](docs/PHASE3-INTEGRATION.md).

```bash
npm ci
uv sync --locked
npm run dev
```

Use Node 24.x. Open `/demo` to start a maintainer or provider walkthrough. The
maintainer path analyzes the bundled duration fixture, creates a local campaign,
funds it, runs actual fixture tests and presents the persisted diff for local
review. Home, Marketplace, profiles, comments, voting, reset, recovery and the
standalone design concepts have bilingual controls.

Mission intelligence is scripted; tests, diffs, local accounting and persistence
are real. Public GitHub import is metadata-only. Optional model assistance keeps
its generator/fallback labels. There is no authentication, payment, arbitrary
repository execution or upstream publication. This integration does not deploy.

`npm run test:e2e` runs all interactive journeys in pinned Docker Chromium.
`npm run test:visual` compares all A/B/C approved references. Historical visual
mismatches remain a failed gate and never authorize replacing approved PNGs.
`bash scripts/phase4-gate.sh` runs the complete delivery gate.

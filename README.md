# NxtCommit

[繁體中文](docs/README.zh-TW.md)

This checkout contains the Phase 1 foundation and Computer A / Phase 2 Home/community. Both frontend and
backend use TypeScript and import browser-safe contracts from `shared/`.
Python is used only to validate YAML specifications.

See the [Phase 2 handoff](docs/PHASE2-COMPUTER-A.md) for ownership, reproducible
verification and remaining integration gates. The [foundation handoff](docs/PHASE1-FOUNDATION.md) records the earlier checkpoint.

```bash
npm ci
uv sync --locked
npm run dev
```

Node 24.x is required. Home, Marketplace, local profiles, comments, category votes,
reset and guided launch/recovery are implemented with bilingual controls. Run
`npm run test:e2e` for Docker interactive verification. B/C execution and authoring
remain unintegrated; no runner or model call is installed. Approved visual PNGs
remain unchanged, so full Phase 2 verified is not claimed.

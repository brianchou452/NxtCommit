# NxtCommit

[繁體中文](docs/README.zh-TW.md)

This checkout is the Computer A / Phase 1 shared foundation. Both frontend and
backend use TypeScript and import browser-safe contracts from `shared/`.
Python is used only to validate YAML specifications.

See the [foundation handoff](docs/PHASE1-FOUNDATION.md) for setup, ownership,
verification and the explicit Phase 2 boundaries.

```bash
npm ci
uv sync --locked
npm run dev
```

Node 24.x is required. Product routes are placeholders inside the functional
bilingual shell. No execution runner, model call or complete product workflow is
installed. The approved visual golden is preserved; its known mismatch is recorded
in the handoff.

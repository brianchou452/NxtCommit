# Assurance delivery evidence — 2026-09-12

## Source and runtime ownership

Specs: api.assurance, api.assurance-run, page.assurance. App wiring installs
AssuranceController; Cloudflare entry explicitly enables it and the gateway cron
awaits POST /api/assurance/run. ExperimentAgent owns deterministic full-catalog
measurement and assessment; Assistance owns labelled model advice. The React
page polls persisted snapshots. No central registration work remains.

## Verification before rollout

- npm run check: typecheck, 159 tests and production build passed.
- 130 specs: zero contract errors and zero missing test files.
- Worker tests: 10 passed; dry-run bundle passed.
- Integrated browser journeys: 40 passed, including the new bilingual/mobile
  assurance terminal journey. Manual browser inspection confirmed the new page.
- Full phase4 gate: visual comparison fails on the existing 40 golden comparisons.
  Main already records 40/40 differences in AGENT-MAIN-INTEGRATION.md. Goldens were
  not rewritten or auto-approved; the new navigation also intentionally changes
  the shell. No full visual-gate success is claimed.
- Local live run 75a787bf-6ddf-48a7-9204-9268c632afc0: 38/38 checks, four provider
  attempts, two model responses and two explicit timeout fallbacks; 1,494 known
  tokens. Local evidence does not establish cloud model success.
- A private backup of the shared demo database was saved before redeployment.

## Scope limits

The loop iterates on model hypotheses and measured regressions. Cloud source
repair, arbitrary-repository execution and automatic promotion remain disabled.
Reports are ephemeral across container replacement. Source code, prompts and
private reasoning are not published as activity. Actual scheduled run IDs and
serving commit must be added after deployment; source configuration alone is
not a running-agent claim.

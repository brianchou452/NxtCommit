# Delivery checkpoints

## CP-001 — Requirements and initial workspace / 2026-09-12

User authorized GitHub → Cloudflare CI/CD, an ianjuan.com subdomain, and checkpoint evidence for hackathon judging. Initial Hackthon directory had an empty Git repository, no remote or source. Initial planning records remain in that workspace; this repository now holds the implementation record.

## CP-002 — Cloudflare read-only verification / 2026-09-12

Token verification returned active. Account listing and ianjuan.com zone query succeeded; zone status was active and its owning account was identified. No write permissions, DNS change, deployment or token rotation were established by these checks. Credential values are excluded from this record.

## CP-003 — Correct repository / 2026-09-12

User supplied NxtCommit. Confirmed remote brianchou452/NxtCommit, main at e60996320699133f8b64eb11b0ac85a2a7cd7b18, clean worktree and no product source/package/CI configuration. Read AGENTS.md and relevant contracts. Referenced root maintainer/operations/security/reality documents were absent. Existing contracts mention SQLite and process execution; full application hosting remains a runtime integration task. Created codex/cloudflare-cicd without changing main.

## CP-004 — GitHub identity / 2026-09-12

CLI credential helper had no GitHub credential. Connector identity ian-juan_tmemu had pull=true, push=false. User requested personal account ianjuantw@gmail.com. GitHub Desktop was already signed in as ianjuantw; Safari showed push access and an accessible Actions secrets page. Created CLOUDFLARE_API_TOKEN through the authenticated repository UI; GitHub confirmed “Repository secret added.” No connector identity switch is claimed.

## CP-005 — Implementation and local verification / 2026-09-12

Added CI, serialized main-only deployment, custom-domain collision preflight, revision smoke verification, infrastructure Worker and bilingual handoff. Updated inherited GitLab/Argo statements to match the user's Cloudflare choice. Product-source guard prevents accidental placeholder releases after application code appears.

Verified locally: 125 spec schemas passed; 13 referenced product test files are absent and explicitly reported. Three infrastructure behavior tests passed. Wrangler 4.131.1 dry-run succeeded. npm audit reported zero vulnerabilities. Node 22.23.2 was downloaded from nodejs.org and its archive verified against official SHA256 checksums.

## Pending checkpoints

| ID | Completion evidence | Status |
| --- | --- | --- |
| CP-006 | Account variable saved, branch published and GitHub CI run linked | In progress |
| CP-007 | main deployment run, Cloudflare version and HTTPS matching receipt | Pending |
| CP-008 | Actual framework/runtime integrated; product test and readiness evidence | Awaiting product source/stack |
| CP-009 | Rollback drill with restored serving revision | Not executed |

Each subsequent entry must include time, change, verification, result, evidence link and unresolved work. A configured secret or green contract check is not proof of a deployed product.

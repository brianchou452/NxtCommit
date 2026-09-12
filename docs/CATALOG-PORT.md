# commoncommit catalog import

[繁體中文](CATALOG-PORT.zh-TW.md)

The existing NxtCommit Discover and mission routes now expose all 25 repository
projects and 25 fundraising missions authored in local commoncommit revision
`a52346519fa7258a56ec39f70212b243d599e833`. Stable mission IDs use `catalog-{slug}`.
The source snapshot retains bilingual titles, taglines, stories, acceptance
criteria, milestones, tags, risks, repository metadata, history and community
notes. Repository URLs and every narrative field were independently compared
against the source extraction: 25/25 matched.

Projects: ms, node-csv, cosign, quick-lru, yaml, ky, marked, redis-mock, jose,
globset, localsend, pdfjs, tesseractjs, mermaid, scrcpy, immich, homeassistant,
excalidraw, whisperx, jellyfin, ollama, langgraph, deno, supabase and bun.

## Persistence and provenance

`server/persistence/catalog.ts` performs one additive SQLite transaction, marked
by `commoncommit-catalog-v1`. Repeated startup does not duplicate records or
replace current wallets, pledges, notes or profiles. Legacy Home-only duplicate
cards are hidden from discovery; their routes and existing receipts survive.
Actual B missions remain visible even when their project name matches a catalog
project. Existing B services remain the sole pledge and ledger authority.

Source personas have separate `catalog-` identities. Authored aggregate pledges
without individual records become one clearly named demo community pool, while
the authored backer count is retained separately. node-csv's stale source total
2300 is normalized to its actual pledge/ledger sum of 2900. YAML and ky's authored
consumption totals lack source consume rows; explicit snapshot ledger rows record
the missing 610 and 980 credits at the fixed capture time. Receipt consumption is
allocated only to pledges that existed when each consume row was recorded, so
new supporters never inherit past consumption.

Popularity, maintainers, amounts, milestones, releases, adoption, run history and
patches are source demo content. Public repository links are retained, without
claiming fresh GitHub verification. Historical runs and patches live in the
read-only catalog section, never as live engine evidence. Imported repository
workspaces are `none`; prototype pledges work, but they do not run repositories
or open upstream changes. A new pledge can resume a stalled catalog campaign.
Current My Commitment receives new pledge receipts through the existing service.

The offline extractor `scripts/imports/commoncommit-catalog.mjs` evaluates only
allowlisted source modules with in-memory stores and fixed time. It does not
contact providers, mutate the source database or invoke source execution.

## Design review and verification

The existing mission layout, shared tokens, locale dictionaries, navigation and
current main's secondary-page styles are preserved. Source catalog content adds
repository facts, risks and expandable historical evidence. Visible demo labels
explain the origin of figures and histories. Original approved goldens remain
unchanged: these intentional content additions are not golden equivalence claims.
The imported mobile baseline does not cover these new catalog sections; browser
checks exercise Chinese content at 390 px and horizontal overflow explicitly.
Desktop and mobile screenshots are recorded by `e2e/catalog.e2e.spec.ts`.

Server tests cover all 25 missions, ledger consistency, non-executable imports,
idempotent upgrade, prior data retention, pledges, replay, restart, reset and
historical consumption isolation. Browser tests cover discovery to details,
repository navigation target, bilingual content, pledge to My Commitment and
mobile layout. Stream regression coverage ensures a slow subscriber removed
before its asynchronous close cannot crash subsequent invalidation delivery.
Production deployment is additive; do not reset the live demo to install this
catalog. Take the existing operator backup before rollout and verify the serving
commit through `/__deployment` afterwards.

Design checklist outcome: relevant seed/page contracts and source goldens were
reviewed; Home order is unchanged. Added sections inherit the existing canvas,
typography, spacing and cards, with no new semantic colors or diagrams. Existing
repo diagrams remain the current main implementation; this content import does
not claim a diagram redesign. Demo provenance and execution limits are visible.
Desktop Mermaid and 390 px Chinese LocalSend screenshots were inspected; new
content wraps without page overflow. The catalog browser journey also uses
reduced motion and keyboard activation of the history disclosure. Mobile visual
baseline not covered. Contract lint passed for 132 specs with zero errors.

Local validation on this release: typecheck and production build passed; 171
server tests and 50 foundation/product browser tests passed. The import and
regressions are covered by `server/catalog.test.ts`, `server/global-stream.test.ts`
and `e2e/catalog.e2e.spec.ts`. Deployment and HTTPS identity are checked separately.

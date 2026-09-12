# My Commitment integration

[繁體中文](MY-COMMITMENT-PORT.zh-TW.md)

The existing NxtCommit contributor page now carries commoncommit's complete profile presentation. The destination is the existing `/contributors/:id` route and Cloudflare application, not a separate site or database.

Source: commoncommit `a52346519fa7258a56ec39f70212b243d599e833`, `src/pages/Profile.tsx`, `src/components/BadgeShelf.tsx`, achievement primitives and server rules. Target baseline: NxtCommit `397adcd`, reconciled with main `df9462c` (Agent Lab navigation). Worktree owner: this integration, branch `codex/my-commitment-port`.

## Behavior and data

- Identity/avatar, wallet, pledged credits and reputation retain the existing local persona. Five impact cards distinguish unmeasured history from zero.
- All 13 badge definitions are bilingual; the shelf sorts earned entries first by earliest date, with tier borders, category accents, lock descriptions and earned dates. Achievement cards group repeated awards and show the most recent date.
- Receipts link the actual mission and display pledge, consumption, refund, review artifact, local release and optional labelled adoption. Pledge history links the same mission, with status, credits and relative date.
- Initial skeleton, 404 recovery, network retry, render-error recovery and three empty sections are retained. Shared SSE mission updates and reconnects refetch the profile. Both languages and responsive layout use the existing shell.
- The mission service remains the only wallet/ledger authority. The profile reads its detail port, allocates whole consumed credits deterministically, and sums assigned refunds even before approval. Mixed legacy/measured history explicitly marks totals as partial. Reading a profile writes no awards or accounting rows.
- Pledge awards derive from persisted pledge order, goal crossing, UTC time and project breadth. Release awards require a recorded release/award date. Documentation requires a changed artifact path; AI Architect requires an actual LLM/Codex run. Legacy `ship` becomes `ship_it`. The integrated `usedByYou` projection only means backed-by-you, so it cannot prove a dependency.
- NxtCommit has no measured release adoption feed or upstream release publishing. Unknown adoption, unmeasured seed accounting and missing release versions remain absent; the source project's demonstration figures are not copied. Existing recorded local demo release/award provenance remains visible. This is a presentation and read-model integration, not new authentication, payment or independent backend infrastructure.

## Design review

Reviewed design-system YAML, contributor page/component/API/visual contracts and both imported contributor goldens before implementation. The component/API contracts now describe the full catalog, five stats and stream behavior.

Canvas, typography, semantic colors, card radius and shadows use NxtCommit tokens. Desktop gutters are 24px; compact profile section spacing follows the source profile. Earned tier borders and category icon colors are independent. The desktop hierarchy is identity → stats → shelf → achievements → receipts → pledges. The existing shell/home/diagrams are outside the page change.

Desktop captures are compared with the imported source golden structurally. Persona, recorded stats, award counts, shell and provenance deliberately differ because the target seed/backend differs; the original golden remains unchanged, and exact pixel baseline acceptance is not claimed. Mobile visual baseline not covered: a fresh 390px Traditional Chinese capture and functional overflow/keyboard checks provide current evidence, not an approved mobile oracle. Reduced motion is exercised by the Docker browser configuration.

## Validation and delivery

Docker's pinned Node 24 environment is the verification authority. The first application run passed typechecks, production build and 168 server tests; initial browser checks identified an SSE-aware failure fixture and a translated-label assertion that needed updating. The host-only run could not load better-sqlite3 because npm blocked its installation script; Docker explicitly rebuilds it and passes those tests.

Final test and delivery evidence is recorded in the PR/handoff. Desktop/mobile screenshots are retained in the Docker test artifacts. Production publication requires the existing CI gate, an operator backup, and independently matching HTTPS `/__deployment` SHA. Cloudflare still uses ephemeral SQLite; a backup is an offline recovery copy, not automatic restore. Rollback is a prior verified application revision through the same workflow.

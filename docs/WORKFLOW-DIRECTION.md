# Review-informed repo workflows

> Historical record: the homepage concept section was removed at user request in v0.7.26. The implementation and verification below describe v0.7.25.

The homepage now presents two separate loops: correction of the current task,
and evolution of a repo-specific workflow. Its nine-step interactive concept
connects workflow, RCA/impact, acceptance, code, tests, review, correction,
workflow update and the next issue.

A task-specific color comment is not a permanent policy. The keyboard example
shows a proposed rule with its comment source, repo/form scope, version and
executable acceptance requirements. Playback never confirms a rule. A separate,
explicitly simulated maintainer action advances the example to v2 and shows how
the next issue inherits a gate. Reset returns the illustration to v1.

This is a presentation implementation, not PR-reply ingestion or a rule engine.
No production policy is saved by the confirmation button, no authenticated
maintainer action is claimed, and no keyboard gate is installed into an imported
repository. Connecting authenticated PR feedback, immutable policy history and
engine-owned future-task gates remains product implementation work. The page
states this boundary. Existing Agent Lab execution evidence remains separate.

Verification: bilingual dictionary/type/build checks and the browser journey
cover explicit keyboard activation, pending versus confirmed state, reset,
Chinese navigation and mobile overflow. Existing approved visual goldens are
not rewritten for this redesign.

## Deployment verification — 2026-09-12

Cloudflare serves `aa64fed092f9ca1fe2bb9c29c80d20331dcacd17` (v0.7.25).
[Release](https://github.com/brianchou452/NxtCommit/actions/runs/34679340626)
passed 166 server and 48 browser tests. Independent HTTPS and browser checks
confirmed the new homepage and playback stopping before simulated confirmation.
Post-deploy assurance `d2b6eea2-98f6-43cb-b0d4-8df5d24bfba3` passed 38/38
checks with four real provider calls and 1,878 reported tokens. This verifies
presentation deployment and assurance execution, not PR-driven rule enforcement.

# GitHub source workspaces

[繁體中文](GITHUB-WORKSPACES.zh-TW.md)

The `/github` page adds a separate authenticated source workflow. Existing
`/api/analyze` metadata analysis and fixture mission execution retain their bounds.
This implementation has not been deployed or tested against a real writable repository.

## User flow

1. Connect a repository-scoped GitHub fine-grained token. Grant Contents and Pull
   requests write plus Checks read. `/user` establishes the workspace owner;
   repository push permission is checked before funding or remote writes. Only
   public repositories are supported; fork creation is not implemented.
2. Download a commit-pinned Git tree and its blobs through GitHub's Git Database
   API. Every downloaded blob is checked against its Git SHA. This is a source
   snapshot, not a Git-history clone. Inspect files, byte counts and package
   dependencies. Truncated trees, submodules, unsafe paths and exceeded limits
   fail rather than silently becoming complete analyses. Binary/sensitive content
   is not shown or sent to the model; upstream blobs remain unchanged.
3. Enter a bounded task and commit prototype credits. This creates a linked local
   funding record and a `nxtcommit/<workspace-id>` branch with a planning document.
   GitHub requires a difference to create a PR, so the initial planning commit
   precedes the draft PR. Credits are local demo accounting, not provider billing.
4. The server performs one bounded Responses call and independent baseline/final
   Docker tests. It validates full-file changes to at most eight existing source
   files. Existing tests, dependency manifests, locks and CI are protected.
   Only a verified patch is committed to the same draft branch, without force.
5. The server checks the configured GitHub Actions check names on that exact head
   commit, rechecks the PR head, and marks that PR ready for review. It polls every
   10 seconds for at most 15 minutes. Failure preserves the draft. Resume retries
   unfinished stages without duplicating the pledge or PR; a failed model run
   requires an explicit retry and may incur another model call.

## Local configuration

Use a single local Node server with a persistent `VAR_DIR`, Docker access and the
existing server-only `OPENAI_API_KEY` / `OPENAI_MODEL` configuration. Set
`GITHUB_WORKSPACES_ENABLED=1` and `GITHUB_REQUIRED_CHECKS=test` (comma-separated
exact check names). The runtime needs the pre-pulled `node:24.19.0-bookworm-slim`
image. Do not enable this in the current Cloudflare container: it has no verified
Docker execution boundary. A configured key is not live provider evidence.

Verification currently supports dependency-free Node `.test.js`, `.test.mjs`,
`.test.cjs` (and `.spec.*`) suites. It does not install dependencies or interpret
package scripts. Other languages or dependency-requiring projects stop with a
recoverable failure. Both baseline and final must contain tests; final must pass
with no count regression. This is suite evidence, not proof of every criterion.

Limits: 3,000 tree entries, 500 KB per blob, 10 MB total; 80,000 characters of
model context, eight edited files and 60 KB of model changes. Docker uses no
network, no passed credentials, a read-only workspace and root filesystem,
non-root UID, dropped capabilities, process/memory/CPU limits and a 60-second
verification timeout. Untrusted repository code is never executed on the host.

GitHub tokens are held only in process memory behind one-hour HttpOnly,
SameSite=Strict sessions. HTTPS cookies are Secure. Use HTTPS outside localhost.
Workspace ownership is checked on every read/mutation. Tokens are not persisted;
disconnect or session expiry prevents further remote writes; restart requires reconnecting the same GitHub account. Interrupted execution is
marked failed; saved verified changes and remote branch/PR identities support
resume. Only a single application process may operate on the database. This is
not a multi-tenant production service, payment system, merge or release service.

Demo reset is refused once GitHub funding records exist, to avoid erasing the provenance of an external PR. Workspace funding uses the user-selected prototype allocation, not a provider-price estimate.

## Verification

- `npm test -- server/github-workspaces.test.ts server/i18n01-parity.test.ts`
  checks ownership, origin rejection, immutable blobs, protected paths,
  interrupted PR creation, idempotent pledge/PR and exact-head CI gates.
- `npm run test:e2e:github` runs the real UI/server/database/Responses adapter and
  real disposable Docker verification containers. GitHub and Responses transport
  use authored test responses. It checks the complete successful lifecycle,
  failed CI/retry, failed model patch, denied permission and truncated import.
- `npm run test:e2e -- --project=github` uses the offline browser container and a
  test-only fixture verifier; it is not evidence of nested Docker isolation.

The production adapter uses the [GitHub Git Database API](https://docs.github.com/en/rest/git/trees),
[GitHub pull requests](https://docs.github.com/en/rest/pulls/pulls), and the
[Responses API](https://developers.openai.com/api/docs/guides/text).

## Integration verification — 2026-09-12

Integrated with main `ad026e1` at source version `0.7.24`, preserving Agent Lab, model cancellation, bounded provider responses and protected demo reset. Verification passed: 163 backend tests, 45 browser scenarios, 5 real-Docker workspace journeys, typecheck/build, 131 specs and version/whitespace checks. One upstream smoke test initially timed out under concurrent load; its targeted and full-suite reruns passed. These are local results, not live GitHub write or deployment evidence.

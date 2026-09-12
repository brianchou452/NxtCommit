# GitHub delivery operations and incident record

> **NxtCommit hackathon scope (2026-09-12):** The material below was imported as historical CommonCommit reference. This repo currently delivers an infrastructure-only Cloudflare Worker; its active runbook is [Cloudflare delivery](cicd/RUNBOOK.md) and its evidence is [checkpoints](cicd/CHECKPOINTS.md). The historical GitLab/Argo results below do not establish a NxtCommit deployment.

[繁體中文](GITHUB-OPERATIONS.zh-TW.md)

This is the shared runbook and historical record for the real GitHub delivery
path. It is written for developers and their coding agents. `DEPLOYMENT.md` owns
the broader Kubernetes runbook; `GOTCHAS.md` preserves stable incident lessons.

## Current delivery contract

```text
GitHub main (source of truth)
  → GitHub Actions stages the exact commit on GitLab delivery-candidate
  → GitLab test verifies the tree and build:image publishes the immutable image
  → only after success, GitHub fast-forwards GitLab main with CI skipped
  → Argo CD observes main, runs PreSync, reconciles nonprod, then runs PostSync
  → PostSync readiness + serving build identity and Argo status prove the rollout
```

No GitHub push directly calls Argo CD. The protected ingress intentionally returns
Cloud Armor `403` to some shared runners, so deployment verification now runs as
an in-cluster Argo PostSync hook. GitHub and GitLab report candidate verification,
immutable-image delivery and main promotion; Argo and the hook report deployment
truth. A failed candidate never changes the branch Argo watches.

## One-time mirror credential

`GITLAB_PUSH_TOKEN` must be a GitLab **project-scoped access token** for the target
mirror project with:

- `write_repository`, to stage `delivery-candidate` and fast-forward `main`;
- `read_api`, to locate the matching pipeline and inspect `test` and
  `build:image` job results.

Store it without putting the value in command history:

```bash
read -rsp 'GitLab project token: ' COMMONCOMMIT_GITLAB_TOKEN
printf '%s' "$COMMONCOMMIT_GITLAB_TOKEN" | \
  gh secret set GITLAB_PUSH_TOKEN --repo ianjuantw/commoncommit
unset COMMONCOMMIT_GITLAB_TOKEN

gh secret list --repo ianjuantw/commoncommit
```

The list command confirms only the secret name and update time. It cannot recover
the value. Never paste a token into chat, issues, screenshots, documentation,
shell arguments, CI logs, or commit history.

### Security action from this work session

On 2026-08-09 a GitLab token value was pasted into a chat while troubleshooting.
The value is intentionally not reproduced here. Treat it as exposed until its
revocation and replacement are confirmed in GitLab, then update the GitHub secret
through stdin as shown above. A statement that the channel is “safe” does not
change the credential's exposure status.

## Normal push and evidence ladder

Use the configured author identity, verify the tree, then push GitHub `main`:

```bash
git config user.name 'Ian Juan'
git config user.email 'ianjuantw@gmail.com'
git status --short
git push origin main
```

Observe each layer separately:

```bash
# 1. GitHub acquired a runner, built the candidate, and promoted GitLab main
gh run list --repo ianjuantw/commoncommit --workflow mirror-to-gitlab.yml --limit 5
gh run watch RUN_ID --repo ianjuantw/commoncommit --exit-status
gh run view RUN_ID --repo ianjuantw/commoncommit --log-failed

# 2. Argo CD has reconciled the intended revision and is healthy
argocd app get commoncommit --grpc-web -o json

# 3. Inspect image availability and exact-build verification hooks
argocd app logs commoncommit --grpc-web --kind Job \
  --name commoncommit-image-preflight
argocd app logs commoncommit --grpc-web --kind Job \
  --name commoncommit-rollout-verification

# 4. The endpoint is serving the expected bytes
curl --fail 'https://commoncommit.tw.portal.bi.test.shopee.io/metrics' \
  | grep '^commoncommit_build_info'
```

Do not collapse these into one signal:

| Evidence | Proves | Does not prove |
| --- | --- | --- |
| GitHub delivery job green, with a candidate pipeline URL | GitLab test passed, the immutable image exists, and GitLab main was fast-forwarded to that exact commit. | Argo finished rollout or the endpoint serves it. |
| GitLab pipeline green | GitLab verified/built the mirrored tree. | GitHub is current or Argo serves the image. |
| Argo `Synced` / `Healthy` | Desired Git revision is reconciled and Kubernetes health checks pass. | Public routing or the exact build identity without the metric. |
| `commoncommit_build_info` | The queried endpoint serves the reported version, commit, and source tree. | Which controller initiated the rollout. |

The last fully verified image rollout on 2026-08-11 was GitHub run
[`31409728473`](https://github.com/ianjuantw/commoncommit/actions/runs/31409728473),
GitLab pipeline
[`2748045554`](https://gitlab.com/sp-saas/tw/ops-bi/dpd/infra/commoncommit/-/pipelines/2748045554),
and live `v0.5.3` commit `1c28a5f` with healthy readiness and matching serving-build
identity. A later documentation-only run did not build or roll out another image.

**Current status, 2026-08-11.** GitHub run
[`31453429164`](https://github.com/ianjuantw/commoncommit/actions/runs/31453429164)
for source commit `99f2205` waited nearly two hours for a GitHub runner, then
reported the already-failed GitLab candidate pipeline
[`2749163703`](https://gitlab.com/sp-saas/tw/ops-bi/dpd/infra/commoncommit/-/pipelines/2749163703).
The GitLab test ran but failed four I18N-01 gates (one dropped qualifier, inline
locale branches/translations, and five dead keys). No image was built from that
commit and no rollout began. The current source remediation passes 21/21 static
parity checks; it still needs a new delivery run, Argo result, and serving-build
identity before it becomes deployment evidence.

## Incident and operation history

| Date | Observation | Cause / decision | Durable action |
| --- | --- | --- | --- |
| 2026-08-06 | Four mirror runs spent about 15 minutes each and executed no steps. | GitHub never assigned a hosted runner; workflow timeouts start only after acquisition. | A six-hour scheduled reconcile now catches a missed one-shot push. See G40. |
| 2026-08-08 | Historical GitHub checks were green in 5–16 seconds but GitLab remained behind. | `GITLAB_PUSH_TOKEN` was absent and push-triggered runs deliberately took a warning/skip path. | Delivery now fails closed for every event when the credential is absent; verify the secret name and require a GitLab pipeline URL. See G52. |
| 2026-08-08 | GitHub reported failure even though the new image was deployed. | GitLab's post-deploy endpoint observation received protected-ingress Cloud Armor `403` and was incorrectly treated as delivery failure. | The obsolete runner probe was removed: GitHub owns candidate + `test` + `build:image` + promotion; Argo PostSync owns rollout truth. See G55. |
| 2026-08-09 | `build:image` stayed pending; scheduler reported `0/8 nodes ... Insufficient cpu`. | Kubernetes runner defaults requested more CPU than any busy node could reserve, especially with Docker-in-Docker. | Set job/helper/service requests to `250m` / `50m` / `500m`. See G56. |
| 2026-08-10 | GitLab `test` appeared “running” for the full observer timeout while `build:image` remained `created`. | A runner had accepted the job, but its Kubernetes pod could still be Pending; status alone did not prove `npm` started. | Add bounded test/helper requests (`250m` / `50m`) and print both job traces on timeout. Pipeline `2745433764` then completed in 7m07s. See G56. |
| 2026-08-11 | Candidate pipeline `2747980634` timed out after 18 minutes: test finished in 4m06s, but the build pod never scheduled on any of eight nodes. | The former build/helper/dind reservation still totalled `800m`; runner acceptance was again not proof of pod admission. | Reduce only build/helper/dind requests to `100m` / `25m` / `125m` (250m total), retain no CPU limits, and preserve two-phase promotion so live stayed on the last verified image. See G56. |
| 2026-08-11 | Pipeline `2748199303` could not schedule even the 300m test pod on any of eight nodes. | Shared-runner capacity was below the repository's already-minimized test reservation; repository YAML could not create cluster capacity. | Escalate the scheduler evidence to the shared-runner owner; do not reduce the test below its measured working request merely to hide starvation. See G56. |
| 2026-08-11 | Run `31453429164` waited almost two hours for a GitHub runner, then failed quickly. | Pipeline `2749163703` had already executed and failed four I18N-01 checks in the source tree; the late GitHub observer exposed that result rather than causing it. | Move bilingual copy into locale dictionaries, restore the seeded-data qualifier, remove dead keys, and rerun the exact parity harness before another delivery attempt. See G58. |
| 2026-08-10 | Argo could see a new revision before its immutable image existed. | Git and registry visibility are independent; the PreSync image hook correctly waits rather than rolling out a missing tag. | Inspect the preflight Job and wait for image publication. Do not patch Argo or Kubernetes around the invariant. |
| 2026-08-10 | Every successful push left Argo progressing through most of the 7–9 minute CI build, then image-pull backoff could extend convergence. | GitHub mirrored directly to the branch Argo watched, so desired state was published before its required artifact. | Two-phase delivery builds `delivery-candidate` first and promotes `main` only after image success; superseded candidates are cancelled and PostSync verifies the serving identity. See G57. |
| 2026-08-10 | `kubectl` authentication failed while `argocd` commands still worked. | GKE/gcloud and Argo CLI sessions have separate credentials and expiry. | Use Argo CLI for Argo evidence; refresh gcloud only when Kubernetes access is actually needed. |
| 2026-08-10 | A private-repository URL produced a GitHub import error and was mistaken for a product failure. | The product supports unauthenticated public metadata only; a private probe tested an unsupported boundary. | Use `https://github.com/PrimeIntellect-ai/prime-agent` for the public integration test and keep private support explicitly out of scope. |

## Symptom guide

| Symptom | First checks | Correct response |
| --- | --- | --- |
| GitHub run has no steps or runner name | Open run metadata; look for runner-acquisition failure. | Re-run or wait for scheduled reconciliation. Workflow code cannot repair an unassigned hosted runner. |
| Delivery run is green but no candidate pipeline URL appears | Check whether GitLab main already had the commit; otherwise inspect credential setup. | An unchanged reconcile is an intentional no-op; a changed revision must show a candidate pipeline and promotion summary. |
| A manual runner probe receives endpoint `403` | Compare candidate `test` and `build:image`, then Argo PostSync and public metrics. | Do not restore the removed probe as a delivery gate or weaken Cloud Armor. |
| GitLab job says `running` but has no build/test trace | Inspect its trace and runner/Kubernetes scheduling message. | Treat accepted and started as separate states; adjust narrow job requests if scheduler evidence shows capacity pressure. |
| GitLab test has a real trace and fails I18N-01 | Reproduce `server/i18n01-parity.test.ts` on the exact commit and inspect every reported call site/key. | Fix the source-language contract; runner or Argo changes cannot turn a failed candidate into a deployable artifact. |
| Argo PreSync loops on image pull | Confirm GitLab main was not updated outside the two-phase workflow and inspect the immutable tag. | Repair or revert the bypassed promotion; normal delivery never exposes an unbuilt tag to Argo. |
| Argo PostSync fails | Inspect `commoncommit-rollout-verification` logs and compare readiness, version, and source tree. | Treat this as a deployment failure even if the image build was green; revert the Git release commit if it cannot be corrected safely. |
| Argo is healthy but site seems old | Query `commoncommit_build_info` through the exact public endpoint. | Compare version, commit, and source-tree values with the intended build. |
| GitHub import returns not found/private | Confirm the URL is a public repository and retry with the canonical public probe. | Do not add a secret merely to make an unsupported private-repo test pass. |

## Manual recovery

If GitHub cannot acquire a runner and the checkout has the authorized GitLab SSH
remote, preserve the same two-phase invariant manually. Never push an unbuilt
revision directly to GitLab main:

```bash
git fetch origin main
git fetch gitlab main
git log --oneline gitlab/main..origin/main
git push gitlab origin/main:refs/heads/delivery-candidate
# Wait for the delivery-candidate pipeline's test and build:image to succeed.
git push -o ci.skip gitlab origin/main:refs/heads/main
```

If either push is not a fast-forward, stop; do not force-push. Recovery does not authorize direct
Argo, Kubernetes, registry, or private GitLab history edits.

## Maintenance rule

Append material operational events here and add a stable GOTCHAS entry when the
lesson protects future code. Keep `GITHUB-OPERATIONS.zh-TW.md` synchronized. Do
not record token values, internal response bodies, or secret-bearing environment
output.

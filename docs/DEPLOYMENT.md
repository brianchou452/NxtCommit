# Deployment and operations

> **2026-09-12 LangGraph / Langfuse update:** Local agents now use persistent stage workflows and metadata-only monitoring. See [agent operations](AGENT-OPERATIONS.md) for recovery, replay protection, commands and limits. Demo controls and the serving static release remain independent.

[繁體中文](DEPLOYMENT.zh-TW.md)

This is the runbook for the supplied non-production Kubernetes configuration. The checked-in `Makefile`, Kustomize overlay, and `deploy/` templates contain environment-specific values. Review them before using this repository in another project or cluster; do not copy internal topology into public documentation.

There is no production target in this repository.

Choose one owner for a given environment:

| Owner | Use when | Persistent changes |
| --- | --- | --- |
| Manual `make deploy-nonprod` | No GitOps controller manages the workload | Apply and verify directly with Kubernetes |
| ArgoCD | An installed Application reconciles the overlay | Change Git; avoid direct fixes that self-heal will replace |

## Operational warnings

- SQLite and execution workspaces are stored on `emptyDir`. Every pod replacement, rollout, eviction, or node loss discards application state.
- The server keeps active execution controllers in process memory and supports one replica only. The Deployment therefore uses `Recreate`: a rollout has a brief outage, but never runs two independently writable databases or mixes a new SPA with an old API.
- The current sandbox is not safe for arbitrary third-party repository execution. Keep execution limited to bundled fixtures.
- The app has no user authentication or authorization. Limit network access to a trusted non-production audience.
- GitOps resources in `deploy/` are templates. Their presence does not prove they were installed in the surrounding platform repository.

## Release invariant

The deployable image version must match in three places:

1. `VERSION` in `Makefile`;
2. `newTag` in `k8s/overlays/nonprod/kustomization.yaml`;
3. the first released `## v...` entry in `docs/CHANGELOG.md`.

Verify before any build or deployment:

```bash
npm ci
npm run check
make check-version
git status --short
```

`make build` refuses image-relevant uncommitted files because its provenance labels describe `HEAD`. `make build-dirty` exists only for local iteration; never push or deploy that image.

## Prerequisites

The supplied targets expect:

- Docker with access to the configured image registry;
- Google Cloud CLI and Kubernetes credentials for the configured non-production cluster;
- `kubectl`, Kustomize support, and `make`;
- permission to create the namespace, secret, workload, and registry resources;
- server-side OpenAI and Langfuse credentials when deploying the configured `llm` mode.

Read the concrete target values from `Makefile` and the overlay rather than duplicating them in another document.

One-time workstation and registry setup:

```bash
gcloud auth login
make credentials
COMMONCOMMIT_IMAGE_REPO=$(awk '$1 == "IMAGE_REPO" { print $3 }' Makefile)
COMMONCOMMIT_REGISTRY_HOST=${COMMONCOMMIT_IMAGE_REPO%%/*}
gcloud auth configure-docker "$COMMONCOMMIT_REGISTRY_HOST"
make registry  # only when the configured repository does not already exist
```

The derived registry host is used only for Docker authentication; the Make targets continue to use their `IMAGE_REPO`, `PROJECT`, and `REGION` values. When porting the manifests, change or override those values together. These commands change remote cloud state, so confirm the selected account, project, cluster, and registry first.

## First deployment

The namespace must exist before the secret script runs.

```bash
COMMONCOMMIT_KUBE_CONTEXT=your-kube-context
kubectl --context "$COMMONCOMMIT_KUBE_CONTEXT" apply -f k8s/base/00-namespace.yaml
make secrets CONTEXT="$COMMONCOMMIT_KUBE_CONTEXT"
make build
make push
make deploy-nonprod CONTEXT="$COMMONCOMMIT_KUBE_CONTEXT"
```

`make secrets` reads `OPENAI_API_KEY`, `LANGFUSE_PUBLIC_KEY`, and `LANGFUSE_SECRET_KEY` from the process environment or the ignored local `.env`. The current helper sources `.env` as shell code and passes each value to `kubectl --from-literal`; it does not echo the values, but they can be visible to local process inspection while the command runs. Use only a trusted, self-authored `.env` on a trusted workstation. Replacing this path with stdin or a secret manager remains security hardening work.

Do not type credentials directly into commands or place them in committed manifests, CI logs, documentation, or chat transcripts.

## Routine manual deployment

Use this path only when the environment is not actively reconciled by ArgoCD:

```bash
COMMONCOMMIT_KUBE_CONTEXT=your-kube-context
npm run check
make check-version
make build
make push
make deploy-nonprod CONTEXT="$COMMONCOMMIT_KUBE_CONTEXT"
```

The target applies the non-production overlay, selects the matching image, and waits for rollout status. Because the workload uses `Recreate`, expect a brief non-production outage while the old pod exits and the new pod becomes ready. A successful rollout is not enough; verify the running build identity next.

## GitOps deployment

The repository includes templates for an external GitOps repository:

- `deploy/bi-portal-tools/application-commoncommit.yaml` for ArgoCD registration;
- `virtualservice-commoncommit.yaml` for ingress;
- `commoncommit-monitoring.yaml` for scraping and alerts;
- `commoncommit-dashboard-configmap.yaml` for Grafana.

Install them according to that private platform repository's review process. Before calling the path operational, verify all of the following:

1. ArgoCD can read the mirrored repository and an Application exists.
2. The Application tracks the intended branch and `k8s/overlays/nonprod` path.
3. Ingress, monitoring, and dashboard resources are registered in their parent Kustomizations.
4. The public route supports long-lived SSE connections.
5. The live build identity matches the commit and source tree that were built.

Do not use direct `kubectl` changes as a persistent rollback or fix while ArgoCD `selfHeal` is enabled; the controller will restore Git state.

## CI/CD behaviour

The intended chain is:

```text
GitHub main
  → GitHub Actions stages the commit on GitLab delivery-candidate
  → GitLab verifies and builds the immutable image without changing desired state
  → GitHub fast-forwards GitLab main only after image success (CI skipped)
  → Argo CD observes main, performs PreSync + rollout + in-cluster PostSync
  → platform monitoring independently observes live serving state
```

**Measured state of each link, 2026-08-11.** The mechanism has historical
end-to-end evidence. Pipeline `2749163703` failed four I18N-01 gates before image
publication, and the two-phase contract correctly withheld promotion. The current
source remediation passes 21/21 static parity, but that local result does not
pre-announce delivery: require the new pipeline, immutable image, Argo result,
and serving identity. Dated run IDs and incident history live in
[GitHub delivery operations](GITHUB-OPERATIONS.md).

| Link | Measured state | How to check |
| --- | --- | --- |
| Candidate delivery | **Fail-closed and working.** GitHub stages `delivery-candidate`, requires matching `test` and `build:image`, then non-force fast-forwards `main`; the current failed candidate did not change desired state | the delivery run reports the candidate pipeline URL and only reports promotion after success |
| GitLab verify + build | `99f2205` failed 4/21 I18N-01 checks; the current source fix passes 21/21 and awaits remote evidence | require the matching green pipeline, registry tag, and source-tree label |
| GitOps rollout | Historical registration and automated reconcile remain configured; never infer the new revision from a local pass | require `argocd app get commoncommit` plus the expected revision |
| Rollout verification | PostSync remains the authoritative in-cluster exact-build check after promotion | require PostSync success, Argo Healthy/Synced, and independent external build metrics |

### Delivery time budget and failure boundaries

| Segment | Healthy target | Hard boundary | Failure effect |
| --- | ---: | ---: | --- |
| Candidate pipeline discovery | under 1 minute | 60 seconds | GitLab main and live state stay unchanged |
| Test + immutable image | 7–10 minutes measured | 18 minutes | candidate fails; no Argo rollout starts |
| Argo discovery + Recreate rollout | under 4 minutes | platform reconciliation plus hook deadline | Argo reports degraded/failed rather than CI guessing through Cloud Armor |
| In-cluster exact-build verification | seconds | 240 seconds | PostSync fails and blocks a healthy deployment claim |

Only the newest GitHub delivery runs: a newer main commit cancels the superseded
observer and GitLab's interruptible candidate jobs. Scheduled reconciliation is a
fast no-op when GitLab main already matches GitHub. The current one-replica
`Recreate` workload still has a short outage; zero-downtime rollout remains unsafe
until SQLite and in-memory execution ownership move to shared external services.

### Manual mirror, when the workflow cannot run

A `gitlab` SSH remote is configured alongside `origin`, so the mirror can be done from a checkout without the workflow and without handling the push token:

```bash
git push gitlab origin/main:refs/heads/delivery-candidate
# Wait for test and build:image to succeed on delivery-candidate.
git push -o ci.skip gitlab origin/main:refs/heads/main
```

This is the recovery path for a GitHub-side runner outage, and it is what closed the 22-commit gap. It is a fast-forward push with no `--force`, so a diverged GitLab branch stops it rather than being overwritten — check `git log gitlab/main..origin/main` first.

Important distinctions:

- Delivery fails when its token is absent or lacks `read_api`; an unobservable candidate is never promoted. A scheduled run is a no-op only when GitLab main already matches GitHub.
- The mirror gets one attempt per push, and it is not always ours to lose: on 2026-08-06 four consecutive runs failed with "The job was not acquired by Runner of type hosted", a GitHub-side allocation failure that executed no step and burned 15 minutes each. The reconcile is the recovery path; it annotates the run when it had to catch up.
- GitLab runners do not trigger or judge the rollout. The installed Application reconciles automatically and its PostSync hook verifies from inside the allowed network boundary; Cloud Armor is not weakened for CI.
- Verification observes the serving version and source-tree metric. It does not itself prove which controller performed the rollout.
- Image tags are treated as immutable. When image-relevant source changes, bump the version instead of overwriting an existing tag.

## Verification

Set the environment-specific service URL without committing it:

```bash
COMMONCOMMIT_URL=http://your-nonprod-host.example.com

curl --fail "$COMMONCOMMIT_URL/healthz"
curl --fail "$COMMONCOMMIT_URL/readyz"
curl --fail "$COMMONCOMMIT_URL/metrics" | grep '^commoncommit_build_info'
curl --fail "$COMMONCOMMIT_URL/api/bootstrap"
```

Confirm:

- `/readyz` returns HTTP 200 with `status: "ok"` and `db: true`;
- `executionMode` exactly matches the mode declared by the environment overlay;
- `commoncommit_build_info` reports the expected version, commit, and source tree;
- the SPA, a deep link, and both SSE endpoints work through ingress;
- Prometheus is scraping the service and Langfuse receives traces when enabled.

`/readyz` reports whether credentials are configured, not whether a fresh model request succeeds. Use `make validate-llm` for a live, non-secret credential check.

## Logs and metrics

```bash
make logs
```

Correlate failures with `missionId`, `runId`, execution mode, and trace ID. Never copy raw secret-bearing environment output into an incident record.

Useful service checks:

- run completion and block reasons;
- unreadable test output;
- LLM latency, tokens, and error rate;
- prompt-injection flags and write denials;
- process restarts and writable-volume failures;
- build identity drift.

Prometheus expressions for counters that have never incremented may return an empty vector. Alert rules must explicitly handle absence when zero is meaningful.

## Rollback

Choose the rollback procedure that matches the deployment owner.

### ArgoCD-managed environment

Revert or update the release commit so `Makefile`, the overlay tag, and changelog describe the intended version, then let ArgoCD reconcile and repeat live verification. Do not rely on `kubectl rollout undo`; self-healing will replace it with the Git revision.

### Manually managed environment

When ArgoCD is not managing the workload, an emergency rollout undo is possible:

```bash
COMMONCOMMIT_KUBE_CONTEXT=your-kube-context
kubectl --context "$COMMONCOMMIT_KUBE_CONTEXT" \
  -n commoncommit rollout undo deploy/commoncommit
kubectl --context "$COMMONCOMMIT_KUBE_CONTEXT" \
  -n commoncommit rollout status deploy/commoncommit --timeout=180s
```

Then verify the actual build identity. The rollback does not restore SQLite data lost during the rollout.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Secret creation says namespace not found | Apply `k8s/base/00-namespace.yaml` first |
| Pod fails with `EACCES` under `/app/var` | Preserve pod `fsGroup: 1000` and the writable volume mount |
| `make build` refuses | Commit image-relevant changes or use dirty build only for local testing |
| `make check-version` fails | Align Makefile, overlay `newTag`, and changelog release heading |
| CI builds but live version never changes | Confirm mirror delivery, ArgoCD Application installation, repo access, and sync health |
| Live mode differs from the overlay | Check the deployed ConfigMap, rollout revision, and server-side credentials |
| SSE disconnects at ingress | Inspect the deployed VirtualService timeout rather than assuming the template was installed unchanged |
| State disappears after rollout | Expected with the current `emptyDir`; persistent storage is roadmap work |

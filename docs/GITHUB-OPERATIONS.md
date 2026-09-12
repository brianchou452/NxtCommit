# GitHub → Cloudflare delivery

## Current scope

The initial repository contains specifications, not an application. This pipeline deploys an explicitly labelled infrastructure receipt Worker. `/__deployment` returns the serving commit and GitHub run URL; `/` returns 503 and the unimplemented product health/API routes return 404. No product page, database, runner or LLM is established by this release.

The user requested Cloudflare instead of the inherited GitLab/Argo CD design. Those systems and their version files do not exist in this repository. The referenced root SKILL.md, FEATURE-REALITY and SECURITY documents were also absent during initial inspection; no rules from a different repository were imported.

## Workflow

1. PRs and pushes run `CI`: validate 125 contract schemas, report missing product tests, test delivery Worker behavior, and run a credential-free Wrangler dry-run.
2. A push to main or manual dispatch on main runs `Deploy Cloudflare infrastructure`. It calls the same CI workflow, then checks the hostname is free or belongs to this Worker before deploying.
3. Exact Node and Wrangler versions, npm lockfile, and commit-pinned GitHub Actions make dependency selection repeatable. CI jobs have only `contents: read` and do not persist Git credentials.
4. The deployment step alone receives the token. Preflight receives the same token for account/zone/DNS/domain reads. Production deployments are serialized, and PRs never run this job.
5. HTTPS verification must match both the commit SHA and the run URL. Logs, contract results, and deployment receipts are retained as Actions artifacts for 30 days; download them for long-term judging evidence.

CI success is scoped to contracts and infrastructure. The deploy job intentionally refuses when root package.json, src, server or apps appears: the team must integrate the real build/runtime first. There is no silent fallback to the receipt Worker after product code is added.

## Configuration

- GitHub repository: `brianchou452/NxtCommit`.
- Branch: `main`; implementation branch: `codex/cloudflare-cicd`.
- Actions secret: `CLOUDFLARE_API_TOKEN`.
- Actions variable: `CLOUDFLARE_ACCOUNT_ID`, using the account that owns ianjuan.com.
- Environment: `cloudflare-production`. No reviewer protection is claimed; no branch protection was changed.
- Worker: `nxtcommit-delivery`.
- Hostname: `hackathon.ianjuan.com`; no apex domain change.
- Token needs Worker deployment/custom-domain permissions and account, zone and DNS read access for preflight. If permissions are insufficient, the workflow must fail; do not bypass the preflight.

Never save token values in repository files, artifacts or screenshots. The supplied token appeared in chat before this repository was identified; rotate it and replace the Actions secret according to the repository credential policy. Existing token use was explicitly authorized for this setup; rotation is not claimed as completed.

## Local verification

```sh
python -m pip install -r scripts/ci/requirements.txt
python scripts/ci/validate_specs.py
npm ci --prefix deploy/cloudflare
npm test --prefix deploy/cloudflare
npm run build --prefix deploy/cloudflare
git diff --check
```

Node 22.23.2 is used by CI. Do not use `npm --if-present` to hide missing product checks. Spec scenario files are reported as missing rather than falsely counted as executed tests.

## Integrating the application

Confirm the actual framework, dependency manager and runtime with the product teammate. Existing contracts mention local SQLite and process execution; Workers compatibility cannot be assumed. Choose an appropriate runtime/storage design before changing the bootstrap guard. Static hosting alone does not implement those contracts.

Then replace the receipt Worker entrypoint with the real application adapter, add its locked install/typecheck/test/build steps, run the required Docker browser journeys, and replace smoke verification with product health/readiness and a serving build revision. Keep deployment evidence separate from product/LLM provenance. Update both language versions and checkpoint logs together.

## Rollback

Before any rollback, identify the previous successful run, download its evidence and copy its recorded Cloudflare version ID. With the deployment token in the environment, run `npx wrangler deployments list` from deploy/cloudflare, then `npx wrangler rollback <previous-version-id>`. Verify `/__deployment` against that version's original commit AND original run URL. A rollback does not migrate or restore a database. The first deployment has no prior version to restore; no rollback drill is claimed until executed and recorded.

## Official references

- [GitHub Actions deployment](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

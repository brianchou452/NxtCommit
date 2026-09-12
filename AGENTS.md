# NxtCommit agent guide

This file is the entry point for coding agents and contributors. English is
canonical; the short Traditional Chinese section below exists so the same safety
boundary is visible to everyone.

## Read before changing the project

1. Read `docs/COLLABORATION.md` and `docs/BRANCHES.md` for the current workflow and branch scope. The imported root `SKILL.md` is absent; do not follow a broken reference.
2. Read `docs/FEATURE-REALITY.md` before describing a feature as real, live,
   autonomous, or LLM-powered.
3. Read `docs/GITHUB-OPERATIONS.md` before changing CI, mirroring, images, Argo
   CD, or deployment verification.
4. Read `docs/LLM-OBSERVABILITY-PLAN.md` before adding a model call, prompt,
   evaluator, Langfuse field, score, dataset, or AI dashboard metric.
5. Read `docs/SECURITY.md` before changing repository input, runners, tools,
   isolation, authentication, or secrets.
6. Read `docs/AGENT-ARCHITECTURE.md` before describing the system as single-agent,
   multi-agent, supervisor-led, worker-based, or autonomous.
7. Check `git status` and preserve unrelated work.
8. Before any frontend change (including remote development), read and follow
   [the Design System](docs/DESIGN-SYSTEM.md), the applicable YAML/contracts, and
   approved goldens. Follow the document's authority order and complete its design
   review checklist with evidence in the PR/handoff. Read the
   [repository applicability notes](docs/COLLABORATION.md#frontend-design-system)
   before treating the imported source baseline as this checkout's verified state.

## Facts that must not drift

- New `/github` source workspaces are an explicitly authorized exception to the historical metadata-only boundary. See `docs/GITHUB-WORKSPACES.md`: authenticated public snapshots, draft PR on credit commitment, bounded AI/Docker verification and same-head CI promotion. Existing mission runner routes remain fixture-only. No deployment or live-write verification is implied.
- `/github` 是已授權的新例外：公開原始碼快照、投入額度開 draft PR、AI／Docker 驗證與同 head CI 通過後轉正式；詳見 `docs/GITHUB-WORKSPACES.zh-TW.md`。既有 runner 路由仍限 fixture，不代表已部署或已驗證上游寫入。

- GitHub `main` is the source of truth. This reconstruction uses GitHub Actions
  and Cloudflare, as requested for the hackathon. The current delivery runs the Phase 1 foundation container with a verified
  Responses adapter; see `docs/GITHUB-OPERATIONS.md` and
  `docs/cicd/CHECKPOINTS.md`. GitLab mirroring and Argo CD are not configured in
  this repository. A green infrastructure run does not prove product readiness.
- Public GitHub import is read-only metadata analysis. It does not clone or run
  the imported repository. Use `https://github.com/PrimeIntellect-ai/prime-agent`
  as the public integration probe; do not substitute a private repository.
- Main integrates A/B/C with scripted execution for the three bundled fixtures (retry-queue, duration-demo and tempo).
  Preserve fixture-only execution and engine-owned evidence; imported repositories
  remain metadata-only and never execute.
- The bounded Responses probe has measured local/cloud provider usage. Product
  authoring and runner integration are separate branch responsibilities. Never
  infer their readiness from that probe or from a configured key.
- Tests, SQLite and CI/CD are real mechanisms. Product diffs, accounting, review,
  metrics and SSE must be checked against the specific branch implementation.
  Seed personas, authored popularity and scripted reasoning remain demo data.
- The application does not authenticate maintainers, charge money, push an
  upstream branch, open a GitHub pull request, merge, tag, or publish a package.

## Change and handoff rules

- Preserve provenance fields and visible demo labels. Never infer a real result
  from animation, prose, seeded rows, or a configured credential.
- Never put a secret value in source, documentation, commands captured in shell
  history, logs, screenshots, issues, or chat. A token pasted into any of those
  channels is exposed and must be revoked or rotated.
- Keep English and `.zh-TW.md` documentation counterparts in the same commit.
- Append GOTCHAS IDs; never delete or renumber incident history.
- For image-relevant changes, update all three version locations and run
  `make check-version`. Documentation-only changes do not need an image bump.
- Report verification evidence, not assumptions: GitHub CI, deployment jobs,
  HTTPS `/__deployment` identity and actual provider usage answer different
  questions. Historical GitLab/Argo results are not current deployment evidence.

## 給共同開發者與代理的繁中摘要

- 所有前端修改（含遠端開發）都必須先讀並遵循[Design System](docs/DESIGN-SYSTEM.zh-TW.md)、對應 YAML／contracts 與 approved golden；依文件權威順序處理衝突，逐項完成 design review checklist，於 PR／交接附上證據。先讀[本 repo 適用說明](docs/COLLABORATION.zh-TW.md#frontend-design-system)，不可把匯入來源基準當成此 checkout 已驗證的現況。

- 先讀 `docs/COLLABORATION.zh-TW.md`、`docs/BRANCHES.zh-TW.md` 與
  `docs/GITHUB-OPERATIONS.zh-TW.md`，再修改或描述系統。
- 新增 model call、prompt、evaluator、Langfuse score／dataset 或 AI dashboard
  metric 前，先讀 `docs/LLM-OBSERVABILITY-PLAN.zh-TW.md`。
- GitHub `main` 是來源；本次黑客松依使用者要求採 GitHub Actions 與
  Cloudflare。目前已部署 Phase 1 foundation container 並驗證 Responses adapter，詳見 `docs/GITHUB-OPERATIONS.zh-TW.md`
  與 `docs/cicd/CHECKPOINTS.zh-TW.md`。本 repo 尚未設定 GitLab 鏡像或 Argo CD；
  基礎設施綠燈不代表產品已就緒。
- GitHub 匯入只讀 metadata，不 clone、不執行。公開整合測試固定使用
  `PrimeIntellect-ai/prime-agent`，不可拿 private repo 代替。
- main 已整合 A／B／C，僅三個內附 fixture（retry-queue、duration-demo、tempo） 可使用腳本執行，保留 engine 證據與邊界。
  Responses probe 已驗證本機／雲端 usage；產品文案與執行仍須依分支驗證。
  fixture-only 邊界與 demo 標籤必須保留，不可從畫面推論能力。
- 不得宣稱系統會登入 GitHub、建立真正 PR、合併、發布、收款；不得把 demo 運算點數當成 provider token。Responses probe 已回報真實 usage，但不代表任務 runner 已整合。
- 所有英文文件都要同步更新對應繁中檔，秘密值永遠不能寫入文件或對話。
- 描述 single-agent、multi-agent、supervisor、worker 或自主程度前，先讀
  `docs/AGENT-ARCHITECTURE.zh-TW.md`；多個 runner class 不等於 multi-agent。
- 使用者可見文案一律放入 `src/i18n/en.ts` 與 `src/i18n/zh-TW.ts`，不可用
  `locale === ...` inline 翻譯；提交前執行 `server/i18n01-parity.test.ts`。

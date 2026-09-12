# NxtCommit agent guide

This file is the entry point for coding agents and contributors. English is
canonical; the short Traditional Chinese section below exists so the same safety
boundary is visible to everyone.

## Read before changing the project

1. Read `SKILL.md`; it owns the maintainer workflow and verification rules.
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

## Facts that must not drift

- GitHub `main` is the source of truth. GitHub Actions mirrors it to GitLab;
  GitLab tests and builds an immutable image; Argo CD reconciles the checked-in
  non-production overlay. A green mirror job is not by itself proof of rollout.
- Public GitHub import is read-only metadata analysis. It does not clone or run
  the imported repository. Use `https://github.com/PrimeIntellect-ai/prime-agent`
  as the public integration probe; do not substitute a private repository.
- Only bundled fixture workspaces can execute. The shared non-production
  deployment explicitly uses `EXECUTION_MODE=demo`.
- Campaign copy and project explanations may use a real OpenAI-compatible LLM
  after credential validation. Their payloads expose generator provenance.
  Mission execution in non-production remains scripted even when those two copy
  features use a real model.
- Tests, diffs, accounting, local review decisions, SQLite writes, metrics, SSE,
  and CI/CD are real non-LLM operations. Seed personas, popularity/adoption
  figures, scripted runner reasoning, and map locations are demo data.
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
- Report verification evidence, not assumptions: GitHub run, GitLab pipeline,
  Argo sync/health, and the serving `commoncommit_build_info` metric answer
  different questions.

## 給共同開發者與代理的繁中摘要

- 先讀 `SKILL.md`、`docs/FEATURE-REALITY.zh-TW.md` 與
  `docs/GITHUB-OPERATIONS.zh-TW.md`，再修改或描述系統。
- 新增 model call、prompt、evaluator、Langfuse score／dataset 或 AI dashboard
  metric 前，先讀 `docs/LLM-OBSERVABILITY-PLAN.zh-TW.md`。
- GitHub `main` 是來源；GitHub Actions 鏡像至 GitLab，GitLab 測試與建置，
  Argo CD 自動同步。任一單獨綠燈都不能證明整條鏈已上線。
- GitHub 匯入只讀 metadata，不 clone、不執行。公開整合測試固定使用
  `PrimeIntellect-ai/prime-agent`，不可拿 private repo 代替。
- nonprod 任務執行固定是 demo；募資文案與專案說明則可能真的呼叫 LLM。
  必須看 payload 的 generator／mode／provenance，不可看動畫或文案猜測。
- 不得宣稱系統會登入 GitHub、建立真正 PR、合併、發布、收款或量測真實
  provider token；這些目前都沒有實作。
- 所有英文文件都要同步更新對應繁中檔，秘密值永遠不能寫入文件或對話。
- 描述 single-agent、multi-agent、supervisor、worker 或自主程度前，先讀
  `docs/AGENT-ARCHITECTURE.zh-TW.md`；多個 runner class 不等於 multi-agent。
- 使用者可見文案一律放入 `src/i18n/en.ts` 與 `src/i18n/zh-TW.ts`，不可用
  `locale === ...` inline 翻譯；提交前執行 `server/i18n01-parity.test.ts`。

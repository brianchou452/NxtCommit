# GitHub → Cloudflare 部署維運

> 整合更新：目前原始碼已加入 [Phase 1 TypeScript 骨架](../PHASE1-FOUNDATION.zh-TW.md)，尚未接入 Worker。既有 product-source guard 會拒絕部署，完成 runtime 整合前不可移除。空的 nonprod kustomization 僅記錄繼承版本，未設定 GitLab 或 Argo CD。

## 目前範圍

初始 repo 只有規格，沒有產品應用程式。本流程部署明確標示用途的基礎設施 Worker：`/__deployment` 回報正在服務的 commit 與 GitHub run URL；`/` 回應 503，未實作的產品健康檢查與 API 回應 404。這次發布不能證明產品頁面、資料庫、runner 或 LLM 已就緒。

使用者要求 Cloudflare，取代繼承文件中的 GitLab／Argo CD 設計。那些系統及版本檔並不存在於本 repo。初次盤點時，root SKILL.md、FEATURE-REALITY 與 SECURITY 文件也不存在；未從其他 repo 套用規則。

## 流程

1. PR 與 push 執行 `CI`：驗證 125 份 contract schema、列出缺少的產品測試檔、測試部署 Worker 行為，並執行不含憑證的 Wrangler dry-run。
2. main 的 push 或 main 上的手動觸發執行 `Deploy Cloudflare infrastructure`，先呼叫相同 CI，再確認子網域可用或屬於本 Worker 才發布。
3. 固定 Node、Wrangler 版本，使用 npm lockfile，GitHub Actions 固定 commit。CI 僅有 `contents: read`，不保留 checkout 的 Git 憑證。
4. 部署步驟取得 token；preflight 也使用同一 token 讀取帳戶、zone、DNS 與 custom domain。正式發布序列執行，PR 不執行發布。
5. HTTPS 驗證必須同時符合 commit SHA 與 run URL。日誌、contract 結果與部署收據作為 Actions artifacts 保留 30 天；評審長期證據請另行下載保存。

CI 成功只涵蓋規格與基礎設施。root package.json、src、server 或 apps 出現時，deploy job 會刻意停止，要求團隊先接入真實 build/runtime，避免產品加入後仍默默發布佔位 Worker。

## 設定

- GitHub repo：`brianchou452/NxtCommit`。
- 正式分支：`main`；實作分支：`codex/cloudflare-cicd`。
- Actions secret：`CLOUDFLARE_API_TOKEN`。
- Actions variable：`CLOUDFLARE_ACCOUNT_ID`，使用 ianjuan.com 所屬帳戶。
- Environment：`cloudflare-production`。未宣稱已設定審核保護，也未改動 branch protection。
- Worker：`nxtcommit-delivery`。
- 子網域：`hackathon.ianjuan.com`；不修改根網域。
- Token 需要 Worker 部署、自訂網域所需權限，以及 preflight 的帳戶、zone、DNS 讀取權限。不足時應失敗，不能繞過 preflight。

Token 值不可保存到 repo、artifacts 或截圖。使用者提供的 token 在辨識 repo 前已出現在對話，依 repo 憑證政策應輪替並更新 Actions secret；此次設定已獲授權使用原 token，但未宣稱完成輪替。

## 本機驗證

```sh
python -m pip install -r scripts/ci/requirements.txt
python scripts/ci/validate_specs.py
npm ci --prefix deploy/cloudflare
npm test --prefix deploy/cloudflare
npm run build --prefix deploy/cloudflare
git diff --check
```

CI 使用 Node 22.23.2。不可用 `npm --if-present` 掩蓋缺少的產品檢查。Spec 引用但尚未建立的 scenario 測試檔會列入報告，不會算成已執行測試。

## 接入產品

先向產品隊員確認框架、套件管理器與 runtime。現有 contract 提到本機 SQLite 與 process execution，不能假設與 Workers 相容；必須先確認執行環境和儲存設計，再修改 bootstrap guard。靜態網站部署不能實現那些 contract。

接著以真實應用 adapter 取代 receipt Worker，新增固定相依版本的 install/typecheck/test/build、執行必要的 Docker browser journeys，並將 smoke check 改成產品健康、readiness 與服務版本驗證。部署證據與產品／LLM provenance 分開記錄，中英文與 checkpoint 一起更新。

## 回滾

先找到上次成功的 run，下載證據並取得 Cloudflare version ID。在環境中提供部署 token，於 deploy/cloudflare 執行 `npx wrangler deployments list`，再執行 `npx wrangler rollback <previous-version-id>`。使用該版本原始 commit 與原始 run URL 驗證 `/__deployment`。回滾不會遷移或還原資料庫。首次部署沒有上一版可還原；尚未實際演練與記錄前，不宣稱已驗證回滾。

## 官方參考

- [GitHub Actions 部署](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [自訂網域](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Wrangler 設定](https://developers.cloudflare.com/workers/wrangler/configuration/)

# GitHub 原始碼工作區

[English canonical](GITHUB-WORKSPACES.md)

`/github` 新增獨立的身分驗證原始碼流程。既有 `/api/analyze` metadata 分析與
fixture 任務執行維持原有邊界。此實作尚未部署，也尚未對真實可寫 repo 驗證。

## 使用流程

1. 連線限定 repo 的 GitHub fine-grained token，授予 Contents、Pull requests
   寫入及 Checks 讀取權限。`/user` 確認工作區擁有者；資助或寫入前會檢查 repo
   push 權限。只支援公開 repo，尚未建立 fork。
2. 透過 Git Database API 下載固定 commit 的 tree 與 blobs，逐一核對 Git SHA。
   這是原始碼快照，不是包含歷史的 Git clone。可檢視檔案、大小與套件依賴。
   截斷 tree、submodule、不安全路徑或超出上限會失敗，不會假裝完整分析。
   二進位及敏感內容不顯示、不送模型；上游 blob 保留不變。
3. 輸入有限範圍的任務並投入示範算力額度。系統建立本機資助紀錄，並在
   `nxtcommit/<workspace-id>` 分支加入規劃文件。GitHub 必須有差異才能開 PR，
   因此先有規劃 commit，再建立 draft PR。額度不是 provider 計費 token。
4. 伺服器進行一次有限範圍 Responses 呼叫，以及獨立的基準／最終 Docker 測試。
   驗證最多八個既有原始碼檔案的完整替換內容，保護既有測試、manifest、lock
   及 CI。只有通過驗證的 patch 才提交到同一支 draft 分支，不 force push。
5. 伺服器確認設定的 GitHub Actions check 名稱屬於同一個 head commit，重新檢查
   PR head 後轉正式 PR。每十秒檢查，最多十五分鐘。失敗保留 draft；恢復只重試
   未完成階段，不重複扣額度或開 PR。模型失敗需明確重試，可能再次產生模型費用。

## 本機設定

使用單一 Node 伺服器、持久化 `VAR_DIR`、Docker，以及既有伺服器端
`OPENAI_API_KEY`／`OPENAI_MODEL` 設定。設定 `GITHUB_WORKSPACES_ENABLED=1`、
`GITHUB_REQUIRED_CHECKS=test`（多個精確 check 名稱以逗號分隔），並預先拉取
`node:24.19.0-bookworm-slim`。目前 Cloudflare container 沒有經驗證的 Docker
執行邊界，不應啟用。設定 key 不代表已驗證真實 provider 呼叫。

目前驗證支援無外部依賴的 Node `.test.js`、`.test.mjs`、`.test.cjs` 與
`.spec.*` 套件，不安裝依賴、不執行 package scripts。其他語言或需要安裝依賴的
專案會停止並保留可恢復狀態。基準與最終測試皆須非空，最終須通過且測試數不可
減少。這是套件層級證據，不代表逐一證明所有驗收條件。

上限：3,000 個 tree 項目、每個 blob 500 KB、總計 10 MB；模型 context 80,000
字元、八個修改檔案及 60 KB 變更。Docker 無網路、無傳入憑證，工作區與根目錄
唯讀，以非 root UID、移除 capabilities、限制程序／記憶體／CPU 及六十秒逾時
執行驗證。第三方 repo 程式不會在 host 執行。

GitHub token 僅保留於程序記憶體，使用一小時的 HttpOnly、SameSite=Strict
session；HTTPS 使用 Secure cookie。localhost 以外須使用 HTTPS。每次讀写
均檢查工作區擁有者。中斷連線或 session 到期後不再寫入上游；重新啟動須以相同 GitHub 帳號重新連線，中斷執行標示失敗；
已驗證變更與上游分支／PR 識別可用於恢復。同一資料庫只支援單一應用程序。
這不是多租戶正式服務、付款、merge 或 release 系統。

已有 GitHub 資助紀錄時會拒絕 demo reset，避免抹除外部 PR 的來源證據。工作區資助使用使用者選定的示範額度，不是 provider 價格估算。

## 驗證

- `npm test -- server/github-workspaces.test.ts server/i18n01-parity.test.ts`
  驗證擁有權、origin、不可變 blob、保護路徑、PR 回應遺失、資助／PR 冪等性與
  同一 head 的 CI gate。
- `npm run test:e2e:github` 執行真實 UI、server、database、Responses adapter
  及獨立 Docker 測試容器。GitHub／Responses transport 使用編寫的測試回應，
  涵蓋完整成功流程、CI 失敗恢復、模型 patch 失敗、權限不足與截斷匯入。
- `npm run test:e2e -- --project=github` 使用無網路瀏覽器容器與測試專用
  fixture verifier，不代表巢狀 Docker 隔離證據。

正式 adapter 使用 [GitHub Git Database API](https://docs.github.com/en/rest/git/trees)、
[GitHub pull requests](https://docs.github.com/en/rest/pulls/pulls) 與
[Responses API](https://developers.openai.com/api/docs/guides/text)。

## 整合驗證 — 2026-09-12

已整合 main `ad026e1`，來源版本為 `0.7.24`，保留 Agent Lab、模型取消、有界 provider 回覆及受保護的 demo reset。通過 163 個後端測試、45 個瀏覽器情境、5 個真實 Docker 工作區流程、typecheck／build、131 份規格與版本／空白檢查。遠端新增的一個 smoke test 在並行負載下曾逾時，單獨與完整套件重跑均通過。以上是本機結果，不代表真實 GitHub 寫入或部署證據。

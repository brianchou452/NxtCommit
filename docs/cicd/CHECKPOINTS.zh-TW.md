# 部署 checkpoint 紀錄

## CP-001 — 需求與初始目錄／2026-09-12

使用者授權建立 GitHub → Cloudflare CI/CD、使用 ianjuan.com 子網域，並保留黑客松評審證據。初始 Hackthon 目錄是空 Git repo，沒有 remote 或 source。早期規劃文件仍保留在原目錄，後續實作以本 repo 紀錄為準。

## CP-002 — Cloudflare 唯讀驗證／2026-09-12

Token 驗證回傳 active；帳戶清單與 ianjuan.com zone 查詢成功，zone 為 active，已確認所屬帳戶。這些檢查不代表寫入權限、DNS 變更、部署或 token 輪替完成。紀錄不包含憑證值。

## CP-003 — 正確 repo／2026-09-12

使用者提供 NxtCommit。確認 remote 為 brianchou452/NxtCommit，main 為 e60996320699133f8b64eb11b0ac85a2a7cd7b18，worktree 乾淨，尚無產品 source/package/CI 設定。已讀 AGENTS.md 與相關 contract；引用的 root 維護 skill、維運、安全、功能實況文件不存在。Contract 提到 SQLite 與 process execution，完整應用部署仍需 runtime 整合。建立 codex/cloudflare-cicd，未修改 main。

## CP-004 — GitHub 身分／2026-09-12

CLI credential helper 沒有 GitHub 憑證。Connector 帳號 ian-juan_tmemu 為 pull=true、push=false。使用者要求改用個人帳號 ianjuantw@gmail.com；GitHub Desktop 已登入 ianjuantw，Safari 顯示 push access 且可進入 Actions secrets。透過已登入的 repo UI 建立 CLOUDFLARE_API_TOKEN，GitHub 顯示「Repository secret added.」。未宣稱 connector 身分已切換。

## CP-005 — 實作與本機驗證／2026-09-12

新增 CI、main-only 序列部署、子網域衝突 preflight、revision smoke check、基礎設施 Worker 與雙語交接。依使用者要求將繼承的 GitLab／Argo 敘述改為 Cloudflare。Product-source guard 防止應用加入後誤發布佔位服務。

本機驗證：125 份 spec schema 通過，13 個引用的產品測試檔不存在，報告明確列出。3 項基礎設施行為測試通過；Wrangler 4.131.1 dry-run 成功；npm audit 回報零弱點。Node 22.23.2 來自 nodejs.org，已依官方 SHA256 檢查下載檔。

## 待完成 checkpoint

| ID | 完成證據 | 狀態 |
| --- | --- | --- |
| CP-006 | 儲存帳戶 variable、發布分支與 GitHub CI run 連結 | 完成；見下方 CP-006 |
| CP-007 | main 發布 run、Cloudflare version 與 HTTPS 版本一致收據 | 等待憑證交接；見下方 CP-007 |
| CP-008 | 真實框架/runtime 接入、產品測試與 readiness 證據 | 等待產品 source／技術棧 |
| CP-009 | 回滾演練與恢復版本證據 | 未執行 |

後續每筆須包含時間、變更、驗證、結果、證據連結與未完成工作。Secret 已設定或 contract 綠燈不代表產品部署完成。

## CP-006 — 雲端設定、CI 與同步文件衝突／2026-09-12

已在 repo UI 儲存並確認 CLOUDFLARE_ACCOUNT_ID。透過 ianjuantw 發布 c2eacb9 分支。[Push CI](https://github.com/brianchou452/NxtCommit/actions/runs/34668690840) 與 [PR CI](https://github.com/brianchou452/NxtCommit/actions/runs/34668726022) 均成功，已建立 [PR #1](https://github.com/brianchou452/NxtCommit/pull/1)。隊員同時推送 c21d4ed 歷史文件；兩份 add/add 衝突以保留隊員文件、將本次手冊移至 docs/cicd/RUNBOOK 解決。新增歷史範圍標示，未刪除事故紀錄。已讀新匯入文件；它們不代表產品 source 或本次部署已完成。

## CP-007 — 首次 main 發布遭 Cloudflare 拒絕／2026-09-12 02:55 UTC

更新分支的兩項 CI 均成功（[PR run](https://github.com/brianchou452/NxtCommit/actions/runs/34668873422)、[push run](https://github.com/brianchou452/NxtCommit/actions/runs/34668871294)）後，[PR #1](https://github.com/brianchou452/NxtCommit/pull/1) 合併為 c21dbf5d14d8ea6eeef6e86f54067a5bc9f50a06。

[部署 run 34668938513](https://github.com/brianchou452/NxtCommit/actions/runs/34668938513) 通過 CI、憑證存在檢查與 account/zone/DNS/custom-domain preflight。Worker 上傳在 Workers Scripts API 遭拒，回傳 authentication error 10000。HTTPS 驗證正確跳過，失敗證據已上傳。不宣稱部署成功、取得 version ID、綁定網域或產品上線。

已確認使用的 token 與使用者 Cloudflare 畫面顯示者一致。已準備專用 NxtCommit GitHub Actions token 摘要：只對所屬帳戶提供 Workers Scripts:Edit，只對 ianjuan.com 提供 Zone:Read 與 DNS:Read。官方 Worker 上傳與自訂網域 API 均要求 Workers Scripts Write。目前等待使用者按下建立；代理未產生新 token。這會授予部署權限，因此電腦操作工具的憑證交接規則要求使用者完成最後提交。建立後須更新 GitHub 既有 secret、重跑失敗部署，再驗證線上 SHA/run 收據。

本機已 fast-forward 至合併後 main。此次僅補 checkpoint 的後續提交使用 [skip ci]，避免記錄權限錯誤時再產生相同失敗；沒有修改 runtime 或 workflow。

## CP-010 — 新 token 與產品程式碼／2026-09-12 03:15 UTC

使用者建立專用 token 並授權部署；GitHub 已確認更新既有 secret。[第 2 次嘗試](https://github.com/brianchou452/NxtCommit/actions/runs/34668938513/attempts/2) 成功上傳 Worker，但 Wrangler 列出 zone Workers Routes 時回傳 10000。已證明 Workers Scripts 寫入有效；網域綁定與 HTTPS 仍未完成。Wrangler 的衝突檢查另需 Workers Routes:Read。紀錄不含憑證內容。

使用者要求部署新推送程式。確認 main d376137 使用 React/Vite、Express、Node 24 與同步 node:sqlite。Workers 的 node:sqlite 只有無功能 stub，不能直接執行此後端。在不重設資料庫介面的前提下，需要 Cloudflare Containers 或既有 Node 主機；已詢問使用者執行環境。Containers 的本機磁碟是暫存資料。

Node 24.19.0 已依官方 SHA256 驗證；鎖定依賴安裝回報零弱點。本機型別檢查與正式 build 通過，server 測試為 14 通過、77 TODO、零失敗。本機 Docker 因公司組織登入政策拒絕 build。新增 GitHub hosted 產品 CI job，包含鎖定安裝、型別、server 測試、build、版本檢查與 Docker foundation 瀏覽器流程；尚待發布取得 run。執行環境接入前保留產品部署 guard。

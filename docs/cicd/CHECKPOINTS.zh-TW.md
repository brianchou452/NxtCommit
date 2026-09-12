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
| CP-006 | 儲存帳戶 variable、發布分支與 GitHub CI run 連結 | 進行中 |
| CP-007 | main 發布 run、Cloudflare version 與 HTTPS 版本一致收據 | 待執行 |
| CP-008 | 真實框架/runtime 接入、產品測試與 readiness 證據 | 等待產品 source／技術棧 |
| CP-009 | 回滾演練與恢復版本證據 | 未執行 |

後續每筆須包含時間、變更、驗證、結果、證據連結與未完成工作。Secret 已設定或 contract 綠燈不代表產品部署完成。

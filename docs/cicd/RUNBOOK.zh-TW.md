# GitHub → Cloudflare 產品部署

本次打包 repo 的 Phase 1 React/Vite 前端與 Node 24／Express／SQLite 後端。使用者已授權 Workers Paid 與 Cloudflare Containers；部署不代表 runner 或 Phase 2 功能已完成。

## 執行環境與大小

`nxtcommit-delivery` 將 `hackathon.ianjuan.com` 請求轉送到同一個命名 `NxtCommitContainer`。`basic` 提供 ¼ vCPU、1 GiB RAM、4 GB 暫存磁碟；`max_instances=1` 防止無限制擴容與多份 SQLite 分歧。非 root 執行、禁止容器對外網路。閒置 2 小時休眠，每 30 分鐘監測通常會保持展示環境運作；排程延誤仍可能休眠。休眠、重啟或部署可能清除 SQLite 展示資料，並非持久化產品儲存。

## 發布與驗證

main 推送先跑 contracts／gateway、Docker image dry-run build、Node 24 型別／server 測試／build、版本檢查與 Docker foundation 瀏覽器流程，成功後才部署。Wrangler 將 Git SHA 與 Actions run URL 編入 image；`/__deployment` 由實際 Node 映像回覆，非前置 Worker。Smoke 同時驗證收據、首頁、bootstrap、liveness 與 SQLite readiness。

Worker 與 image 一起發布，初次配置可能耗時數分鐘。503 代表容器不可用，不以佔位頁假裝成功。`cloudflare-production` 序列部署，Actions 固定 SHA，不保留 Git 憑證，證據 artifacts 保留 30 天。

## 憑證

GitHub secret `CLOUDFLARE_API_TOKEN` 與 variable `CLOUDFLARE_ACCOUNT_ID` 指向 ianjuan.com 所屬帳戶。專用 token 需帳戶 Workers Scripts Edit、Containers Edit、Account Analytics Read；僅 ianjuan.com 的 Zone Read、DNS Read、Workers Routes Read。即使用自訂網域，Wrangler 衝突檢查仍需最後一項。秘密不可進 source 或證據；貼過聊天的 token 應直接透過 provider 與 GitHub secret UI 輪替。

## 用量監測

`Monitor NxtCommit availability and usage` 每小時兩次檢查 HTTP／SQLite，查詢 Cloudflare 最近 24 小時資源與用量，保存資料及容器毛額估算。估算不含免費額度扣抵、Workers／DO／logs、基本費與稅，並非帳單。Analytics 範圍明確標為該帳戶所有容器。沒有資料視為告警，不當作零用量。告警條件：HTTP 失敗、RAM 超過 basic 容量 80%、CPU p95 超過 80%、磁碟超過 80%、容器毛額超過 US$2／日。Actions 顯示失敗，Codex 後續監測回報有意義的變化。這些唯讀檢查不會自動擴容、升級、重啟或回滾。

Workers Paid 為 US$5／月加用量。實例上限限制資源，並非帳單硬上限。半小時檢查會刻意保持展示環境運作；黑客松後應停用此排程或拉長間隔，讓容器閒置休眠。帳單請對照 Cloudflare Billing。只在實測資源飽和後升級大小，使用本機 SQLite 時不要加多副本。

## 復原

冷啟動暫時失敗可重試，調整大小前先看資源紀錄。重新部署可能重置資料。透過 Actions 重建與發布上一個已驗證 Git revision 的 image，再核對線上 image SHA／run URL。僅回滾 Worker 不代表容器也回滾；目前不宣稱完成回滾演練。實際結果与歷史失敗見 CHECKPOINTS.zh-TW.md。

[容器計價](https://developers.cloudflare.com/containers/platform/pricing/) · [用量指標](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-container-metrics/)

## 強制截止

台灣時間 2026-09-13 01:00（UTC 2026-09-12 17:00）gateway 回傳 410、Node 程序退出。監測與部署在截止後拒絕喚醒或重新發布。UTC 17:00、17:05、17:15 排程刪除僅限本次命名容器。GitHub 排程可能延誤，runtime 截止獨立運作。Codex 後續確認刪除與取消續訂；目前不宣稱未來關閉已完成。

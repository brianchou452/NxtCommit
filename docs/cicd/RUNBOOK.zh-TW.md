# GitHub → Cloudflare 產品部署

> **Phase 3 合併（`0.7.17`）：** Image 已納入 A／B／C、兩個內附 fixtures 與 Git；`/__deployment` 回報 `phase3-integrated` 與 `bundled-fixtures-only`。原 foundation 部署歷史保留於 checkpoints。產品建議維持已標示 fallback，保留 Responses credential 與僅限 OpenAI 的 egress；公開 GitHub metadata 匯入需本機 server 網路。Cutoff、單一 container 容量與 ephemeral storage 不變。

本次打包整合後的 React/Vite 前端與 Node 24／Express／SQLite 後端。使用者已授權 Workers Paid 與 Cloudflare Containers；adapter 使用產品內附 fixture engine，不授予任意 repository 執行權。

## 執行環境與大小

`nxtcommit-delivery` 將 `hackathon.ianjuan.com` 請求轉送到同一個命名 `NxtCommitContainer`。`basic` 提供 ¼ vCPU、1 GiB RAM、4 GB 暫存磁碟；`max_instances=1` 防止無限制擴容與多份 SQLite 分歧。非 root 執行、禁止容器對外網路。閒置 2 小時休眠，定時監測只讀生命週期狀態，不會啟動容器或重設閒置計時。休眠、重啟或部署可能清除 SQLite 展示資料，並非持久化產品儲存。

## 發布與驗證

見 [CI 速度與實測展示容量](PERFORMANCE.zh-TW.md)。Main 改為一份 reusable CI gate；application 檢查共用一次固定 Docker 建置，仍執行所有 journey。Worker dry-run 僅 bundle Worker，正式容器於部署時建置。

main 推送先跑 contracts／gateway、Worker bundle dry-run、Node 24 型別／server 測試／build、版本檢查與 Docker foundation 瀏覽器流程，成功後才部署。Wrangler 在部署時建置正式映像，將 Git SHA 與 Actions run URL 編入 image；`/__deployment` 由實際 Node 映像回覆，非前置 Worker。Smoke 同時驗證收據、首頁、bootstrap、liveness 與 SQLite readiness。

Worker 與 image 一起發布，初次配置可能耗時數分鐘。503 代表容器不可用，不以佔位頁假裝成功。`cloudflare-production` 序列部署，Actions 固定 SHA，不保留 Git 憑證，證據 artifacts 保留 30 天。

同一個 main CI gate 也會將完整 production 網站以 `linux/arm64` 發布至 GitHub Container Registry。CI 會在 QEMU 啟動不可變 commit image，驗證 deployment receipt 與 SQLite readiness 後才提升版本與 `arm64-latest` tags。此發布與 Cloudflare 部署互相獨立，使用 repository scoped `GITHUB_TOKEN`，不新增 registry 密碼。部署時優先使用不可變的 commit tag：

```bash
docker pull ghcr.io/brianchou452/nxtcommit:sha-<完整-git-sha>-arm64
docker run --rm --init -p 8080:8080 ghcr.io/brianchou452/nxtcommit:sha-<完整-git-sha>-arm64
```

`0.7.34-arm64` 等版本 tag 是固定 release 參照；`arm64-latest` 會在每次 main 成功發布後移動。除非明確調整 GHCR visibility，package 初次建立時為 private；需要時以具 `read:packages` 權限的 token 登入。本機容器狀態仍為 ephemeral，provider 功能需要對應的 server-side 環境設定。

## 憑證

GitHub secret `CLOUDFLARE_API_TOKEN` 與 variable `CLOUDFLARE_ACCOUNT_ID` 指向 ianjuan.com 所屬帳戶。專用 token 需帳戶 Workers Scripts Edit、Containers Edit、Account Analytics Read；僅 ianjuan.com 的 Zone Read、DNS Read、Workers Routes Read。即使用自訂網域，Wrangler 衝突檢查仍需最後一項。秘密不可進 source 或證據；貼過聊天的 token 應直接透過 provider 與 GitHub secret UI 輪替。

## 用量監測

`Monitor NxtCommit availability and usage` 每小時兩次檢查 gateway 與容器生命週期，不請求應用程式，查詢 Cloudflare 最近 24 小時資源與用量，保存資料及容器毛額估算。估算不含免費額度扣抵、Workers／DO／logs、基本費與稅，並非帳單。Analytics 範圍明確標為該帳戶所有容器。沒有資料視為告警，不當作零用量。告警條件：HTTP 失敗、RAM 超過 basic 容量 80%、CPU p95 超過 80%、磁碟超過 80%、容器毛額超過 US$2／日。Actions 顯示失敗，Codex 後續監測回報有意義的變化。這些唯讀檢查不會自動擴容、升級、重啟或回滾。

Workers Paid 為 US$5／月加用量。實例上限限制資源，並非帳單硬上限。HTTP／SQLite 在部署時驗證，定時監測保留閒置休眠。帳單請對照 Cloudflare Billing。只在實測資源飽和後升級大小，使用本機 SQLite 時不要加多副本。

## 復原

冷啟動暫時失敗可重試，調整大小前先看資源紀錄。重新部署可能重置資料。透過 Actions 重建與發布上一個已驗證 Git revision 的 image，再核對線上 image SHA／run URL。僅回滾 Worker 不代表容器也回滾；目前不宣稱完成回滾演練。實際結果与歷史失敗見 CHECKPOINTS.zh-TW.md。

[容器計價](https://developers.cloudflare.com/containers/platform/pricing/) · [用量指標](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-container-metrics/)

## 強制截止

台灣時間 2026-09-13 01:00（UTC 2026-09-12 17:00）gateway 回傳 410、Node 程序退出。監測與部署在截止後拒絕喚醒或重新發布。UTC 17:00、17:05、17:15 排程刪除僅限本次命名容器。GitHub 排程可能延誤，runtime 截止獨立運作。Codex 後續確認刪除；依使用者最新明確指示，Workers Paid 保持 Active 並於 2026/10/12 續訂，關閉作品不會取消月費；目前不宣稱未來關閉已完成。

## 共享展示保護 — v0.7.19

Cloudflare 一律保護重設，沒有操作員 token 時仍拒絕公開重設。頁尾隱藏公開重設，導覽保留進度。訪客仍共用 demo 身分；這是清空資料保護，不是身分驗證或完整 session 隔離。本機預設可重設，可設 `DEMO_PROTECTED=1` 啟用保護。伺服器端 `OPENAI_CHECK_TOKEN` 與 provider key 分開，用來授權操作員重設及備份。

```bash
# 在操作員 checkout 使用 ignored .env，參數不含秘密。
node scripts/demo-control.mjs backup https://hackathon.ianjuan.com artifacts/demo-backups/before-demo.sqlite
# 會清空資料：僅在操作員明確要重建共享狀態時使用。
node scripts/demo-control.mjs reset https://hackathon.ianjuan.com
```

採 SQLite online backup；拒絕同時匯出或匯出期間重設，下載完刪除伺服器暫存檔。CLI 建立新的 0600 本機檔案，不覆寫既有檔；備份須私密保存。本機復原：先停止目標伺服器、保留舊 VAR_DIR，把備份副本放到全新空 VAR_DIR 並命名為 `nxtcommit.sqlite`，用相同 source/schema 版本啟動，確認 readiness 與預期任務。不可替換使用中的 SQLite 或 WAL。

Cloudflare container 替換仍會遺失暫存資料；此功能提供離線復原副本，不是雲端自動持久化／還原。預計重新部署前先備份，展示中避免部署。兩小時 idle 與台灣 9/13 01:00 截止不變。

Projection 更新先檢查 SQLite `total_changes()` 與 `data_version`；未變動的讀取不寫入 projection，同 process 或其他 worker 寫入後會重新同步。這會減少重複工作，但未量測前不宣稱吞吐提升比例。

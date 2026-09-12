# CI 速度與展示容量 — 2026-09-12

main 原本同時執行獨立 CI 與部署內相同 reusable CI。改為 main 只保留部署前一份必要 CI；PR、codex、手動檢查仍保留。應用程式在固定 Node 24／Playwright Docker 映像內只建置一次，再於同一映像執行 typecheck、server tests、版本檢查與瀏覽器 journeys，移除重複的 host dependency install 與 build。Dockerfile 僅複製建置輸入，編譯後才加入瀏覽器測試。Worker dry-run 加入 `--containers-rollout=none`，驗證與 bundle Worker 時不再額外建置正式容器；正式部署仍建置 production image 並驗證 HTTPS 版本與 readiness。

GitHub layer-cache 實驗 run 34674498977 在 image build／export 花費數分鐘，已取消；最終移除這套快取機制，避免增加比賽短流程的負擔。

基準 deployment run 34673517601：application CI 68 秒、contracts CI 41 秒、deployment job 92 秒；同時執行的獨立 CI run 34673517417 另重複 63 + 31 秒。優化分支 run 34674654411 通過，CI 耗時 59 + 26 秒。[最終 main 部署 34674730346](https://github.com/brianchou452/NxtCommit/actions/runs/34674730346) 全數通過：application CI 61 秒、contracts CI 16 秒、deployment job 91 秒。main 現在只觸發部署 workflow。測得的 CI runner 工作量由 203 降為 77 job-seconds（約減少 62%）；這不是整體部署時間縮短 62%。Application CI 由 68 秒改善至 59–61 秒。Hosted runner 樣本耗時仍會波動。

正式部署 receipt 已確認 commit `974ed8b747aa226de1daad5246655910173dfcfd`。部署後另測四個端點共 12 次，全部 HTTP 200、SQLite ready，延遲 472–901 ms。

| 輪次 | 併發連線 | 請求數 | 錯誤 | p95 ms | 每秒請求 |
|---|---:|---:|---:|---:|---:|
| 1 | 1 | 10 | 0 | 759 | 1.56 |
| 1 | 5 | 50 | 0 | 721 | 7.91 |
| 1 | 10 | 100 | 0 | 675 | 15.18 |
| 1 | 20 | 200 | 0 | 791 | 27.29 |
| 2 | 1 | 10 | 0 | 808 | 1.62 |
| 2 | 5 | 50 | 0 | 679 | 7.42 |
| 2 | 10 | 100 | 0 | 787 | 13.12 |
| 2 | 20 | 200 | 0 | 1372 | 24.66 |

共 720 次 warm HTTP 唯讀請求，涵蓋首頁、bootstrap、SQLite readiness、liveness；由台灣同一台電腦執行兩輪。不是長時間 soak、完整瀏覽器與 assets journey、寫入競爭、LLM、SSE 或最大吞吐測試。測試部署為 Phase 1 foundation，不是尚未合併的 Phase 2 runner。重現命令：`python3 scripts/ci/probe_capacity.py`；需主動執行、請求有上限，展示截止後拒絕發送。

Monitor runs 34674329417、34674395127 均 healthy、沒有告警。過去 24 小時記憶體最高 150007808 bytes（約 143 MiB、容量 14%）、磁碟 0.068%、CPU p95 0.007673（約 0.77%）。Analytics 有延遲，24 小時聚合不能證明壓測當下的 CPU 尖峰。

決定：維持 basic（1/4 vCPU、1 GiB）與單一命名實例，未增加付費資源或 autoscaler。水平副本會分裂容器內暫存 SQLite；只提高 max_instances 也不會改變固定名稱路由。若代表性流量重測持續出現 p95 超過 2 秒，或錯誤伴隨持續資源壓力，再考慮垂直升級 standard-1（1/2 vCPU、4 GiB、8 GB）並重測。Cold start、上游模型延遲不一定是 CPU 不足。評審期間避免 redeploy，以免清除暫存資料；展示前先開站，降低閒置 cold start 風險。既有截止設定保持不變。

[Cloudflare instance types](https://developers.cloudflare.com/containers/platform/limits/) · [Docker GitHub cache](https://docs.docker.com/build/ci/github-actions/cache/)

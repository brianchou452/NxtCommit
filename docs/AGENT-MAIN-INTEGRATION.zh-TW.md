# Agent 整合至 main — 2026-09-12

[English](AGENT-MAIN-INTEGRATION.md)

Merge `554bb59` 合併 fetched main `298764c` 與本機 Agent tip `0900328`，
原始碼版本為 v0.7.20；本機 main 保留雙方歷史。此次未推送 GitHub、部署
Cloudflare、搬移本機執行資料、重啟展示服務或啟用自動更新。

衝突處理保留 A／B／C scripted fixture engine、正式環境 Responses 設定、
請求去重與預算、實測用量、Demo 重設／備份保護及 Cloudflare CI；加入
[操作指南](AGENT-OPERATIONS.zh-TW.md) 所述的 Agent 流程、復原與本機監控。
兩種模型傳輸皆保留取消及有界回覆處理；未知用量保持缺省或 null，快取不重複
累加 token 或匯出產品 trace。新增四項整合測試覆蓋這些共用邊界。
自我更新驗證現在包含全部 foundation／product 互動流程。
提案流程仍使用 Chat Completions，需要具有對應權限的本機金鑰，
不會擴大正式環境受限 Responses 金鑰的權限。

| 合併後原始碼檢查 | 結果 |
| --- | --- |
| 本機型別、測試及建置 | 通過；156 測試、0 失敗、0 TODO |
| 獨立無網路 Docker 測試 | 通過；156 測試、0 失敗、0 TODO |
| 規格 lint／linter 測試／版本 | 通過；127 specs、4 測試、v0.7.20 |
| 整合瀏覽器流程 | 通過；39/39，49.5 秒 |
| 確定性 Chaos benchmark | 通過；114/114，沒有模型呼叫 |
| Approved 視覺比對 | 失敗；40/40 截圖差異，82.3 秒 |
| 完整 `scripts/phase4-gate.sh` | 僅在視覺比對關卡失敗 |

40 項視覺失敗皆為截圖比較，不是環境啟動失敗。主線已於
[Phase 3 證據](PHASE3-INTEGRATION.zh-TW.md) 記錄 40 項待處理差異；
此次合併沒有修改 `src/` 或 approved `e2e/golden/` 圖片，
不宣稱視覺已核准或 Phase 4 全部通過。

本機產物：`test-results/docker/interactive/results.json`、
`test-results/docker/visual-all/results.json` 及對應截圖／trace；
`var/agent-benchmarks/6a88e5e9-cf09-4472-a004-e7105ccbba53/report.json`。
本機與 Docker 檢查紀錄為 `/tmp/nxtcommit-main-phase4.log`、
`/tmp/nxtcommit-main-docker-tests.log`。合併未新增付費模型測試，
先前 live 證據保留於 [分支報告](AGENT-TEST-REPORT.zh-TW.md)。

Main checkout 為 `NxtCommit-delivery`；原 `NxtCommit` checkout 仍持有
執行中的 v0.7.16 Agent workers、本機 Langfuse 與既有展示版本。
自動更新保持關閉、Demo 保護保持開啟。此次原始碼合併不代表執行環境搬移或雲端發布。

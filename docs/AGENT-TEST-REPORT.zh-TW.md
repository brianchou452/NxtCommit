# 本機 Agent 驗證 — 2026-09-12

> **Main 整合，v0.7.20：** 本報告記錄先前隔離分支。Main 現在同時包含 A／B／C scripted fixture engine；下方 54 項 TODO 與 runner 缺失描述屬於當時快照，並非目前 main。

[English](AGENT-TEST-REPORT.md) · [操作指南](AGENT-OPERATIONS.zh-TW.md)

範圍為 `codex/chaos-experiment-agents` 分支上的本機 Chaos、Experiment、
建議角色及受限自我更新流程。核心復原修改為 commit `59a1877`（v0.7.15）。
v0.7.16 後續修改讓 span 與 benchmark 摘要明確呈現模型 fallback，本機檢查同樣通過。
未部署雲端或合併分支。

| 驗證 | 實際結果 |
| --- | --- |
| 本機型別、測試與建置 | 92 通過、0 失敗、54 項既有 TODO；建置成功 |
| 核心 Docker 測試與瀏覽器流程 | 92 通過、0 失敗；12 條 foundation／Computer C 流程全部通過 |
| 規格與版本一致性 | 127 項規格、0 lint 錯誤；版本檢查通過 |
| Chaos benchmark | 19 個故障案例 × 2 次 × 3 組種子，114/114 通過 |
| 真實 CLI 中斷續跑 | 保存 8 個案例後 SIGTERM，結束碼 130；續跑完成 190/190，不重做已保存部分 |
| Worker 強制終止復原 | 實際 SIGKILL 子程序，確認 SQLite 鎖釋放，並在確認 Demo 凍結前還原未完成啟用 |
| 隔離更新：無效 TypeScript | 真實無網路 Docker 驗證拒絕，維持基準版本 |
| 隔離更新：合法修改 | 真實 Docker 關卡及私有應用煙霧測試通過，只啟用隔離測試版本 |

第一輪真實模型 benchmark（`d78cf100-b446-44a3-bee4-18139b929e28`）取得
八份有效 OpenAI 回覆，沒有 fallback。第二輪使用核心 commit `59a1877`
（`2248952e-55f8-487f-a03c-2d806047581f`），共呼叫八次，七份有效回覆，
ChaosPlanner 一次安全 fallback。受控檢查仍通過，但模型可用性為降級。
受限錯誤代碼無法判定原因是供應商不可用或回覆無效；v0.7.16 已在 CLI 摘要
與監控狀態明確呈現此差異。

透過 Langfuse Observations API v2 查回第二輪共 15 筆持久化觀察，其中七次
generation 有供應商回傳的 3,376 tokens。失敗呼叫的用量仍為未知。
確認不含原始 input／output，並具有原始碼身分。這些是入庫與來源驗證，
不是模型語意品質分數。僅修改 metadata 的後續版本未再執行付費 benchmark。

本機證據（ignored 執行檔案）：

- `var/agent-benchmarks/<run-id>/report.json`
- `var/chaos-local/optimization-cli-recovery.json`
- `var/chaos-local/optimization-langfuse-readback.json`
- `var/chaos-local/optimization-update-gates.json`
- `var/self-update-optimized-gates/candidates/<candidate-id>/` 驗證產物

隔離更新使用受控提案 fixture，並非本輪新增的模型修改。基準為既有靜態版本快照，
因此候選關卡執行該快照的測試；新版控制器另有上述 92 項測試證據。
服務中的版本 `8d63b714-cac6-485b-b328-c82a40e380b3` 維持不變。
自動更新保持關閉、Demo 保護保持開啟。背景 Chaos 為有輪數上限的確定性檢查；
必須明確開啟才會呼叫真實模型提供建議。

限制：產品仍有 54 項 TODO，重建版的 mission execution 尚無已註冊 runner。
測試不代表模型語意品質、斷電、多主機／NFS 復原或不限範圍自主開發已完成。
自動修改仍限更新政策中的三個前端檔案。

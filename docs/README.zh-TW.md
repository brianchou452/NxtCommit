# NxtCommit

[English](../README.md) · [協作流程](COLLABORATION.zh-TW.md) · [分支盤點](BRANCHES.zh-TW.md)

Main 已整合 A／B／C 產品切片與既有 Cloudflare delivery。React/Vite 與 Node 24 /
Express / SQLite 實作產品，Python 驗證 YAML。詳見 [Phase 3 證據](PHASE3-INTEGRATION.zh-TW.md)。

## 本機啟動

```bash
npm ci
uv sync --locked
npm run dev
```

Web：http://localhost:5173。API：http://127.0.0.1:4177。開啟 `/demo` 進入
maintainer 或 provider 導覽。Maintainer 可建立 duration fixture campaign、募資、
執行真實 fixture tests，再審核已保存的 diff。Marketplace、profile、留言、投票、reset
與 recovery 共用同一份狀態。

任務推理使用腳本；tests、diff 與本機帳務是真實操作。GitHub 匯入只讀 metadata；
選用建議保留 generator/fallback 標籤。沒有認證、付款、任意 repository 執行或上游
發布。僅在不存在時建立本機 `.env`，key 必須留在 server。API 權限差異見
[開發指南](DEVELOPMENT.zh-TW.md) 與 [OpenAI 操作](cicd/OPENAI.zh-TW.md)。

`npm run test:e2e` 在固定 Docker Chromium 執行所有互動 journey。
`npm run test:visual` 比較全部 40 張 approved references；尚未解決的差異仍屬失敗
門檻。`bash scripts/phase4-gate.sh` 執行兩者。

## 部署與協作

Cloudflare 使用單一 basic container、ephemeral SQLite 與兩小時 idle sleep。
Production image 包含兩個內附 fixtures 與計算 diff 所需 Git。保留既有限定 OpenAI
的 egress：雲端產品建議使用已標示的 fallback，GitHub metadata 匯入需要本機 server
的網路存取。Responses probe 不代表 Chat Completions 建議已驗證。

強制 cutoff 維持 **2026-09-13 01:00 Asia/Taipei**，Workers Paid 保持 active。
Push main 會觸發 CI 與部署，serving SHA 必須另行核對；source 整合不是部署收據。

| 需求 | 文件 |
| --- | --- |
| Ownership 與 merge 流程 | [協作](COLLABORATION.zh-TW.md) |
| 歷史分支快照 | [分支](BRANCHES.zh-TW.md) |
| 整合行為與驗證 | [Phase 3](PHASE3-INTEGRATION.zh-TW.md) |
| Approved 截圖差異 | [視覺審核](PHASE3-VISUAL-REVIEW.zh-TW.md) |
| 部署、監控、rollback 與 cutoff | [Cloudflare 操作](cicd/RUNBOOK.zh-TW.md) |
| Serving revision 與維運證據 | [Checkpoints](cicd/CHECKPOINTS.zh-TW.md) |

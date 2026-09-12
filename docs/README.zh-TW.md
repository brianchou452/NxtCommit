# NxtCommit

[English](../README.md) · [協作指南](COLLABORATION.zh-TW.md) · [分支盤點](BRANCHES.zh-TW.md)

NxtCommit 探索如何將貢獻的 AI 運算轉成可審查的開源進展。目前由 A／B／C 與部署工作線分別重建；本機分支有功能，不代表已整合或已部署。

文件基準為 2026-09-12 的 `e73f296`：main 包含 TypeScript 共用骨架、雙語 shell、SQLite 生命週期、Cloudflare 部署與有界 OpenAI Responses client。產品路由仍為 placeholder；A／B／C 產品實作另見分支盤點。最近記錄的線上版本為 `19ed079`；部署證據以 [checkpoints](cicd/CHECKPOINTS.zh-TW.md) 為準。

## 本機啟動

使用 Node 24.x、npm 與 uv；Python 只負責 YAML 規格驗證。

```bash
npm ci
uv sync --locked
npm run dev
```

前端：http://localhost:5173；API：http://127.0.0.1:4177。
需要伺服器憑證時，僅在 `.env` 尚不存在時由 `.env.example` 建立。不可提交 `.env`，金鑰不可放入 `VITE_` 變數。檢查指令與 worktree 狀態隔離見[開發指南](DEVELOPMENT.zh-TW.md)。

## 文件入口

| 需求 | 文件 |
| --- | --- |
| 新成員加入、分工、整合與交接 | [協作指南](COLLABORATION.zh-TW.md) |
| 每個分支有哪些功能 | [分支快照](BRANCHES.zh-TW.md) |
| 現行指令與設定 | [開發指南](DEVELOPMENT.zh-TW.md) |
| 共用骨架與契約 | [Phase 1](PHASE1-FOUNDATION.zh-TW.md) |
| 部署、監測、回滾與定時關閉 | [Cloudflare runbook](cicd/RUNBOOK.zh-TW.md) |
| OpenAI 串接、換 key 與花費告警 | [OpenAI runbook](cicd/OPENAI.zh-TW.md) |
| 評審證據與操作紀錄 | [Checkpoints](cicd/CHECKPOINTS.zh-TW.md) |
| 完整主題索引與歷史參考 | [文件地圖](COLLABORATION.zh-TW.md#文件地圖) |

Cloudflare 採單一 basic container、暫存 SQLite，閒置兩小時休眠。指定截止時間為 **2026-09-13 01:00 台灣時間**。Workers Paid 保持 Active；關閉應用不會取消訂閱。

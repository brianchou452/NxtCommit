# 開發指南

[English](DEVELOPMENT.md) · [協作指南](COLLABORATION.zh-TW.md)

Main 已整合 Phase 3 A／B／C 與 Cloudflare delivery，source version 為 `0.7.17`。
詳見[整合證據](PHASE3-INTEGRATION.zh-TW.md)；舊版 CommonCommit 的 worker、seed、sandbox 指令不適用於本次重建。

## 安裝與執行

需要 Node 24.x、npm、uv；瀏覽器驗證另外需要可用的 Docker daemon。

```bash
npm ci
uv sync --locked
npm run dev
# Production-style local run:
npm run build
npm start
```

前端預設 5173，API 預設 4177。`vite.config.ts` 的 `/api` proxy 固定指向 4177；改 API port 時也要同步 proxy。

`.env` 為選用且不進 Git；不要覆蓋現有檔案。各 worktree 使用自己的 `.env`、`var/`、依賴與建置結果。共用 Git 歷史不代表共用設定或資料庫。

| Variable | Default | Scope |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | API bind address |
| `PORT` | `4177` | API port |
| `VAR_DIR` | `var` | Local SQLite directory |
| `EXECUTION_MODE` | `auto` | Auto/demo 可執行內附腳本 fixture；llm/codex 拒絕 |
| `RUN_DISPATCH_MODE` | `inline` | Queue 需要獨立 `server/mission-worker.ts` process |
| `OPENAI_API_KEY` | unset | Server-only Responses credential |
| `OPENAI_MODEL` | `gpt-5-mini` | Bounded Responses client |

金鑰權限、換 key、Cloudflare 注入及驗證詳見 [OpenAI 操作文件](cicd/OPENAI.zh-TW.md)。設定 key 不等於產品所有 AI 功能都已接通。

本機 authoring 可設定 Chat Completions；部署 entrypoint 的產品建議維持已標示的
fallback，不重用僅供 Responses 的 credential。既有雲端 egress 僅允許 OpenAI，
因此 GitHub metadata 匯入需使用本機 server；合併時不可默默擴張權限或 egress。

## 提交前驗證

```bash
npm run check
npm run lint:spec
npm run test:spec-tools
npm run check-version
npm run test:e2e
# Separate visual comparison; preserve approved baselines:
npm run test:visual
git diff --check
```

依改動範圍執行對應檢查。純文件修改檢查連結、雙語與差異即可；不可把未執行的測試寫成通過。TODO／skip 與視覺差異要另列；不要為了綠燈更新 approved screenshots。

涉及 image 的修改須同步 Makefile VERSION、k8s nonprod newTag 與雙語 CHANGELOG，並通過版本檢查。純文件不需提高 image version。

SQLite 位於 VAR_DIR；重建 container 可能遺失雲端暫存資料。重設 demo 會修改資料，僅對自己測試用的 instance 操作。詳細驗證與交接欄位見[協作指南](COLLABORATION.zh-TW.md)。

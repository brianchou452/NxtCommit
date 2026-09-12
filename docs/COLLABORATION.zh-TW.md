# 協作指南

[English](COLLABORATION.md) · [分支盤點](BRANCHES.zh-TW.md)

## 開始一項工作

1. 先讀本分支 README、AGENTS.md、分支交接文件及相關規格。根目錄 SKILL.md 在本次盤點的 checkout 中缺少；使用 AGENTS.md 與實際主題文件，不把歷史翻譯當成可執行的新規則。
2. 確認 worktree、分支、base SHA 與未提交修改。不要切換或清除隊員正在工作的 checkout。
3. 在交接中指定負責人、功能範圍、會碰到的共用檔案與預期 terminal outcome。
4. 先核對 shared 契約與 API，再實作模組；共用 registry 變更由整合者統一檢查。


```bash
git status --short --branch
git worktree list
git branch -vv
git log --oneline -5
# Choose an unused directory and branch name for a new task:
git worktree add ../NxtCommit-docs-task -b codex/docs-task main
```

新 worktree 再依開發指南安裝依賴；不要將正式 `.env` 複製到分享檔案或 artifact。需要憑證時依 OpenAI runbook 個別設定。

## 分工與整合

| 工作線 | 主要責任 | 整合時要對齊 |
| --- | --- | --- |
| A／整合者 | shell、community、共用型別與 registry | package/lock、router、migration/reset、i18n、Playwright |
| B | 任務、募資、執行、事件與真實測試證據 | 單一 mission authority、ExecutionEvidenceReader、停止與重設 |
| C | repository 分析、文案、review、operations | 消費 B 的證據，不能將合成 adapter 測試當成真實執行 |
| Delivery | GitHub Actions、Cloudflare、OpenAI、告警與截止 | secrets、來源 SHA、HTTPS receipt、暫存 DB 與成本 |
| Local experiments | chaos 與受限 self-update | 獨立本機狀態、off/demo-lock、不能自動視為雲端功能 |

以上為模組責任，不是假定人員名單。

## 合併前流程

1. Fetch 後比較目標 main 與來源分支；在乾淨整合 worktree 合併，避免覆蓋隊員檔案。禁止 force push 或用整份 ours/theirs 掩蓋衝突。
2. C 已包含在 chaos 分支祖先中，不要重複套用。A/B 是不同工作線；由共用 foundation 整合，再接 mission/evidence port，最後才考慮 optional experiments。
3. 逐項核對 shared exports、route registry、migration/reset 順序、context、i18n、package scripts、Playwright projects、版本與 CI。
4. 保留 main 的 Cloudflare Docker/HTTPS egress、秘密注入、receipt、兩小時 idle、截止與監測。新本機 server wiring 也要核對 deploy/node 的入口，避免只在 localhost 可用。
5. Responses Write key 不能假定能呼叫 Chat Completions。C 與 chaos 的 assistance adapter 使用 `/chat/completions`；整合前須統一 adapter 或明確配置適用權限，並分別驗證本機與雲端；不要直接擴權來掩蓋不相容。
6. 跑相關測試與完整整合旅程，記錄尚未通過的視覺審核。PR／交接先列「使用者行為改變」，再列證據及限制。
7. main 更新後分別確認 CI、deploy 與 `/__deployment` 的 SHA。僅文件更新不代表重新部署。既定截止過後不得靠合併繞過停止保護。

## 交接與評審證據

使用 [slice 模板](SLICE-HANDOFF-TEMPLATE.zh-TW.md)。至少包含 source/target SHA、owner、變更檔案、API/契約、驗證指令及結果、CI/部署連結、未完成項目、回復方式與下一位接手者。

證據要區分：source implemented、offline tests、browser verified、live provider、deployed。測試數不能取代端到端結果；設定存在不能取代實際呼叫；本機生成的 self-update release 不等於 Git commit。操作 checkpoint 追加到 [部署紀錄](cicd/CHECKPOINTS.zh-TW.md)，不包含 secret、完整 env 或敏感 payload。

## 文件地圖

| Document | Scope |
| --- | --- |
| [開發](DEVELOPMENT.zh-TW.md) | 目前 main 的設定與指令 |
| [分支](BRANCHES.zh-TW.md) | 本機、另一份 clone 與快取遠端分支 |
| [規格交付](SPEC-DELIVERY.zh-TW.md) | YAML 到測試／實作映射 |
| [骨架](PHASE1-FOUNDATION.zh-TW.md) | 共用契約的歷史基準 |
| [功能真實性](FEATURE-REALITY.zh-TW.md) | 現況告示與歷史產品背景 |
| [架構](ARCHITECTURE.zh-TW.md) | 架構參考；需對照分支實作 |
| [Agent 架構](AGENT-ARCHITECTURE.zh-TW.md) | 能力與權限界線 |
| [安全](SECURITY.zh-TW.md) | 威脅模型與限制 |
| [LLM 可觀測性](LLM-OBSERVABILITY-PLAN.zh-TW.md) | 規劃／promote gates |
| [實驗紀錄](experiment-report.zh-TW.md) | 帶日期與版本的證據 |
| [Roadmap](PHASE-ROADMAP.zh-TW.md) | 階段規劃，不是部署證明 |
| [GitHub 操作](GITHUB-OPERATIONS.zh-TW.md) | Cloudflare 入口及舊 GitLab/Argo 歷史 |
| [踩坑](GOTCHAS.zh-TW.md) | 不可重編號的事故紀錄 |
| [部署](cicd/RUNBOOK.zh-TW.md) | 本次實際部署操作 |
| [金鑰](cicd/OPENAI.zh-TW.md) | API、換 key 與告警 |

# NxtCommit

[English](../README.md)

A／B／C 切片已整合於 `codex/dev-spec-integration`。前後端使用 TypeScript 與
`shared/` browser-safe 契約；Python 驗證 YAML。詳見 [Phase 3 證據 ledger](PHASE3-INTEGRATION.zh-TW.md)。

```bash
npm ci
uv sync --locked
npm run dev
```

使用 Node 24.x。開啟 `/demo` 啟動 maintainer 或 provider 導覽。Maintainer 流程會
分析內建 duration fixture、建立本機提案、贊助、執行實際 fixture 測試，再呈現
已儲存的 diff 供本機審核。Home、Marketplace、profile、留言、投票、reset、
recovery 與獨立 design concepts 都有雙語控制。

任務修改使用腳本；測試、diff、本機帳務與儲存是真實機制。公開 GitHub 匯入
只讀 metadata，選用模型輔助保留 generator／fallback 標示。沒有認證、付款、
任意 repository 執行或上游發布；本次整合也不部署。

`npm run test:e2e` 在固定版本 Docker Chromium 執行全部互動 journey。
`npm run test:visual` 比較 A／B／C 全部 approved reference。歷史視覺差異仍是
未通過的 gate，不代表可以覆寫 approved PNG。
`bash scripts/phase4-gate.sh` 執行完整交付檢查。

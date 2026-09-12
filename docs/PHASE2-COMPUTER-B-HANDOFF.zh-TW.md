# 電腦 B / Phase 2 交接

[English](PHASE2-COMPUTER-B-HANDOFF.md)

狀態：電腦 B / Phase 2 已經獨立 verifier 完成功能 verified。
歷史 visual baseline 的像素一致性尚未核准，也不宣稱通過。

分支：`dev/computer-b`。基底：`origin/main` 的 `32f8b28`。
範圍：mission lifecycle、compute accounting、funding、execution、requests、
recovery、mission detail 與 execution room；不代表 A/C 切片或產品部署完成。

使用者於 2026-09-12 授權 B 所需的最小中央接線：application 初始化／reset／
shutdown、兩個 React routes、locale fragments 與 browser test discovery。
A 整合時需保留這些接線。

## 實作前的 visual oracle 檢視

已在 visual 實作前開啟所有 13 張 approved PNG：

| Baselines | 檢視到的構圖與 anchors |
| --- | --- |
| `mission-detail-funding`、`mission-detail-funded-fixture`、`mission-detail-metadata-refusal`、`mission-detail-needs-review` | 長篇 editorial campaign；大型標題、深色專案圖、紫色 funding rail，左側敘事與右側 action card；下方為 story、criteria、compute、community。不同狀態改變 action 與 funding facts。 |
| `mission-detail-error-recovery` | 留白 shell、寬幅虛線 recovery panel、置中 not-found 訊息，沒有舊 campaign。 |
| `execution-room-idle`、`execution-room-queued` | Mission 返回連結與狀態標題，下方寬幅 empty-state panel；queue ownership 與 runner activity 分開。 |
| `execution-room-terminal`、`execution-room-running-demo` | Phase rail 下方密集雙欄：左側 source-labelled timeline，右側 budget/tests/files/guardrails；terminal 有 review action，running 有 activity label。 |
| `mission-overview-funding` | 大型標題、專案圖、funding amount 與 progress 主導圓角漸層卡片。 |
| `pledge-dialog-ready`、`pledge-dialog-error` | 約 448px modal；標題、說明、wallet、剩餘額度、數字欄位、Max 與底部 actions；error 插入紅色文字並保留 amount。 |
| `execution-activity-terminal` | 圓角邊框 timeline、左側 event rail、timestamp、source badge、有界 test output 與 file chips。 |

歷史圖片使用舊 seed 金額與文案，也與目前 foundation shell 不同。
使用者於 2026-09-12 明確授權依現行 YAML 與實際 fixture 實作，保留既有 golden
並回報差異；這不代表新 baseline 已獲核准。

## 驗證

- 初始 spec lint：125 specs、0 contract errors、0 missing test files。
- Spec tooling regression tests：4 項通過。
- 獨立 `npm run check`：通過（52 個 Node checks 通過、47 個 A/C TODO、
  0 failures），包含兩個 TypeScript targets 與 production build。
- 獨立 backend suite：24/24 通過；atomic ownership-fenced settlement 修正後，
  三個 stale-owner 反例亦通過。
- 獨立 Docker foundation + mission：13/13 通過（foundation 4 + B 9）。
- 最後追加 B Docker：10/10 通過，包含真 UI retry 後延遲送達的舊 run 與跨 mission SSE frame。
- Worker entrypoint 追加驗證：queue suite 12/12 通過，包含只共用 `VAR_DIR` 的真實
  web／worker processes，以及強制 real mode 的拒絕執行。
- `make check-version`：`0.7.11` 一致。`git diff --check`：通過。
- Visual：保留全部 13 個歷史 baselines，比對存在差異；使用者授權 YAML／fixture
  優先，不代表核准替換 approved PNG。
- 最終 visual capture：完整執行有 12 張穩定比較；metadata-refusal 首次逾時，
  單獨重跑後取得穩定截圖。13 張仍是歷史 golden mismatch，不是 visual 通過。
- 交付：實作 commits `e8f683d`、`0883102` 已推送至 `dev/computer-b`；
  [PR #2](https://github.com/brianchou452/NxtCommit/pull/2)。未合併、部署或線上驗證。

## Runtime 與重現

`server/app.ts` 安裝 B 的 migration／seed／service 並加入 reset participant。
`server/services/mission-services.ts` 掌管 mutation／settlement；
`server/services/mission-engine.ts` 掌管 fixture 副本、實際 Node tests、Git diff
與 deterministic reviewability gate。同步 `context.evidence` reader 是 B→C 接口。

本機預設流程使用 Node 24：

```sh
npm run check
npm run test:e2e -- --project=mission
npm run test:e2e -- --project=mission-visual
npm run dev
```

從 `/missions/mission-fixture` 開始，在 dialog pledge 100 本機 demo credits，
會啟動執行並抵達持久化 reviewable 結果。Fixture baseline 實際執行兩項測試，
final suite 三項，Git diff 兩個檔案。`mission-ready` 已募滿、`mission-metadata`
示範拒絕執行、`mission-terminal` 明確標示歷史 authored evidence，不是新執行。

`npm run build` 後若使用獨立 queue worker，兩個 processes 必須共用 `VAR_DIR`：

```sh
RUN_DISPATCH_MODE=queue EXECUTION_MODE=demo VAR_DIR=var npm start
EXECUTION_MODE=demo VAR_DIR=var node dist-server/server/mission-worker.js
```

Worker 可用明確的 `DATABASE_PATH` override；否則與 web 共用
`VAR_DIR/nxtcommit.sqlite`。Queue acceptance 不代表 worker 已擁有 run。
強制 `llm`／`codex` modes 仍拒絕執行。

## 驗收邊界

[Coverage ledger](PHASE2-COMPUTER-B-COVERAGE.zh-TW.md) 對應 34 specs、30 scenarios、
runtime／tests 與 13 visual baselines。B 沒有必要但尚未接上的中央入口。
A/C 仍負責 explanation、wall、review 與其他產品切片；B 顯示局部錯誤 fallback
與 review 導航連結，不宣稱目的頁的 review decision 流程已實作。

B 未實作 LLM／Codex tool loops、付款、身份驗證、上游發布或 per-run OS isolation。
Credits 是本機原型單位；測試套件 evidence 不代表逐條 acceptance criterion 都已
獨立驗證，未知量測仍為 unknown。目前保留 disposable execution workspace 供診斷，
沒有提供 storage quota／reaping。

細部測試限定：同 SPA delayed mutation 已驗證離開再返回相同 mission；不同 mission-id 的延遲 REST read 尚未獨立測試。跨 mission／舊 run 的延遲 SSE 已由新增 browser fault injection 驗證，不能與上述 REST 限定混為一談。功能 verified 不等於歷史 visual approved。

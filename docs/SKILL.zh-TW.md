# NxtCommit 維護者 Skill（繁中參考）

[English canonical](../SKILL.md)

> 這是給人閱讀的繁中翻譯，不是另一份可執行 skill。Coding agent 必須以
> repo 根目錄的 `SKILL.md` frontmatter 與英文內容為唯一來源。

## 先選對資料來源

不要先相信既有說法，應先檢查實作。只讀取任務所需的 canonical 文件：

- 元件、執行流程、狀態與資料請讀 `docs/ARCHITECTURE.md`。
- 修改 runner、工具、guard、repo 輸入、秘密或隔離前，先讀 `docs/SECURITY.md`。
- 安裝、設定、測試與版本流程請讀 `docs/DEVELOPMENT.md`。
- 建置、rollout、驗證或 rollback 請讀 `docs/DEPLOYMENT.md`。
- GitHub／GitLab／Argo 歷史、證據、鏡像憑證與 CI 排錯請讀 `docs/GITHUB-OPERATIONS.md`。
- 在宣稱某功能使用真實 LLM、真實外部資料或真實外部效果前，先讀 `docs/FEATURE-REALITY.md`。
- 新增 model-assisted feature、prompt、Langfuse trace／score／dataset 或 AI
  優化 dashboard 前，先讀 `docs/LLM-OBSERVABILITY-PLAN.md`。
- 擴張範圍前請讀 `docs/ROADMAP.md`；不可把 roadmap 工作描述成已實作。
- 規劃中的實驗與 go／no-go 門檻請讀 `docs/VALIDATION-EXPERIMENTS.md`；只有帶日期的實際結果才讀 `docs/experiment-report.md`。

先執行 `git status`，保留與任務無關的使用者變更。

修改 executable YAML spec 時，schema、linter、英文與繁中 spec guidance、BDD
連結及受影響 contract 必須在同一個變更中同步。API spec 涵蓋 `/api/`，以及僅限
`/healthz`、`/readyz`、`/metrics`；不可為了方便而放寬 root path allowlist。

## 維持真實性邊界

1. 把引擎觀測與 runner 主張分開。工作區建立、最終測試、diff 計算、帳務、狀態轉換及確定性 review gate 必須由引擎掌握。
2. 真實執行成功進入 `needs_review` 的唯一閘門維持為 `computeReviewable()`。Seed 與復原例外必須明顯標為未驗證；每次修改閘門都要補 regression test。
3. 驗證指令只能從 repo 事實推導，不可採用模型輸出。
4. 模型控制的 `LlmRunner` 工作區存取必須經過受限工具。確定性 prefetch 需另行稽核；目前固定檔案讀取不共用工具 containment。路徑圍堵、秘密遮罩、evidence fencing、既有測試保護與硬式 write denylist 都必須保持確定性。
5. 不可把 LLM 工具 denylist 說成所有 runner 共用。`CodexRunner` 使用另一條 SDK 工作區寫入路徑，必須獨立做安全分析。
6. Judge 只提供建議，不得讓 run 晉級或被捨棄；`static` 輸出不可標成 `llm` review。
7. 保留明確 provenance。預載事件使用 demo source；只有引擎觀測可取得 engine verification 標籤。
8. 刻意交還人類處理用 `stalled`；執行未成功才用 `failed`。
9. 秘密只能留在 server 端，不得進入子行程環境、模型證據、UI payload、log、metrics、測試或文件。
10. 任意 GitHub repo 都不可執行。per-run isolation 現在已經存在，也在本機通過 SEC-00，所以關卡不再是「等它做出來」，而是等它在**部署環境裡**存在（GKE Pod 沒有 Docker daemon）、等 AG-02 不再 failed、以及等計畫書要求的威脅模型評估完成。目前 GitHub 匯入只讀 metadata。
11. 不得宣稱此原型會驗證維護者、推送 branch、建立 PR、tag repo、發布套件或量測真實採用。
12. 未知量測必須保持缺值，不可用零或 demo 常數補入。

## 依變更類型找檔案

| 變更 | 主要檔案 | 最低限度目標驗證 |
| --- | --- | --- |
| 任務生命週期、重試、帳務、重設 | `server/engine/engine.ts`、`states.ts` | engine 與 state tests |
| Review gate、寫入政策、fencing、redaction | `server/engine/guard.ts` | `guard.test.ts` |
| LLM 工具、預算、submission | `server/engine/tools.ts`、`runners/llmRunner.ts` | `tools.test.ts` |
| Codex 行為 | `runners/codexRunner.ts`、Docker／package resolution | 本機 binary test 與 server tests |
| 環境偵測或測試解析 | `sandbox.ts`、`workspace.ts` | 以捕捉的 reporter fixture 跑 workspace tests |
| Analyzer 或 feasibility | `server/ai/analyzer.ts`、`feasibility.ts` | analyzer tests 與 held-out evaluator |
| Campaign 生成 | `server/ai/campaign.ts`、`llmClient.ts` | 目標 server tests 與 mode labelling |
| API 或儲存的 domain shape | `server/api.ts`、`store.ts`、`shared/types.ts` | typecheck 與受影響 lifecycle tests |
| UI 文案 | `src/i18n/en.ts`、`src/i18n/zh-TW.ts` | `server/i18n01-parity.test.ts`、typecheck 與人工雙語流程；不可 inline `locale ===` 翻譯 |
| 部署 | `Dockerfile`、`Makefile`、`k8s/`、`deploy/` | render manifests、build identity、readiness 與 live version |

新增工具或放寬控制時，測試必須真的嘗試逃逸路徑。優先用可機器判讀的理由拒絕，而不是只靠 prompt 指令。

## 以端到端結果證明 executable spec

Schema lint、route 已註冊、請求被接受、component 可 render 或 visual snapshot
通過，都不能單獨證明 executable scenario 已完成。每個負責的 scenario 都必須
指出 runtime authority、integration wiring、terminal observable outcome，以及當
流程在結果前停止時會失敗的測試。非同步流程必須在有界 timeout 內進入文件化的
terminal 或 recoverable state；run row、queue record、動畫或 `2xx` dispatch
response 都只是中間證據。

垂直切片交付前，填寫 [`SLICE-HANDOFF-TEMPLATE.md`](SLICE-HANDOFF-TEMPLATE.md)，
列出已實作 specs、runtime entrypoints、contract 與 outcome tests、仍需中央接線的
事項，以及所有已知未完成行為。Foundation、placeholder、未註冊 dispatcher、
seed artifact 或 UI state transition 都不可回報為完成的 execution。

整合期間依 [`SPEC-DELIVERY.zh-TW.md`](SPEC-DELIVERY.zh-TW.md) 維護跨切片證據
ledger。每次 merge 後至少驗證一條受影響 journey，涵蓋 reset、persistence、API、
client action、背景工作、terminal evidence 與 recovery。共用 reset 必須恢復每個
切片需要的完整 demo graph。

## 驗證變更

依 lockfile 安裝，迭代期間執行目標檢查。提交 code 或 configuration 前執行：

```bash
npm run check
```

這會檢查兩個 TypeScript 專案、執行 fixture 與 server tests、建置前端並打包 server。修改 UI 行為時還要手動走過瀏覽器流程，因為目前沒有 browser automation suite。

宣告 multi-slice 或 executable-spec 整合完成前，執行
`bash scripts/phase4-gate.sh`。檢查 runtime source 中的 `TODO`、`placeholder`、
`foundation`、`not registered` 與 `not implemented` 等明確未完成標記；必須修正，
否則把受影響 spec 記為 incomplete。Execution 變更還必須讓一個 eligible fixture
抵達 terminal run 並留下 engine evidence，同時確認 metadata-only repository 仍被拒絕。

只有需要真實憑證檢查時才使用 `make validate-llm`。只回報不含秘密的證據，絕不可印出 key。

## 更新文件但不製造矛盾

只修改負責該事實的 canonical owner：

| 事實 | Owner |
| --- | --- |
| 產品範圍與快速開始 | `README.md` 與忠實翻譯 `docs/README.zh-TW.md` |
| 本機開發與設定 | `docs/DEVELOPMENT.md` 與 `.env.example` |
| 現行設計 | `docs/ARCHITECTURE.md` |
| 威脅模型與保證 | `docs/SECURITY.md` |
| 維運 | `docs/DEPLOYMENT.md` |
| GitHub／GitLab／Argo 交付證據與事故操作 | `docs/GITHUB-OPERATIONS.md` |
| LLM／demo 分類與外部效果真實性 | `docs/FEATURE-REALITY.md` |
| 規劃中的 LLM 擴充、trace／score 契約與優化迴圈 | `docs/LLM-OBSERVABILITY-PLAN.md` |
| 尚未完成的工作 | `docs/ROADMAP.md` |
| 已發布變更 | `docs/CHANGELOG.md` |
| 規劃中的實驗與 go／no-go 門檻 | `docs/VALIDATION-EXPERIMENTS.md`，繁中對照為 `docs/VALIDATION-EXPERIMENTS.zh-TW.md` |
| 可重現實驗 | `docs/experiment-report.md` |
| 事故脈絡與穩定教訓 | `docs/GOTCHAS.md`，繁中對照為 `docs/GOTCHAS.zh-TW.md` |
| 產品與網站方向 | `docs/PRODUCT-DIRECTION.md`，繁中對照為 `docs/PRODUCT-DIRECTION.zh-TW.md` |

應連到 canonical 內容，不要在多處重新發明說法。GOTCHAS 的 G 編號是穩定歷史識別碼；新增事故只可在末尾增加，不得為了精簡刪除或重新編號。修法過時時應標示目前狀態，而不是刪除原始脈絡。

## 安全地管理版本與 release

Image 相關原始碼有變更時，須在同一 commit 同步調整：

1. `Makefile` 的 `VERSION`；
2. non-production overlay 的 `newTag`；
3. Changelog 第一個已發布的 `## v...` 項目。

執行 `make check-version`。只有文件變更時不需增加 image 版本，除非變更的檔案會被複製進 image。

只能從乾淨的 image-relevant tree 建置。`make build-dirty` 的產物只供本機使用且不可部署。除非使用者明確要求外部動作，不得部署、推送 image、修改 cluster secrets 或外部 GitOps repo。

使用者要求部署時，rollout 後要驗證實際服務中的 build identity。不可從 build 成功、mirror workflow 綠燈或 repo 裡存在檔案，推論 live state。

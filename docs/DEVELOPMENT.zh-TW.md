# 開發

> **Local resilience update (2026-09-12):** Node 24 本機 Chaos／實驗流程、命令、本機部署及停止行為，請見 agent 操作手冊。 [Runbook](CHAOS-AGENTS.zh-TW.md).

> Phase 1 重建使用 Node 24.x 與[骨架開發流程](PHASE1-FOUNDATION.zh-TW.md)。所有 runner mode 仍拒絕執行，下方先前完整應用的指令需後續模組支援。

[English](DEVELOPMENT.md)

本指南是本機設定、組態、驗證與儲存庫變更流程的規範文件。產品範圍屬於根目錄的 README；系統行為屬於 `ARCHITECTURE.md`；安全性聲明屬於 `SECURITY.md`。

## 先決條件

- Node.js 22.12 或更新版本。伺服器使用內建的 `node:sqlite` 模組。
- Git。執行引擎會在每個 fixture 工作區內建立 Git 基準。

請精確安裝 lockfile 所記錄的內容：

```bash
npm ci
```

## 本機開發

```bash
cp .env.example .env  # optional
npm run dev
```

此指令會啟動兩個行程：

| 行程 | 預設 URL | 實作 |
| --- | --- | --- |
| API | `http://localhost:4177` | `tsx watch server/index.ts` |
| Web | `http://localhost:5173` | Vite，將 `/api` 代理至 4177 連接埠 |

Vite 代理直接設定於 `vite.config.ts`。只變更 `PORT` 會改變 API 連接埠，但不會變更開發環境代理。

不需要任何憑證。使用預設的 `EXECUTION_MODE=auto` 時，未設定的 checkout 會以明確標示的示範模式執行。

## 本機模擬正式環境執行

```bash
npm run build
npm start
```

`npm run build` 會同時建立 `dist/` 與 `dist-server/`。`npm start` 只會啟動既有的伺服器 bundle；它不會先執行建置。

## 組態

伺服器會載入 `.env`，但不會覆寫行程環境中已存在的變數。

| 變數 | 預設值 | 用途 |
| --- | --- | --- |
| `PORT` | `4177` | Express 連接埠；容器會設為 8080 |
| `EXECUTION_MODE` | `auto` | `auto`、`demo`、`llm` 或 `codex` |
| `RUN_DISPATCH_MODE` | `inline` | `inline` 由 web process 執行；`queue` 需要獨立 `npm run worker` process 與共用 durable `VAR_DIR`。此設定本身不提供 OS isolation。 |
| `ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION` | 未設定 | 在**沒有**已驗證作業系統邊界的情況下執行 `llm` 或 `codex` 前，必須精確設為 `1`；這只是本機風險確認，不是隔離控制。請優先使用 `make sandbox-image`，它是真的把邊界掙到手，而不是嘴上承諾有邊界 |
| `SANDBOX_ISOLATION` | 未設定 | 設為 `process` 可強制走行程層級退回路徑，並跳過容器探測。這在測試中很有用 —— 測試不該取決於這台機器有沒有 Docker |
| `OPENAI_API_KEY` | 空值 | LLM 執行與真實活動產生 |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI 相容的 chat-completions 基底 URL |
| `CAMPAIGN_MODEL` | `gpt-4o-mini` | 活動產生模型 |
| `EXECUTION_MODEL` | `gpt-5.5` | LLM 執行器與建議性審查模型 |
| `LANGFUSE_PUBLIC_KEY` | 空值 | Langfuse 公開金鑰 |
| `LANGFUSE_SECRET_KEY` | 空值 | Langfuse 秘密金鑰 |
| `LANGFUSE_BASE_URL` | 空值 | Langfuse 端點；三個 Langfuse 值缺一不可 |
| `GITHUB_TOKEN` | 空值 | 提高唯讀 GitHub 分析的速率限制 |
| `DEMO_SPEED` | `1` | 腳本化示範事件的延遲倍數；0 表示立即執行 |
| `VAR_DIR` | `./var`，再退回作業系統暫存目錄 | SQLite 資料庫與執行工作區 |

`APP_VERSION`、`APP_COMMIT` 與 `APP_SOURCE_TREE` 由映像建置注入，並透過 Prometheus build-info 指標匯出。它們不是一般的開發者設定。

真實代理執行採安全預設，而現在有**兩條互相獨立**的路徑可以通過這道閘門。強制指定的
`llm` 或 `codex` 會在下列任一條件成立時執行：引擎已經**實測**到每次執行各自的 OS 邊界
（執行 `make sandbox-image`，引擎會真的把工作區掛進容器來確認），**或者**設定了
`ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1`。

這兩者並不等價。前者是量測出來的；後者只是「這台主機可以丟掉」的口頭承諾，**完全不提供
任何保護**，存在的唯一理由是讓沒有 Docker 的筆電也能開發 runner。共享部署不得設定它，
而且它不能滿足
[SEC-00 P0 閘門](VALIDATION-EXPERIMENTS.zh-TW.md#sec-00--每次執行的-os-隔離與逃逸防護) ——
在本機，經實測的邊界可以。GKE Pod 內沒有 Docker daemon，所以**不管旗標怎麼設，那裡都尚未
達成這道閘門**。

`auto` 與強制指定模式不同，這個不對稱是刻意的。經實測的邊界**不會**把 `auto` 升級成真實
runner：隔離回答的是「這樣執行安全嗎」，而不是「操作者要求了嗎」，而在環境裡發現一把
credential 並不等於同意。只有 `ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1` 會讓 `auto` 解析到
`demo` 之外 —— 這也是為什麼下面那條解析鏈被描述為「在該選擇之後」。

明確選擇承擔本機風險後，`auto` 的模式解析是決定性的：

1. 當 bundled／本機 CLI 與 Codex 驗證可用，或可使用 OpenAI 官方平台金鑰時，使用 `codex`。
2. 否則，當 `OPENAI_API_KEY` 存在時使用 `llm`。
3. 否則使用 `demo`。

強制指定的模式不會退回其他模式。活動產生有自己獨立的 `openai` 或 `demo` 選擇，與任務執行的設定不同。

## 指令

| 指令 | 執行內容 |
| --- | --- |
| `npm run dev` | 同時執行 API watcher 與 Vite |
| `npm run dev:server` | 僅執行 API watcher |
| `npm run dev:web` | 僅執行 Vite |
| `npm run typecheck` | 瀏覽器與伺服器的 TypeScript 專案 |
| `npm run test:fixture` | `fixtures/tempo` 的 Node 測試套件 |
| `npm run test:server` | 引擎、狀態、防護、工具、評審、分析器與工作區測試 |
| `npm test` | 先執行 fixture 測試，再執行伺服器測試 |
| `npm run build` | 前端建置與伺服器 bundle |
| `npm run check` | 型別檢查、測試與建置 |
| `npm run seed` | 強制以示範資料取代本機狀態 |
| `make sandbox-image` | 建置 `commoncommit/sandbox:1`，也就是每次執行專屬的隔離 image。在它存在之前，引擎會退回行程層級控制，並如實說明這件事 |
| `npm run sec00` | SEC-00 隔離實驗：七個攻擊向量 × 20 次重複 × 2 種隔離模式，並在 `evidence/` 下寫出證據包 |
| `make validate-llm` | 傳送最小化的憑證驗證請求 |

此儲存庫目前沒有瀏覽器或元件測試套件。`npm run check` 會驗證 TypeScript、伺服器行為、fixture 執行與正式環境編譯；UI 操作流程仍需以瀏覽器手動驗證。

`npm run check` 內含各項驗證實驗 harness（`pd01`–`pd03`、`ag02`–`ag04`、`sec01`、
`data01`、`i18n01`、`rec01`）。它們是決定性的、離線的，凡會碰到引擎的都固定為
`SANDBOX_ISOLATION=process`，所以它們量測的是程式碼本身，而不是這台機器有沒有 Docker。
其中有幾項斷言的是一個量測到的**缺口**，而不是一項保證；當你修好其中一項時，請在同一次
變更裡把它的斷言反轉過來，讓那個曾經記錄缺陷的測試，變成防止它回歸的守門人。

`npm run sec00` 刻意**不**列入 `npm run check`：它需要 Docker daemon、要跑好幾分鐘，而
它的判定屬於一份帶日期的證據包，不屬於一個在沒有 Docker 的機器上會默默通過的成敗閘門。
若它在環境中發現一組看起來是真的憑證，就會拒絕啟動 —— 因為它的 payload 本來就是刻意去讀
父行程環境的。

可另外使用可行性語料評估器：

```bash
npx tsx server/cli/eval-feasibility.ts path/to/corpus.jsonl --split=test
```

## 本機資料

SQLite 資料與執行工作區位於 `VAR_DIR` 下。一般 checkout 中會是 `var/`，且已被 Git 忽略。只有在可以接受本機狀態遺失時，才能刪除或移動該目錄。

CLI 只能在伺服器停止時使用：

```bash
npm run seed
```

應用程式執行期間，請使用 UI 或 `POST /api/demo/reset`。該端點會先取消進行中的執行，再取代 seed 資料。CLI reseed 指令不會與行程內引擎協調，可能和進行中的執行發生競態。

## 變更流程

1. 閱讀待變更領域的規範文件。
2. 檢查實作；不要在未核對的情況下直接照搬目前文件中的聲明。
3. 做出最小且連貫的變更，並為變更的行為加入迴歸測試。
4. 反覆開發時執行針對性測試，提交前再執行 `npm run check`。
5. 只更新受變更影響的規範文件。

高風險領域：

| 變更 | 必要檢查 |
| --- | --- |
| 審查閘門、寫入規則、遮蔽或證據圍籬 | 更新並執行 `server/engine/guard.test.ts` |
| 代理工具或送出閘門 | 更新並執行 `server/engine/tools.test.ts` |
| 狀態轉換、帳務、重設或發布 | 更新並執行引擎／狀態測試 |
| 測試指令偵測或輸出解析 | 使用真實 reporter fixture 更新工作區測試 |
| 分析器或可行性評分 | 更新分析器測試，並在 held-out 資料上評估 |
| 使用者可見文案 | 文案放進兩份 locale dictionary（不可用 `locale === ...` inline 分支），並執行 `server/i18n01-parity.test.ts` |

I18N-01 是 delivery gate，不是可延後的清理。移除 call site 時也要移除 dead
keys；安全性與 provenance 限定詞在兩種語言必須等價。Full check 前先跑目標
parity harness。

變更執行器、沙箱、儲存庫輸入、秘密或部署隔離前，請先閱讀 `SECURITY.md`。

需要時可直接執行單一伺服器測試檔案：

```bash
node --import tsx --test server/engine/guard.test.ts
node --import tsx --test server/engine/tools.test.ts
```

## 版本管理

部署版本刻意與私有 npm 套件中繼資料分開。對於會影響映像的變更，請在同一個 commit 中更新以下三處：

1. `Makefile` 中的 `VERSION`；
2. `k8s/overlays/nonprod/kustomization.yaml` 中的 `newTag`；
3. `docs/CHANGELOG.md` 中第一個已發布版本。

接著執行：

```bash
make check-version
```

僅文件與僅 manifest 的變更不需要調升映像版本，除非它們也變更了會複製進映像的檔案。請在 changelog 記錄發布或使用者可見的變更；不要為每一項編輯性修改建立發布項目。

## 文件歸屬

為避免過去曾發生的內容漂移，每項事實都只有一個規範歸屬。入口文件與安全關鍵 runbook 可以摘要邊界，但詳細聲明應放在下列歸屬文件：

| 主題 | 規範檔案 |
| --- | --- |
| 產品承諾與快速開始 | `README.md` |
| 本機設定與貢獻者流程 | `docs/DEVELOPMENT.md` |
| 目前系統設計 | `docs/ARCHITECTURE.md` |
| 威脅模型與控制措施 | `docs/SECURITY.md` |
| 部署與維運 | `docs/DEPLOYMENT.md` |
| GitHub／GitLab／Argo 交付歷史與證據 | `docs/GITHUB-OPERATIONS.md` |
| 真實 LLM、非 LLM、demo 與外部效果狀態 | `docs/FEATURE-REALITY.md` |
| 規劃中的 LLM 功能、可觀測性 schema、評估與晉級 | `docs/LLM-OBSERVABILITY-PLAN.md` |
| 未完成工作與非目標 | `docs/ROADMAP.md` |
| 發布歷史 | `docs/CHANGELOG.md` |
| 規劃中的實驗與 go／no-go 條件 | `docs/VALIDATION-EXPERIMENTS.md` |
| 可重現的證據 | `docs/experiment-report.md` |
| 事件歷史與持久教訓 | `docs/GOTCHAS.md` |
| 產品與網站方向 | `docs/PRODUCT-DIRECTION.md` |
| 程式代理流程 | `SKILL.md` |

英文檔案是規範版本；每份索引文件都有忠實的 `.zh-TW.md` 對應版本供讀者使用。請在同一次文件變更中更新兩種語言。請連結至規範說明，不要另行創造第二套聲明。

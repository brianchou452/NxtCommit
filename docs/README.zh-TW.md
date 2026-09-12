# NxtCommit

> 此 checkout 包含 Phase 1 骨架及電腦 A／Phase 2 Home/community。前後端使用
> TypeScript 與 `shared/` browser-safe 契約；Python 僅用於 YAML 驗證。
> 使用 Node 24.x，執行 `npm ci`、`uv sync --locked`、`npm run dev`。
> Home、Marketplace、profile、留言、類別投票、reset 與導覽啟動／恢復已有雙語實作。
> `npm run test:e2e` 執行 Docker 互動驗證；B/C 的 execution／authoring 尚未整合，
> 沒有 runner 或 model call。Approved PNG 保留，未宣稱完整 Phase 2 verified。
> 分工、證據與未完成門檻見 [Phase 2 交付文件](PHASE2-COMPUTER-A.zh-TW.md)，
> 舊 checkpoint 見 [Phase 1 文件](PHASE1-FOUNDATION.zh-TW.md)。以下產品說明是匯入歷史背景。

把閒置的 AI 運算額度，轉成可審查的開源進展。

[English](../README.md)

NxtCommit 是一個開源維護群眾募資的實驗性原型。維護者提出具體任務，貢獻者認捐運算點數，AI 執行器在內建程式庫的受限副本中工作；測試結果、程式碼差異、狀態轉換與送審條件則由引擎掌握，不由執行器自行宣稱。探測確認邊界可用時，工作區還會取得每次執行專屬的作業系統邊界；已部署的 pod 沒有這道邊界，而執行中的應用會回報它實際擁有哪一種，不會留給你自己猜。

```text
認捐點數 → 執行任務 → 驗證測試與 diff → 人工審查 → 記錄發布
```

> NxtCommit 目前展示的是完整工作流程，不是正式的 GitHub 自動化服務。它不會驗證使用者身分、不會推送分支、不會真的建立 Pull Request，也不會替上游專案打標籤或發布套件。

## 目前可用的功能

- 英文與繁體中文介面，涵蓋市集、任務、執行、審查與貢獻者頁面。
- 可重現的 demo 任務：真的修改內建 fixture，並真的執行該 fixture 的測試。
- 最多 14 回合的 LLM 工具迴圈，提供讀取、文字搜尋、寫入、測試、送出與棄權能力；呼叫、讀取、列舉與寫入預算都會強制執行。
- 由引擎管理狀態機、運算帳本、測試證據、diff 與諮詢式程式碼審查。
- 唯讀的 GitHub 公開 metadata 與 issue 分析。
- 結構化日誌、Prometheus 指標、選用的 Langfuse 追蹤、Docker 與 non-production Kubernetes overlay。

目前的能力邊界：

- 只有內建的 `fixture` 工作區可以執行。GitHub 匯入只讀 metadata，不會 clone 或執行該 repo。
- 畫面上的變更證據包只包含建議分支名稱與 diff；不是 GitHub Pull Request，也不會推送到遠端。
- 核可與發布只會更新 NxtCommit 的本機資料，不會驗證維護者身分，也不會呼叫套件 registry。
- 預載採用數據與腳本事件都必須標為 demo data。
- 探測確認邊界可用時（它會真的把工作區根目錄 mount 進容器，再讀回一個 token），每次執行都會取得一個具備獨立 PID、mount、network namespace 的容器 —— 這是 kernel 邊界，不是 hypervisor 邊界。確認不到時，執行只會退回應用層控制，而**目前部署的 Pod 就屬於後者**。無論哪一種，都不可用它在共享環境執行任意第三方 repo：那需要邊界在部署環境裡真的存在，也需要一次還沒發生的威脅模型評估。

完整威脅模型請讀[安全與信任邊界](SECURITY.zh-TW.md)。

## 快速開始

需求：Node.js 22.12 以上與 Git。

```bash
git clone https://github.com/ianjuantw/commoncommit.git
cd commoncommit
npm ci
cp .env.example .env  # 選用
npm run dev
```

開啟 <http://localhost:5173>。API 預設位於 `http://localhost:4177`，SQLite 資料庫會在第一次啟動時自動建立並載入示範資料。未設定憑證時，系統會選用並標示 demo 執行器。

體驗完整流程：

1. 開啟接近募資完成的 `tempo-duration` 任務。
2. 認捐剩餘點數，讓執行自動開始。
3. 觀察第一次測試失敗、第二次修正後通過。
4. 檢查產生的 diff，然後核可或要求修改。

頁尾的「重設示範資料」可恢復初始狀態。

## 執行模式

在 `.env` 設定 `EXECUTION_MODE`：

| 模式 | 行為 | 所需憑證 |
| --- | --- | --- |
| `demo` | 推理文字與補丁為腳本；實際觸發的執行仍由引擎跑 fixture 測試並計算真實 diff。 | 無 |
| `llm` | 透過 OpenAI 相容的 chat-completions endpoint 執行最多 14 回合的工具迴圈；呼叫／讀取／列舉／寫入預算會強制執行。 | `OPENAI_API_KEY`，外加「已量測的每次執行 OS 邊界（`make sandbox-image`）」或「下述不安全本機 opt-in」其中之一 |
| `codex` | 本機開發用的 Codex SDK 執行器；它不走有界 LLM 工具，而且目前 production image 未打包其 CLI dependency。 | `codex login` 或 OpenAI 官方 API key |
| `auto` | 未明確允許不安全本機執行時固定使用 demo；允許後才依可用性選擇 Codex、LLM 或 demo。 | 選用 |

明確指定的真實模式不會靜默降級。`llm` 與 `codex` 需要下列兩者之一：一個**量測過的**每次執行專屬作業系統邊界 —— 執行 `make sandbox-image`，引擎會真的把工作區 mount 進容器來驗證它 —— 或是 `ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1`，而後者只代表操作者在可拋棄的本機環境承認風險，不會增加任何保護。已驗證的邊界不會讓 `auto` 離開 `demo`（只有 `ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1` 會），因為找到憑證不等於取得同意。所選模式與量測到的隔離狀態，API 與 UI 都會顯示。共享部署沒有 Docker daemon，所以那裡維持關閉真實代理執行。募資文案的產生模式與任務執行模式分開：它會呼叫已驗證的真實產生器，或對內建 fixture／公開 GitHub import 的 issue metadata 回傳明確標示的確定性草稿；該草稿不會宣稱 repo 已被 clone 或可以執行。

## 常用指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 同時啟動 API 與 Vite 開發伺服器 |
| `npm run typecheck` | 檢查前端與伺服器 TypeScript |
| `npm test` | 執行 fixture 與 server 測試 |
| `npm run build` | 建置前端並打包伺服器 |
| `npm start` | 啟動已完成建置的 production bundle |
| `npm run check` | typecheck、測試與 production build；提交前的完整閘門 |
| `npm run seed` | 在 server 停止時重新建立本機示範資料 |
| `make validate-llm` | 驗證 LLM 憑證，不輸出秘密 |

`npm start` 不會先執行 build，使用前需先跑 `npm run build`。

## 專案目錄

```text
src/                    React 應用與翻譯
server/api.ts           REST API
server/engine/          引擎、執行器、工具、護欄與工作區
server/ai/              repo 分析與募資文案產生
server/observability/   日誌、指標與 Langfuse
shared/                 前後端共用領域型別
fixtures/               可執行的示範 repo
k8s/                    環境特定的 Kubernetes manifests
deploy/                 周邊 GitOps repo 所需的範本
```

## 文件索引

英文檔是 canonical；每一份索引文件都有繁中對照，文件變更時應同步更新兩種語言。

| 繁體中文 | English | 唯一負責的內容 |
| --- | --- | --- |
| [專案總覽](README.zh-TW.md) | [Overview](../README.md) | 產品範圍與快速開始 |
| [開發指南](DEVELOPMENT.zh-TW.md) | [Development](DEVELOPMENT.md) | 安裝、設定、指令與改動流程 |
| [架構](ARCHITECTURE.zh-TW.md) | [Architecture](ARCHITECTURE.md) | 元件、狀態機、執行流程與資料模型 |
| [Agent 架構](AGENT-ARCHITECTURE.zh-TW.md) | [Agent architecture](AGENT-ARCHITECTURE.md) | Agent 組成、每次執行拓樸，以及目前為何不是 multi-agent |
| [安全](SECURITY.zh-TW.md) | [Security](SECURITY.md) | 信任邊界、現有控制與未解風險 |
| [部署](DEPLOYMENT.zh-TW.md) | [Deployment](DEPLOYMENT.md) | non-production 建置、部署、驗證與回滾 |
| [GitHub 交付操作](GITHUB-OPERATIONS.zh-TW.md) | [GitHub delivery operations](GITHUB-OPERATIONS.md) | GitHub／GitLab／Argo 流程、證據、事故與秘密處理 |
| [功能真實性矩陣](FEATURE-REALITY.zh-TW.md) | [Feature reality matrix](FEATURE-REALITY.md) | 真實 LLM、真實非 LLM、demo、純 UI 與未實作邊界 |
| [可量測 LLM 與可觀測性計畫](LLM-OBSERVABILITY-PLAN.zh-TW.md) | [Measured LLM and observability plan](LLM-OBSERVABILITY-PLAN.md) | 下一批 LLM 功能、Langfuse trace／score 契約、datasets、dashboards 與晉級 gates |
| [階段 Roadmap](PHASE-ROADMAP.zh-TW.md) | [Phase roadmap](PHASE-ROADMAP.md) | Phase 0–2 交付狀態、Phase 3 基礎進度與未通過 gates，以及 Phase 4–7 排序 |
| [LLM 實驗紀錄](experiment-report.zh-TW.md) | [LLM experiment record](experiment-report.md) | 已接受 prompt／dataset baseline 與晉級仍缺少的證據 |
| [路線圖](ROADMAP.zh-TW.md) | [Roadmap](ROADMAP.md) | 現有限制與後續工作 |
| [產品與網站方向](PRODUCT-DIRECTION.zh-TW.md) | [Product direction](PRODUCT-DIRECTION.md) | 網站定位、收斂、延伸與前置條件 |
| [驗證實驗計畫](VALIDATION-EXPERIMENTS.zh-TW.md) | [Validation experiment plan](VALIDATION-EXPERIMENTS.md) | 可進入執行準備的規格：假設、方法、門檻、證據與 go／no-go 閘門 |
| [驗證紀錄](experiment-report.zh-TW.md) | [Verification record](experiment-report.md) | 可重現主張與實驗摘要 |
| [踩坑紀錄](GOTCHAS.zh-TW.md) | [Gotchas](GOTCHAS.md) | 穩定事故 ID 與長期教訓 |
| [版本紀錄](CHANGELOG.zh-TW.md) | [Changelog](CHANGELOG.md) | release 歷史 |
| [維護者 skill 參考](SKILL.zh-TW.md) | [Canonical skill](../SKILL.md) | Coding agent 規則與人類可讀翻譯 |

GOTCHAS 的 G 編號是穩定識別碼。新事故只在末尾追加，不可為了縮短文件刪除或重新編號。

## 版本與授權

可部署 release 請遵循[繁中開發指南](DEVELOPMENT.zh-TW.md)的版本流程。此專案為 private npm package，`package.json` 的版本不是部署 release 版本。

Changelog 標題或 manifest 版本對齊都不等於部署證據。最新 candidate、最近一次
完整驗證 rollout 與目前 blocker，請以 [GitHub 交付操作](GITHUB-OPERATIONS.zh-TW.md)
為準。

repo 目前沒有頂層 licence。各 fixture 的 licence 只適用於各自的 fixture，不代表整個應用的授權。

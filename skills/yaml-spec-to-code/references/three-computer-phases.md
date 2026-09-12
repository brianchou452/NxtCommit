先由一台建立共享骨架，之後三台按垂直功能群平行開發，最後集中整合 BDD 與 Docker visual。

## 總順序

```text
Phase 0：凍結 spec 與建立追蹤表
    ↓
Phase 1：A 電腦建立共享骨架
    ↓
建立 checkpoint commit，B/C 全部同步
    ↓
Phase 2：A/B/C 平行實作三個垂直功能群
    ↓
Phase 3：依 A → B → C 順序合併
    ↓
Phase 4：集中跑完整 BDD、build、Docker visual
```

每一個垂直切片內部都固定按照 skill 的順序：

```text
design-system
→ domain
→ persistence
→ API
→ policy
→ component
→ page
→ visual
```

## Phase 0：三台都不要寫程式

先鎖定同一個起點 commit，並確認：

```bash
git status --short
UV_CACHE_DIR=/tmp/commoncommit-uv-cache \
  uv run python scripts/lint_specs.py
```

目前檢查結果：

- `main` working tree 乾淨。
- 所有 spec lint 通過。
- 10 個 page。
- 33 個 API。
- 20 個 component。
- 9 個 approved visual specs，共 11 張 approved baselines。
- BDD 高度集中：
  - `server/product-spec.bdd.test.ts`：51 scenarios
  - `server/home-spec.bdd.test.ts`：10 scenarios
  - `server/landing.test.ts`：2 scenarios
  - `server/api-bootstrap.bdd.test.ts`：1 scenario

因此 `server/product-spec.bdd.test.ts` 絕對不能讓三台自由同時編輯。

## Phase 1：A 電腦先建立共享骨架

建議分支：

```text
codex/spec-foundation
```

A 電腦只建立所有人都會碰到的基礎，不急著完成某一頁：

- package、TypeScript、Vite、test runner 基礎。
- `shared/` 的 primitive、localized text、API error、provenance 型別。
- server 啟動與 route registration。
- SQLite migration、transaction、seed/reset harness。
- persistence adapter interface。
- domain/service/module 邊界。
- React router。
- design-system tokens、global styles。
- `src/i18n/en.ts`、`src/i18n/zh-TW.ts` 與 parity test。
- `component.application-shell`。
- Docker Playwright wrapper與 visual fixture 啟動方式。
- 四個 BDD 入口檔。

API 不要全部堆進單一 `server/api.ts`。從一開始拆成可獨立合併的模組，例如：

```text
server/routes/home.ts
server/routes/community.ts
server/routes/missions.ts
server/routes/execution.ts
server/routes/authoring.ts
server/routes/review.ts
server/routes/operations.ts
```

BDD 也建議把 `server/product-spec.bdd.test.ts` 做成中央入口，實際案例放進不同模組：

```text
server/spec-tests/community.scenarios.ts
server/spec-tests/mission.scenarios.ts
server/spec-tests/authoring.scenarios.ts
server/spec-tests/review.scenarios.ts
server/spec-tests/operations.scenarios.ts
```

中央入口保留 skill 要求的 `Spec / Scenario / Given / When / Then` 追溯註解，再 import 各模組。如此 B/C 不需要反覆修改同一個 51-scenario 檔案。

骨架通過以下檢查後建立 checkpoint：

```bash
npm run typecheck
npm test
git diff --check
```

接著 B、C 都 rebase 到這個 checkpoint，才開始寫程式。

## Phase 2：三台平行分工

### 電腦 A：Shared foundation + Home/community

分支：

```text
codex/spec-home-community
```

負責：

- Domain：
  - `home-impact`
  - `marketplace`
  - 共用 `provenance`
- Persistence：
  - `home-demo-seed`
  - `home-read-model`
  - `community-store`
- API：
  - bootstrap、impact、marketplace、global stream、demo reset
  - contributor profile、MVP、wall
- Component：
  - application shell
  - hero、commitment flow、donor map
  - campaign browser/card、release update
  - contributor impact、comment wall
  - guided demo controller、route recovery
- Page：
  - home
  - marketplace
  - contributor profile
  - guided demo
  - route fallbacks
- Visual：
  - 對應上述五個 page

A 同時擔任整合者，擁有：

- DB schema/migration
- shared base types
- global i18n
- central BDD entrypoints
- visual runner/config
- fixture reset orchestration

### 電腦 B：Mission lifecycle + funding + execution

分支：

```text
codex/spec-mission-execution
```

負責：

- Domain：
  - `mission-lifecycle`
  - `compute-accounting`
  - `run-request`
- Persistence：
  - `compute-ledger`
  - `mission-execution-store`
  - `execution-recovery`
  - `run-request-queue`
- Policy：
  - compute accounting
  - mission lifecycle
  - run request ownership
  - execution boundary/mode
  - runner tools
  - workspace integrity
- API：
  - mission detail、pledge、execute、cancel
  - mission events/stream
  - mission run request
  - run request、run detail
- Component：
  - mission overview
  - pledge dialog
  - execution activity
- Page：
  - mission detail
  - execution room
- Visual：
  - mission detail
  - execution room

B 不修改：

- DB migration 主入口
- shared barrel exports
- central API router
- `product-spec.bdd.test.ts`

需要新型別或 table 時，新增自己擁有的模組，再由 A 在整合時接到中央入口。

### 電腦 C：Authoring + AI + review + operations

分支：

```text
codex/spec-authoring-review
```

負責：

- Domain：
  - `model-assistance`
  - `execution-evidence`
  - `review-decision`
- Persistence：
  - `capability-store`
  - `llm-observability`
- Policy：
  - model assistance
  - evidence provenance
  - reviewability gate
  - observability
  - delivery evidence
- API：
  - repository analysis、issue assistant
  - campaign generation/critique
  - mission create
  - AI feedback、LLM validation
  - run evidence explanation、shadow review、run review
  - health、readiness、metrics
- Component：
  - repository analyzer
  - campaign authoring
  - verification dossier
  - diff viewer
  - review controls
  - design concept shell
- Page：
  - new mission
  - review
  - design concepts
- Visual：
  - new mission
  - review

`design-concepts` 沒有對應 visual spec，因此只做 BDD/頁面驗證，不自行新增 screenshot baseline。

## B/C 的必要介面

B 與 C 之間有一條明顯交界：

```text
B：產生 execution evidence
          ↓
C：呈現 dossier、diff、shadow review 與 human decision
```

在 Phase 1 就先固定以下 interface，兩邊只能依賴 interface：

- `ExecutionEvidence`
- `ReviewabilityResult`
- `RunArtifact`
- `RunSummary`
- `ReviewDecision`
- `EventEnvelope`
- provenance/source labels

不要讓 C 直接 query B 的 SQLite tables；由 B 提供 repository/read-model interface。這會大幅減少整合衝突。

## Phase 3：合併順序

建議固定由 A 管理 integration branch：

```text
codex/spec-integration
```

順序：

1. 合併 foundation checkpoint。
2. 合併 A 的 Home/community。
3. 合併 B 的 mission/execution。
4. 跑 typecheck、B targeted tests、spec lint。
5. 合併 C 的 authoring/review/operations。
6. A 接上中央 router、migration、exports、BDD entrypoint。
7. 跑完整 non-browser validation。
8. 最後才跑 Docker visual。

B 應先於 C，因為 review/dossier 會消費 execution evidence 與 run artifact。

每台分支最好維持小型、可 cherry-pick 的 commits：

```text
feat: 建立 mission domain 與 invariant
feat: 實作 mission persistence projection
feat: 實作 mission API contract
test: 補齊 mission lifecycle scenarios
feat: 完成 mission detail page
```

不要一次交付一個包含數十個檔案的巨大 commit。

## 衝突防止規則

三台共同遵守：

- 同一時間每個共享檔案只能有一個 owner。
- B/C 不直接修改：
  - package scripts
  - DB migration registry
  - root API router
  - root React router
  - i18n central dictionaries
  - BDD central entrypoints
  - Playwright config
- 新增 localized copy 時，各自交付 locale fragment，由 A 整合到兩份正式 i18n 檔。
- 所有 schema、spec 或契約修改先暫停三台開發，集中修改、lint、commit，再讓三台一起 rebase。
- 不要用 golden 解決 layout 不確定性；先依 design system/component/page contract 實作。
- Tailwind v4 必須排除 `../spec`，避免 YAML prose 改變產生的 CSS。
- Playwright browser 一律走 Docker。
- visual mismatch 不可直接執行 update；先人工確認是否為刻意設計變更。

## 每台交付門檻

每台在交付給 A 前至少執行：

```bash
UV_CACHE_DIR=/tmp/commoncommit-uv-cache \
  uv run python scripts/lint_specs.py

npm run typecheck
npm test -- <自己擁有的 targeted tests>
git diff --check
```

整合機最後執行：

```bash
npm run check
npm run test:visual
git diff --check
```

11 張 approved baseline 全部比較完成後，才算真正完成所有 spec。`npm run test:visual:update` 只能在確認 spec／產品確實刻意改變且 PNG 經人工審核後使用。

最重要的三個原則是：

1. 第一階段只允許一台建立共享骨架。
2. 第二階段按垂直功能群分工，不按 frontend/backend 或 spec 資料夾分工。
3. 所有中央 registry、BDD 入口與 visual 更新都由 A 單點整合。

這樣三台電腦的有效平行區間大約能涵蓋七成以上工作，同時把最容易衝突的 shared types、DB migration、router、i18n 和大型 BDD 檔集中控制。

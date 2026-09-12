---
name: yaml-spec-to-code
description: 從專案中的 YAML source spec 產生、重建或修改可驗證程式碼，包括原始碼目錄與 spec 宣告的測試檔尚不存在的從零重建情境，以及以「電腦 A/B/C、Phase 0–4」執行三機垂直切片分工。當使用者要求依據 `spec/` 內的 design-system、domain、persistence、api、policy、component、page、visual YAML 實作功能、重建程式、補齊 BDD 或 screenshot golden 測試、或同步 spec 與實作時使用；適用於採用 `scripts/lint_specs.py`、`spec/schemas/` 與 `uv` 的專案。
---

# 由 YAML Spec 產生程式碼

以 source spec 描述的產品契約為主，產生最小、可驗證且符合既有專案架構的程式碼。Spec 是功能需求的來源；既有實作只能用來辨識整合點、保護未受影響的行為或做回歸比較，不能當作補足 spec 的答案。

## 宣告電腦與 Phase

使用者可在呼叫 skill 時直接指定，例如：

```text
使用 $yaml-spec-to-code，現在是電腦 B、Phase 2，完成 mission lifecycle + funding + execution。
```

收到這類多機任務後，第一則進度更新必須明示：

```text
執行身分：電腦 B / Phase 2
負責範圍：Mission lifecycle + funding + execution
共享檔案：不直接修改，由電腦 A 整合
```

- 若使用者已指定電腦與 Phase，不要再次詢問；依該身分工作。
- 若任務明確涉及三機計畫卻未指定電腦或 Phase，先從目前分支、任務文字與既有 handoff 證據推斷。只有無法可靠推斷且不同選擇會改變可修改檔案時，才詢問使用者。
- 開始工作前讀取 [三台電腦 Phase 0–4 分工](references/three-computer-phases.md)，並依其中 ownership、合併順序與交付門檻執行。
- 合法的主要執行身分是：Phase 0 = A/B/C 唯讀盤點；Phase 1 = A 建立共享骨架；Phase 2 = A、B、C 各自垂直切片；Phase 3 = A 集中整合，B/C 只處理明確退回的自有模組；Phase 4 = A 集中驗證，B/C 只協助診斷自有切片。
- 若指定組合違反上述 ownership（例如「電腦 C / Phase 1」並要求建立共享骨架），停止寫入並指出衝突；除非使用者明確重新分配 owner，不得自行擴張權限。

## 開始前

1. 執行 `git status --short`，保留與任務無關的修改。
2. 閱讀專案的 `AGENTS.md` 與 maintainer `SKILL.md`。依變更範圍閱讀必要的架構、安全、feature-reality、開發與部署文件。
3. 確認要實作的 spec ID 或目錄；若使用者未指定，從要求可推斷的 page 及其 `design_system_id`、`composition`、`api_dependencies`、policy scope、visual page_id 展開依賴圖。
4. 若 source roots 不存在但編譯產物存在，從 package/build 設定解析確切 output paths，確認它們位於 workspace 內、不是 symlink、不是 workspace root 或廣泛父目錄，再刪除這些可重建產物。刪除後才開始讀取產品內容或產生 source；不得開啟 bundle 來反向還原實作。
5. 執行 `uv run python scripts/lint_specs.py`。將 schema 錯誤、重複 ID、無法解析的 YAML、缺少或錯誤的跨 spec 引用視為 spec blocker，停止實作並回報。
6. 若 lint 只因 scenario 的 `test_file` 不存在而失敗，將該路徑加入待產生清單並繼續實作；建立所有宣告的測試檔後重跑 lint。不要為這種正常的從零重建狀態暫停、詢問使用者或特別回報。

## 從零重建是正常模式

- 預期專案可能只有 `spec/`、schemas、lint script、package/build 設定與 visual golden；`src/`、`server/`、`shared/`、測試目錄或其中任一檔案可以完全不存在。
- 若同時存在 `dist/`、`build/`、server bundle 或其他已由 build 設定確認的編譯輸出，先刪除它們再開始重建。編譯產物不是整合參考、產品需求或可讀 source，也不可用來補足 spec。
- 將 page dependency graph、API response shape、domain/persistence contract、component inputs/content/states 與 policy enforcement 轉成所需的新目錄和檔案。Spec 明確引用的 source、route、fixture、BDD `test_file`、browser test 或 golden capture path 都是待產生物，不是缺漏證據。
- 不從不存在的實作推論架構。若 package、TypeScript、framework 或 build 設定已存在，沿用其整合約束；若連這些也不存在，選擇能滿足 spec 與專案 maintainer 規則的最小可驗證架構。
- 初次 lint 因待產生的 BDD 檔失敗時，可用唯讀盤點一次收集全部路徑，接著直接建立；不要逐檔停下或要求確認。
- 只有 spec 本身無法決定可觀察行為、相互矛盾、引用不存在的 spec ID，或會破壞 maintainer 的安全／真實性邊界時，才把缺口視為 blocker。

## 開發與瀏覽器執行環境

- 開發、產生程式碼與非瀏覽器驗證可使用本機電腦的 Node.js 與 `uv` 環境，包括 `npm`、`node`、`uv run` 和 Python 工具。
- Playwright 的瀏覽器環境一律使用 Docker 執行，以固定瀏覽器與系統相依套件。不得直接在本機執行 `npx playwright test`、Playwright browser install 或其他會啟動 Playwright 瀏覽器的命令。
- 優先使用專案提供的 Docker wrapper（例如 `npm run test:visual` 與 `npm run test:visual:update`）。若專案尚未提供 wrapper，先建立或補齊 Docker 執行入口，再執行 browser test 或更新 golden。

## 讀取與審核 Spec

依 `kind` 閱讀對應 `spec/schemas/*.schema.yaml`，再閱讀目標 YAML。完整垂直切片固定依序閱讀：`design-system → domain → persistence → api → policy → component → page → visual`。只實作局部項目時，也要先讀取它直接參照的上游 spec；任何 component 或 page 都必須先讀取其 `design_system_id`。

整理一份可追溯表：`spec id → 行為 → 程式責任 → BDD scenario 或 visual baseline → test file`。

### Design system

- 將 `principles` 視為跨頁決策準則，將 `foundations`、desktop `layout` 與 `accessibility` 視為所有 component/page 共同遵守的設計語言。
- 優先沿用 design-system token 的語意與用途；component 可描述局部表現，但不得把同一顏色、字體、spacing 或 motion 重新定義成衝突語意。
- Token 的 `value` 可包含足以重建視覺的實際色值、字體組合、尺度或時間，但不得包含 CSS selector、class name、JSX 或 source path。
- 若 component/page 的 visual contract 與 design system 衝突，停止實作並回報 spec conflict；不得自行選擇其中一方。

### Domain

- 將 `entities`、field type、values、derived 與 `invariants` 轉成領域型別、純函式或 server-side validation；不讓 component 自行重新定義領域規則。
- `invariants` 是不可違反的功能限制。缺少輸入資料時應回傳 spec 定義的狀態或錯誤，不得補造看似合理的領域資料。
- `derived_from` 只用於追溯資料來源；不可把既有資料表、ORM class、檔名或 query 寫回 spec。

### Persistence

- 依 `mode` 實作 read model 或 seed fixture。`stores` 定義資料責任，`projections` 定義 API 可讀的快照，`fixtures` 定義可重複的測試狀態。
- 確保 projection 的一致性、排序與 reset 語意符合 spec；fixture 必須可由測試在不依賴舊資料的情況下建立與清除。
- persistence spec 描述的是資料契約而非資料庫技術選型；沿用專案既有 persistence adapter，除非 spec 明確需要新能力。

### API

- 將 `endpoint`、`request`、`responses` 實作為 transport 與資料契約。
- 驗證 required、nullable、enum、format、status、error 與禁止宣稱；不可從現有 handler 猜測 spec 沒有定義的 payload 行為。
- 對 `sse` 實作 event contract、heartbeat 忽略規則與 reconnect/revalidation 語意。
- 不把 secret、authentication、外部副作用或已被 `trust_boundary.forbidden_claims` 禁止的能力加入程式碼。

### Policy

- 對每個 `scope` 套用 `rules`。`server` enforcement 落在 domain、persistence 或 API 邊界；`client` enforcement 落在 page/component 行為；`test` enforcement 要有可執行測試；`manual_review` 要在交付時列為人工確認項。
- `trigger` 與 `outcome` 定義可觀察的因果關係。不得把 policy 僅寫成註解而沒有對應的實作或驗證。
- 多個 policy 同時作用時，都必須滿足；若互相矛盾，停止實作並回報 spec conflict。

### Component

- 將 `inputs` 定義為明確 props／資料型別，按 `data_dependencies` 取得資料或由 page 注入。
- 實作每個 `states` 的 loading、error、empty、ready 行為；unknown 使用 spec 指定的 fallback，不得捏造數字。
- 實作 `interactions`、`content.locales`、`dynamic_labels` 與完整 `visual_design` contract。先依 `hierarchy` 建立 DOM 閱讀與視覺順序，再依 `layout`、`geometry`、`surface`、`typography` 和 `colour_semantics` 建立樣式；以 `visual_anchors` 檢查最重要的辨識特徵。
- 將可見字串加入專案既有 i18n 機制，不在 component 內用 locale 條件式硬寫翻譯。保留 spec 的文字內容與 interpolation 語意。
- 將 layout、色彩語意、字體與 motion 規則轉成專案既有 design token 與樣式慣例，不把 CSS selector、JSX 結構或舊元件原文複製進 spec。

### Page

- 以 `route` 建立路由，以 `composition` 順序組合 component。`spec_id` 必須指向同種類、通過 lint 的 spec；每一節的 `visual_role`、`width` 與 `relationship_to_previous` 是 page composition contract，不得只照 array 順序平鋪。
- 為每項 `api_dependencies` 實作 initial state、error state 與 refresh/reconnect 策略。
- 僅在 page 實作 `page_owned_behaviour`；可重用互動應放回 component。
- 落實 `layout.canvas`、`section_rhythm`、desktop composition、跨 section `relationships`、`visual_anchors` 與動畫規則；避免同頁重複 h1、只靠 hover 操作或讓動畫隱藏內容。
- 每一個宣稱完成的 page 都必須在 `e2e/` 實作 Playwright E2E，開啟真實 build 並經由 UI 走完該頁的主要使用者 journey。Server BDD、component/source assertion、成功 render 或 screenshot-only test 都不能取代此 browser test。
- 將已實作的 page scenarios 對應到 Playwright coverage；至少涵蓋主要互動，以及該頁宣稱完成的 lifecycle、loading、empty、error、refusal、reconnect、terminal 或 recovery state。實際執行 navigate、click、type、submit，等待 API／SSE 驅動狀態，並 assert 可觀測的 terminal 或 recoverable outcome；只有 `page.goto()` 加 screenshot 不算 E2E 完成。
- 使用 deterministic server-owned fixture，從 UI 驅動狀態，不得直接竄改 browser state 或繞過 UI 呼叫 mutation 來假裝完成 journey。Seeded demo evidence 必須保留 provenance，不可當成 fresh engine result。
- Page 的 Playwright browser 一律透過專案 Docker wrapper 執行。若 wrapper 尚不存在，先建立 wrapper；不得用 host-installed Playwright browser。Page E2E 未在 Docker 通過前，不得回報該 page 已完成。

### Visual

- `visual` 可用 `page_id` 或 `component_id` 指定唯一 subject。Page baseline 使用 full-page capture；component baseline 必須在真實 page context 中以 locator 截取元件，不建立脫離 product shell、資料與狀態契約的假 showcase。
- 寫入 visual 相關程式碼前，必須使用可用的 image viewing tool 實際開啟所有相關 `status: approved` 的 `golden_path` PNG。逐張記錄整體 composition、subject geometry、主要 visual anchors、資訊密度與相鄰關係；不得只確認檔案存在、依檔名猜內容或僅在完成後執行 pixel diff。
- Approved golden 是結果 oracle，不是需求替代品。若 PNG 與 design-system、component/page YAML 衝突，停止生成並回報 spec conflict；不得從截圖猜測未在 YAML 定義的行為、資料或外部能力。
- 依 `fixture_id` 準備固定資料，依 `capture_environment` 固定 locale、timezone、browser 與 animation 模式，再逐一執行每個 baseline 的 `state` 與 `actions`。
- Page 截圖與 component 截圖都必須使用 Docker Playwright 產生並輸出至 `golden_path`。僅在產品或 spec 有意變更、且人工確認符合 visual design 時更新 approved golden；不可因測試失敗直接覆寫。
- `planned` baseline 可先建立測試與捕捉流程，但交付時必須明確說明尚未產生或核准 PNG；`approved` baseline 必須納入視覺回歸比較。

## 實作順序

1. 盤點 spec 宣告但不存在的 source roots、BDD test files、browser tests 與 fixture paths，將它們列為本次輸出；不要因缺檔中止。
2. 在 source roots 不存在的重建模式中，安全刪除已由 build 設定確認的編譯輸出；不要讀取或保留舊 bundle 作為答案。
3. 載入 design-system foundations，確認現有 design token 或 theme 能承載其語意；沒有既有 theme 時建立最小 token layer。
4. 實作 domain type、invariant 與 persistence read model/fixture。
5. 實作 API 或 SSE transport，先讓 contract tests 能通過。
6. 將 policy enforcement 放入 server/client/test 對應邊界。
7. 依 visual contract 實作最底層 reusable component，再依 page composition contract 由內到外組裝。
8. 實作 route 與 page-owned behavior，檢查 section relationships 和 visual anchors。
9. 新增或更新 BDD test。每個 scenario 的測試檔都要有下列註解，且文字必須與 spec 對應：

```ts
/**
 * Spec: component.example
 * Scenario: meaningful-scenario-id
 * Given 中文前置條件
 * When 中文操作或事件
 * Then 中文可驗證結果
 */
```

測試不可 parse YAML。用 unit/integration test 驗證 domain、persistence 與 policy 的可觀察結果，用 HTTP handler/integration test 驗證 API，用 unit/integration 或 browser test 驗證 component/page；source-level invariant 只能補充，不能取代能執行的行為測試。對 visual baseline 使用 browser screenshot comparison，並在測試程式碼註記對應 visual spec ID 和 baseline ID。

建立完 spec 宣告的 BDD test files 後，重跑 `scripts/lint_specs.py`；此時缺少 test file 才代表實作未完成，而不是 spec blocker。

## 防止 Spec 漂移

- 不得因為現有程式碼存在，就在沒有 spec 描述時保留或擴充功能。將未描述但必須保留的行為列為 spec gap，請使用者決定是否補 spec。
- 不得將 source path、function name、JSX、CSS class、regex 或程式碼片段寫回 spec；可寫資料欄位、狀態、可見內容、互動、視覺語意與可觀察限制。
- 不得把 visual golden 當成 design-system、component visual contract 或 page composition contract 的替代品；golden 是結果 oracle，YAML 才是可重建的設計意圖與限制。
- 不得用動畫、seed row、文字或設定值推論 real LLM、真實 GitHub side effect、認證、付款或部署結果。遵守專案的 truth/provenance boundary。
- 不得讓 fixture 的 demo 資料、visual golden 或 policy 的文字敘述取代 domain invariant、persistence projection 或 API contract 的測試。
- spec 與實作衝突時，以 spec 為功能來源；若改動會破壞既有安全或維運不變條件，停止並說明衝突與可行選項。

## 驗證與交付

至少執行：

```bash
uv run python scripts/lint_specs.py
npm run typecheck
npm test
git diff --check
```

如本次實作或修改任何 page，無論是否有 visual spec，都必須透過專案的 Docker wrapper 執行對應 Playwright E2E；`npm run check`、server BDD 或 screenshot comparison 不能取代互動 journey。若本次變更含 visual spec，也要執行或建立對應 screenshot capture/comparison，並報告 fixture、baseline ID、golden status 與任何人工核准結果；不得以本機 Playwright 瀏覽器環境替代。Approved golden mismatch 後不得直接更新，必須先取得人工核准。若 Docker browser test 受環境限制，將 page 明確回報為未完成，列出缺少的 journey、命令與阻礙原因；不得只以受影響的 BDD tests 代替。修改 API、型別、i18n、execution、security 或 deployment 時，依專案規則補對應 targeted tests 與文件。交付時列出實作的 spec ID、BDD scenarios、Playwright journeys、visual baselines、驗證結果，以及任何仍未解決的 spec gap。

# NxtCommit 線上版重製交接

> 目標：把 Campaign 從「募資頁」呈現成一個完整、可追蹤的開源交付模型。

## 開始前

- 工作目錄：`/Users/hsiehpeishan/Documents/GitHub/黑客松/commoncommit`
- 先讀目前工作樹，不要根據截圖重做或直接覆蓋未提交修改。
- `git fetch` 後，以最新 `origin/main` 為線上 baseline；只選擇性移植所需元件。
- Campaign 文案須採產品價值與使用情境優先的寫法：repo 名稱是提案者身分，Campaign 大標必須是這次 Release 對人帶來的具體改變。
- 若可讀取，套用寫作參考：`/Users/hsiehpeishan/Downloads/crowdfunding-prompt 3/SKILL.md`。

優先閱讀：

- `src/pages/MissionDetail.tsx`
- `src/components/DemoShowcase.tsx`
- `src/state/AppContext.tsx`
- `src/components/ProductCard.tsx`
- `src/pages/Marketplace.tsx`
- `server/seed.ts`
- `src/styles.css`

---

## 1. Campaign Page 最優先修改

最終運作模型：

```text
Maintainer 承諾一個可驗收的計畫
→ 社群提供執行資源
→ 平台把進度同步回 GitHub
→ Review、Merge、Release
```

工程師看到的不能只是一張 crowdfunding page，而是「一個可驗收、可追蹤、保留 maintainer 決定權」的開發流程。

### A. Maintainer Commitment

放在 Campaign 內文後段、贊助 CTA 之前。內容必須包含：

- 正式產品僅允許驗證過的 repo owner／maintainer 發布 Campaign。
- AI 可以協助一鍵生成 Campaign、開發計畫與驗收條件。
- Maintainer 必須在發布前確認、可修改 Scope 與 Acceptance Criteria。
- Maintainer 承諾募資完成後一週內完成 Review。
- Maintainer 保留 Approve、Request changes、Merge、Release 的最終決定權。
- 若 Review 逾期，Tracker 顯示 `Overdue`；MVP 不自動 Merge。
- 未驗證 GitHub 身分的 demo 必須清楚標示「本機示範」，不可暗示已取得上游授權。

### B. GitHub Delivery Tracker

同一個 Campaign ID 對應整條交付路徑：

```text
Issue selected
→ Scope confirmed
→ Funding
→ Funded
→ Agent branch
→ PR opened
→ CI running / passed / failed
→ Review waiting / changes requested / approved
→ Merged
→ Released
```

每個節點至少顯示：

- GitHub icon、名稱與狀態
- Issue／PR 編號、branch、commit SHA 或 URL（存在時）
- 最後更新時間
- 下一步負責角色
- 是 demo 資料還是真實 GitHub 資料的 provenance

目前 MVP 不可宣稱真的建立 branch／PR 或推送上游；演示狀態必須清楚標示。

### C. Guided Demo 改為雙角色、共用狀態

使用兩個分頁：`Maintainer` 和 `Backer`。兩者操作同一份 Campaign state，角色切換不能重置進度。

Maintainer journey：

```text
選擇真實 Issue
→ AI 整理 GitHub Evidence
→ 生成 Plan 與 Acceptance Criteria
→ Maintainer 修改並確認 Scope
→ 承諾 Review SLA
→ 發布 Campaign
→ 募資達標
→ Agent 建立 branch / PR
→ 查看 CI
→ Review
→ Approve / Request changes
→ Merge
→ Release
```

Backer journey：

```text
瀏覽 Campaign
→ 理解產品背後的 Open Source
→ 查看 Issue Evidence、Plan、Maintainer Commitment
→ 選擇贊助算力
→ 募資成功
→ 收到 Agent 啟動通知
→ 追蹤 branch / PR / CI
→ 收到 Review、Merge、Release 通知
→ 查看 Impact Report
```

---

## 2. 首頁 15 個 Campaign Repo 與分類

首頁不要以 Parser、Runtime、Database 等純技術分類為主要導覽。採「使用者為何會想逛」的 editorial shelves；技術標籤留給工程師做篩選。

### 篩選標準

- 非工程師五秒內理解它影響什麼。
- 能以「產品背後的技術」解釋，而不是 README 式介紹。
- Release 能描述具體情境與改變。
- 可引用 Issue、Discussion 或 Roadmap 作為 Evidence。
- Scope 可驗收、可測試。
- Repo name 是身份；Campaign title 是 Release 對使用者的改變。
- Stars、downloads、Issue 數量必須是已驗證資料，不能把 demo 數字包裝為真實資料。

### A. 你每天已經在用的技術（Everyday Technology）

| Repo | Campaign 故事切角 | 為何挑選 |
| --- | --- | --- |
| LocalSend | 讓手機與電腦直接互傳檔案，不必先繞去雲端。 | 情境直覺、隱私價值清楚。 |
| PDF.js | 讓掃描 PDF 仍能順暢閱讀與搜尋。 | 每個人都懂 PDF。 |
| Tesseract.js | 把圖片與收據裡的文字重新變成可用文字。 | OCR 效益很具體。 |
| Mermaid | 系統改了，流程圖仍能讓人看懂。 | 適合圖解 before／after。 |
| scrcpy | 不必多辦帳號，也能在電腦上操作手機。 | 展示、測試、日常操作都容易理解。 |

### B. 讓數位生活更自主（Digital Independence）

| Repo | Campaign 故事切角 | 為何挑選 |
| --- | --- | --- |
| Immich | 不交出整個相簿，也能找回記得的照片。 | 影像、隱私、資料自主。 |
| Home Assistant | 網路斷了，家裡仍能照常運作。 | Local-first 的大眾情境。 |
| Excalidraw | 會議後，共同畫下來的圖還能接著改。 | 教育、工作坊、產品團隊都有感。 |
| WhisperX | 讓字幕在真正停頓的地方自然斷句。 | Podcast、影片、課程、無障礙皆相關。 |
| Jellyfin | 播放自己的影音，不讓客廳卡在載入畫面。 | 自架影音與控制權。 |

### C. 開發者正在採用的下一波（Builder Frontier）

| Repo | Campaign 故事切角 | 為何挑選 |
| --- | --- | --- |
| Ollama | 記憶體有限時，本機 AI 模型仍要好用。 | Local AI 趨勢與可量化效能。 |
| LangGraph | AI workflow 從失敗的步驟續跑，不必全部重來。 | 直接連到平台的 Agent 故事。 |
| Deno | 同一個 JS 專案在筆電、雲端、Edge 都一致。 | 開發者明確痛點。 |
| Supabase | 快速做 App，也不放棄資料庫控制權。 | 開放後端與即時資料。 |
| Bun | 快速 JavaScript 工具能穩定用進既有專案。 | 速度與相容性都有故事。 |

首頁 shelf 名稱：

```text
你每天已經在用的技術
讓數位生活更自主
開發者正在採用的下一波
```

---

## 3. Campaign 第一屏定稿

### 版面

首屏為上下關係、滿版，不做左右兩張小卡：

```text
價值導向的 Campaign headline
↓
Repo-specific semantic hero visual
↓
Independent funding progress
```

贊助卡片從 Campaign 內文才出現，sticky 在敘事線右側；首屏不可出現贊助卡。手機取消 sticky，改為段落間 CTA／底部操作列。

### 主圖規則

每個 Campaign 的 hero 必須使用與首頁 Card 同語意、放大重製的專屬主圖。不可所有 repo 共用 generic 格子背景。

視覺基調：

- 淡薄荷到紫色漸層
- 細點網格背景
- 少量動態薄荷光點
- 明確箭頭與方向
- repo 名稱只作身份，不作 Campaign 主標
- 右上為技術分類，例如 `DIAGRAM`
- 最小內文字級 16px；關鍵節點 20–24px
- 手機版改為垂直流程，禁止硬壓成小型橫排

### Mermaid 具體示例

主圖必須分成兩條可理解的線：

```text
產品技術意義
WORDS → Mermaid engine / diagram icon → DIAGRAM

Campaign 運作意義
27 位贊助者 → AI execution plan（拆解、開發、測試）→ DEMO-04 Release
```

前者解釋 Mermaid 對產品的價值；後者解釋 CommonCommit 如何讓 Release 發生。不能只把 Mermaid、Backers、AI plan、Release 並排。

### Funding Progress

Hero 主圖正下方，獨立呈現：

```text
4,310 / 5,000 COMPUTE
86.2% 已贊助
27 位贊助者
```

用單一里程碑進度線表達：

```text
分析與規劃 — 1,000
實作與自我測試 — 3,750
驗證並準備本機審查產物 — 5,000
```

並標示目前已解鎖階段、下一階段與尚需算力，CTA 為「查看開發計畫」。首屏應讓人不捲動就理解：技術價值、這次 Release、目前資金進度、下一筆贊助的作用。

---

## Campaign 內文順序

```text
Hero：這次 Release 帶來的具體改變
→ Funding Progress
→ What it is
→ Why it matters / What it powers
→ If it disappears
→ GitHub Evidence
→ The next Release
→ AI Development Plan
→ What changes for people（聚焦 Issue 解決後，使用者少掉的麻煩與得到的改變）
→ Maintainer Commitment
→ GitHub Delivery Tracker
→ Community Support / Messages
→ We make it happen together
```

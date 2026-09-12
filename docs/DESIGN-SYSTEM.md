# NxtCommit 視覺系統

> **Editorial crowdfunding × developer delivery system**
> 用明亮、留白的敘事頁面講產品價值；在證據、資金與交付節點切換成帶有點陣訊號的技術介面。畫面要讓非工程師先理解「這次更新會改變什麼」，也讓工程師看見「它如何從 Issue 走到 Release」。

本文件描述目前 NxtCommit 的目標視覺語言與元件規則。它是實作及設計 review 的共同檢查表；不取代產品需求或 GitHub 資料驗證規則。

## 1. 設計原則

1. **Release 是主角，repo 是提案者身份。**
   Campaign 的主標必須是這次更新帶來的具體改變；repo 名稱、Issue 編號與技術分類提供可信度，而不是搶走故事。
2. **明亮敘事，深色用於可驗證的系統狀態。**
   一般段落使用白色、淡紫與薄荷光暈；GitHub Evidence、交付鏈路、社群算力匯流等「可信來源／即時狀態」使用深靛色面板。
3. **每張 Campaign 都有自己的語意主圖。**
   圖解必須說明 repo 對產品的意義，例如 Mermaid 是 `WORDS → DIAGRAM`，WhisperX 是「語音 → 自然字幕」。不可只更換 repo 名稱後重複同一張抽象格點卡。
4. **動態要解釋關係，不只是裝飾。**
   光點可以代表算力、資料或狀態；線條必須有明確起點和目標，例如 Backer → AI plan → Release，或從四方匯入同一個 Goal。
5. **資料有來源，狀態有責任人。**
   GitHub Evidence、Maintainer Commitment、Delivery Tracker 是產品可信度的一部分，不是次要資訊卡。

## 2. 色彩語意

### 基礎表面

| 角色 | 色彩 | 使用方式 |
| --- | --- | --- |
| Paper | `#FBFBFA`／近白 | 頁面底、長篇敘事、留白。 |
| Ink | `#101110` | 主要文字、主要 CTA、深色錨點。 |
| Deep indigo | `#17152F` | 技術面板底色；不可用接近純黑。 |
| Line | `#E2E4DF` 附近 | 輕量分隔、容器輪廓；不應用大量框線切碎畫面。 |

### 訊號與狀態

| 語意 | 色彩 | 用途 |
| --- | --- | --- |
| Plan／Funding | `#6657FF` | 規劃、資金進度、可點擊的次級連結、里程碑。 |
| Community／Live | `#28EBC7` | 贊助者、即時匯流、已投入算力、活躍節點。 |
| Release／Delivery | `#FFC978` | Release、版本交付、最終產物。 |
| Maintainer approved | `#117A55` | Owner 確認、Review 通過、完成狀態。 |
| Warning | 暖黃／米色 | Demo provenance、逾期或需要留意的承諾；不把它做成危險錯誤。 |

### 背景規則

- 明亮區域可使用非常淡的紫、薄荷、天藍 radial glow；光暈要有足夠留白，不能變成彩色卡片牆。
- 深色區域固定使用深靛 `#17152F` 作底，疊加薄荷與紫色微光、低對比點陣網格。
- 點陣尺寸以 `18–23px` 節距為基準，透明度低；它是「系統正在流動」的空間，不是桌布。
- 漸層只承擔情緒與空間深度，**不可**取代狀態色來表示分類或進度。

## 3. 字體與資訊層級

| 層級 | 字體／特徵 | 使用時機 |
| --- | --- | --- |
| Display／故事主標 | `DM Sans`, `Noto Sans TC`, 粗、緊縮字距 | Hero、Campaign 標題、段落觀點。大標講人能感受的改變。 |
| Section heading | 同一 sans，約 `32–64px`（響應式） | What、Why、Release、Commitment 等故事段。 |
| Body | 同一 sans，至少 `16px` | 解釋情境、使用者效益、證據摘要。 |
| System label | `ui-monospace`／SF Mono，uppercase、較大字距 | `FUNDING PROGRESS`、`GITHUB EVIDENCE`、階段名稱、資料來源。 |
| System data | 等寬字或 DM Sans 數字 | token、百分比、Issue／PR、版本、時間。 |

規則：小標可保留英文，中文正文自然書寫；`GitHub stars`、`Issue`、`PR`、`Release`、`Merge` 等可維持英文。內文和可讀狀態不可小於 `16px`；hero／資金數字要遠大於周邊系統標籤。

## 4. 圖像、圖解與動態

### Campaign 專屬主圖

每一張首頁 card 與其 Campaign hero 必須共享同一個「概念」，但 hero 是放大重製，不能把小卡直接拉大。

主圖固定包含：

- repo 名稱與技術分類，作身份而非大標；
- 可一眼看懂的輸入 → 轉換 → 輸出關係；
- 低對比點陣、少量亮點、清楚箭頭；
- `Community backing → AI execution plan → next release` 的交付鏈，僅在需要解釋平台機制時出現。

範例：

```text
Mermaid：WORDS → Mermaid engine → DIAGRAM
WhisperX：raw speech → aligned words → natural subtitles
PDF.js：scanned PDF → readable / searchable document
```

### 動態行為

- mint 光點沿線移動、節點輕微呼吸、數字可平滑更新；速度應穩定、低頻，不能像廣告 banner。
- 用 `prefers-reduced-motion` 關閉非必要動畫，保留靜態關係與資訊可讀性。
- 不使用無意義的游標、飄浮卡片或斜向留言牆作為主要視覺。

## 5. 元件語言

### Eyebrow 與標籤

- 微型等寬字、追蹤字距、黑底薄荷字或淺底紫字。
- 用於指明段落角色，例如 `WHAT IT POWERS`、`GITHUB EVIDENCE`、`MAINTAINER COMMITMENT`。
- tag 是資訊入口，不應堆滿所有技術分類。

### 深色技術面板

- 深靛底、細點陣、半透明內框、薄荷／紫／琥珀訊號。
- 適用：GitHub source、社群算力匯流、交付節點、repo-specific diagram。
- 圓角約 `18–25px`；可有低強度陰影和 blur，但不使用純黑或重厚玻璃感。

### 明亮資訊面板

- 白或淡色漸層、薄邊框、少量圓角與足夠 padding。
- 適用：Funding Progress、資金影響預覽、故事正文、support stream。
- 一段內容只選擇一個主要容器邏輯；不要連續堆疊多張同樣的卡片。

### 資金進度條

- 放在 Hero 主圖正下方，獨立成一段，而非塞進贊助操作卡。
- 大數字先呈現 `pledged / goal COMPUTE`，其次是百分比、backer 數與截止時間。
- 進度 rail 使用紫色 fill，mint 活動節點；里程碑必須寫清楚「什麼 token 解鎖什麼階段」。
- 右側 sticky backing card 從故事內文才開始出現，手機改為非 sticky CTA。

### GitHub Evidence

- 深色 header 搭配 GitHub icon、來源數量與 provenance。
- 真實 Issue／Discussion 引言卡清楚顯示編號、作者／日期、原文與白話解釋。
- Evidence 必須導向 `AI 整理範圍 → Maintainer 確認 scope`，不能暗示 AI 自行決定 Roadmap。

### Maintainer Commitment 與 Delivery Tracker

- 兩者是「產品機制」，不是一般行銷卡片。
- Commitment 用深色 header 加三項具體承諾：確認 scope、Review SLA、保留 Merge／Release 決定權。
- Delivery Tracker 顯示同一 Campaign 的完整路徑：

```text
Issue selected → Scope confirmed → Funded → Agent branch → PR → CI
→ Review → Merge → Release
```

- 節點要有狀態色、GitHub 關聯資料、最後更新時間、下一步負責角色與 demo／真實資料標示。

### Community Support

- 社群不是電商評價牆。
- 左側以來自四面八方的人名／算力匯流到 Goal 的 motion 表達「共同推進」；右側訊息直向排列，避免斜向堆疊。
- 讓 Backer 可以附上一句支持，但主角是集體推進 Release 的可見效果。

## 6. 首頁架構

首頁順序如下：

```text
Hero：平台定位 + 即時社群算力／交付訊號
→ 全球算力贊助分布
→ 本月已交付的 Release 更新
→ Campaign shelves
→ 社群投票（頁面底部）
```

首頁 hero 的文案：

```text
用閒置算力，讓下一個 Release 發生。
從 Issue 到 Merge，讓社群共同提供算力，把產品背後等待已久的需求推進下一個更新。
```

英文版本：

```text
Put your unused AI compute behind the next release.
Discover the open source behind the products you use—and keep its next release moving.
```

Campaign shelf 以「人為何會在乎」分層，技術分類只作篩選：

```text
你每天已經在用的技術
讓數位生活更自主
開發者正在採用的下一波
```

每個 shelf 使用品類 banner 加一大四小（或可延展的規律格線），不要把第一張卡硬拉成過長的大卡。

## 7. Campaign 敘事結構

```text
Hero：這次 Release 帶來的具體改變
→ Funding Progress
→ What it is
→ Why it matters / What it powers
→ If it disappears
→ GitHub Evidence
→ The next Release
→ AI Development Plan
→ What changes for people
→ Maintainer Commitment
→ GitHub Delivery Tracker
→ Community Support / Messages
→ We make it happen together
```

故事段落的寫作規則：

- `What`：用一句白話解釋它在產品中做什麼。
- `Why`：先談使用情境與被影響的人，再補 repo 規模或技術事實。
- `If it disappears`：每個 repo 要有專屬後果，不能用泛用開源口號。
- `Next Release`：清楚說明這次 funded 的具體變更與驗收方式。
- `What changes for people`：說明 Issue 解掉後，人不必再做什麼、能多做什麼。

## 8. 禁止事項

- 不使用 GitHub dark theme 當整頁底色；深色只作為可信技術錨點。
- 不做電商式評論牆、折扣感、商品購物卡或純銷售口吻。
- 不把 AI 呈現成替 Maintainer 決定 scope／merge 的黑箱。
- 不讓 Issue、repo 名稱、技術指標取代這次 Release 的價值主張。
- 不把所有 Campaign 的 hero 做成相同圖案；資料不同時，圖解關係也必須不同。
- 不以小字塞入關鍵資訊；放大狀態、數字、節點和現實情境。

## 9. 實作對照

| 項目 | 主要實作位置 |
| --- | --- |
| 全站 tokens、字體、動態、D campaign styles | `src/styles.css` |
| 首頁 Hero 與即時訊號 | `src/components/Hero.tsx` |
| Campaign card／專屬語意主圖 | `src/components/ProductCard.tsx` |
| Campaign 敘事、Funding、Evidence、Commitment、Tracker、Community | `src/pages/MissionDetail.tsx` |
| 雙角色 Demo | `src/components/DemoShowcase.tsx`、`src/pages/Demo.tsx` |
| 共用 Campaign demo state | `src/state/AppContext.tsx` |
| Campaign 資料、15 個 editorial shelves | `server/seed.ts` |
| 中英文故事文案 | `src/i18n/zh-TW.ts`、`src/i18n/en.ts` |

## 10. Review checklist

- [ ] 這個區塊是否先讓非工程師理解「它改變什麼」？
- [ ] repo-specific 主圖是否真的解釋該 repo，而非重用 generic 裝飾？
- [ ] 深色是否只用在 source、system state 或需要聚焦的技術層？
- [ ] 資金數字、交付階段、Maintainer 的責任是否一眼可讀？
- [ ] Evidence 是否標明 GitHub 來源與 demo／真實資料狀態？
- [ ] 動態是否表達資料或算力的方向？關閉動畫後是否仍讀得懂？
- [ ] 手機版是否將橫向流程改為直向，而非縮小所有文字與節點？
- [ ] 文案是否以 Release 的人類效益為標題，而非 README 式 repo 描述？

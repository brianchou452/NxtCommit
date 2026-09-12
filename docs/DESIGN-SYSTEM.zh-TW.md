# NxtCommit Design System

使用者指定 0.7.35 的整合路由以 commoncommit 為畫面基準。確切來源版本、整合差異與驗證範圍見 [COMMONCOMMIT-PARITY.zh-TW.md](COMMONCOMMIT-PARITY.zh-TW.md)；其中引用的來源契約取代這些路由較早的 NxtCommit 專用編排。歷史核准圖片保留，不覆寫。

> **Editorial crowdfunding × developer delivery system**
>
> 用明亮、留白的敘事頁面講產品價值；在證據、資金與交付節點切換成帶有點陣訊號的技術介面。畫面先讓非工程師理解「這次更新會改變什麼」，也讓工程師看見「它如何從 Issue 走到 Release」。

同步基準：**2026-09-12 的網站實作、machine-readable spec、component/page/visual contracts 與 approved golden**。本文件是繁中人讀指南及 design review checklist，不是 executable spec。

## 1. 權威來源與衝突處理

設計決策的權威順序為：

1. [`spec/design-systems/nxtcommit.yaml`](../spec/design-systems/nxtcommit.yaml)：design-system foundations 與全域不變條件。
2. Component、page、visual contracts：各元件與頁面的結構、狀態、互動和視覺契約。
3. Approved golden：已核准的渲染結果 oracle，用來判定 desktop 視覺結果是否符合契約。
4. 本文件：協助人理解、設計與 review；不凌駕上述來源。

若本文件與 executable spec 或 contracts 衝突，**以 executable spec／contracts 為準並同步修正本文件**。若 golden 與上游契約衝突，不以本文件自行裁決；先釐清並更新 canonical artifact。`src/styles.css` 是目前網站的實作對照，不取代 spec。

## 2. 設計原則

1. **Editorial clarity 先於裝飾。** 每個畫面只有一條明確 reading order；Release 帶來的具體改變是主角，repo、Issue 與技術分類是可信身份。
2. **明亮敘事，深色聚焦。** Canvas 與可閱讀內容保持明亮；GitHub Evidence、pipeline、交付節點等可驗證系統狀態可使用 deep indigo 面板。
3. **四維語意不漂移。** Funding、development、verification、adoption 的顏色跨頁面與元件維持同一含義；品牌漸層不能代替分類色。
4. **動態解釋關係。** 光點、線條與數字更新須表示資料、算力或狀態的方向；靜止或 reduced motion 時資訊仍完整。
5. **資料有來源，狀態有責任人。** Demo provenance、未知 measurement、GitHub Evidence、Maintainer Commitment 與 Delivery Tracker 都必須可見。

## 3. Foundations

### Typography

| 角色 | Font stack／規則 | 使用方式 |
| --- | --- | --- |
| Display sans | `DM Sans`, `Noto Sans TC`, `PingFang TC`, system sans-serif；`600–700` | Hero、section title、Campaign title、主要 outcome；可用緊縮 tracking。 |
| Body sans | 同一套 sans；`400–600` | 說明、控制項、描述與長文。 |
| Metadata mono | `ui-monospace`, `SF Mono`, Menlo, Consolas, monospace；`600–800` | Provenance、metric、kicker、status、pipeline 與技術 metadata；常用 uppercase 及加寬 tracking。 |

Metadata 與 pipeline label 可依密度使用約 `10–14px` 的 mono；這是資訊層級例外，**不得連帶縮小正文、核心狀態或按鈕文字**。可閱讀內容與 controls 依使用情境、對比、行高和 target size 維持清楚，不設過時的全域 `16px` 絕對限制。Hero、資金數字和主要 outcome 必須明顯高於周邊 metadata。

### Core colour tokens

| Token／角色 | 值 | 使用方式 |
| --- | --- | --- |
| Canvas／`bg` | `#fbfbfa` | 預設頁面底；可疊低對比 violet／mint ambient gradient。 |
| Surface | `#ffffff` | Card、可閱讀 panel、control。 |
| Ink | `#101110` | 主要文字與最高強度 boundary。 |
| Muted | `#676b65` | 次要說明；仍須在明亮 surface 上可閱讀。 |
| Brand／funding | `#6657ff` | 產品識別、primary action、focus 與 funding；使用情境要明確。 |
| Gradient mint | `#28ebc7` | 連續裝飾漸層、live accent、正向 movement；不是新的分類。 |
| Deep indigo | `#17152f` | 高對比 narrative、Evidence 與 pipeline surface。 |
| Line | `#e2e4df` | 輕量分隔與容器輪廓；避免用大量框線切碎畫面。 |

### 四維 semantic palette

這是產品全站、跨頁使用的 categorical progress palette。任何跨 Campaign／跨頁、會讓人判斷進度維度的 mark、track、legend 和 status 都使用對應色，不以 brand gradient 代替。

| Dimension | 色彩 | 意義 |
| --- | --- | --- |
| Funding | `#6657ff` | 資金進度、funding 階段與其關聯資料。 |
| Development | `#0b9d81` | 開發執行、agent／maintainer 工作進度。 |
| Verification | `#277fa6` | CI、review、驗證與 evidence 狀態。 |
| Adoption | `#c26b45` | Release 後的採用、使用與影響。 |

Component-scoped 例外：首頁 `release-update` 既有 **Funded／Plan／Maintainer decision／Release** 四段 accent，由 `spec/components/release-update.yaml` 擁有。它只表示該元件內的線性 delivery lifecycle，不是全站第二套 categorical dimension palette；離開 `release-update`，或建立跨 Campaign／跨頁 legend 時，仍使用 Funding／Development／Verification／Adoption 四維 palette。

Success、warning、danger 等功能狀態可以使用各自 token，但不可改寫四維語意。`#28ebc7` 可作連續漸層或 Community／live accent，但 Community／live 仍不是 categorical progress dimension。

### Surface、radius 與 shadow

- Standard card 使用 white surface、低對比 border 與 soft neutral／violet shadow；radius 以約 `22px` 為常態，允許落在 canonical `18–24px` 區間。
- Hero、map、Campaign feature、release narrative 等 feature panel 使用 `28–44px`；常見值為 `34px`，大型寬螢幕 feature 可到 `44px`。
- Pill button、compact filter、status 與 badge 使用 `999px`。
- Feature depth 可用寬而淡的 violet-tinted shadow，加少量 inset highlight；不要讓每個 surface 都像 modal，也不要使用純黑或厚重 glass。
- Glass 僅用於需要空間層次的 surface；無 `backdrop-filter` 時仍要有可讀 fallback。

### Spacing 與 layout

- 基準 spacing step 是 `4px`；control、card、inline spacing 採有意義的倍數。
- Desktop major section 的預設節奏為 `7rem`；緊湊情境可使用對應的小節奏，不用空白高度硬撐版面。
- Desktop narrative／application content 通常收在 `1440–1480px`；長文在大 composition 內另設較窄 readable measure。
- Desktop gutter 至少 `24px`。滿版 canvas 可延伸，但文字、焦點與主要操作必須回到一致的 content alignment。
- Layout 依內容決定欄數；縮放時改變結構與 reading order，不把 desktop 畫面等比例壓小。

## 4. 圖像、圖解與 motion

每張 Campaign card 與其 hero 共享同一個 repo-specific 概念，但 hero 是重新編排的放大敘事，不是把小卡直接拉大。圖解應能一眼讀出輸入、轉換與輸出；repo 名稱和技術分類是身份，不能取代效益主張。

```text
Mermaid：WORDS → Mermaid engine → DIAGRAM
WhisperX：raw speech → aligned words → natural subtitles
PDF.js：scanned PDF → readable / searchable document
```

Motion 的 enter transition 約 `350–700ms`。Ambient loop 以低頻、不干擾閱讀為原則；小型 signal pulse 可約 `2.1–2.4s`，較大的背景 loop 可採更慢節奏。Motion 只能輔助理解，不能成為發現內容、狀態或操作的前提；`prefers-reduced-motion` 必須移除 loop／transform，直接呈現最終可見狀態。

## 5. 元件與敘事語言

### Labels 與技術面板

- Eyebrow／system label 可用小型 mono、uppercase 和加寬 tracking，指明 `GITHUB EVIDENCE`、`FUNDING` 或 pipeline stage；不要堆滿 tags。
- 深色 panel 使用 deep indigo、低對比點陣／內框，以及節制的 violet／mint light；分類訊號仍回到四維 palette。
- 明亮 panel 使用 white 或極淡 gradient、薄 border、足夠 padding。相鄰內容只選一個主要容器邏輯，避免 card wall。

### Evidence 與 delivery

- GitHub Evidence 清楚顯示來源、數量、provenance、Issue／Discussion 識別及白話解釋。
- Evidence 的決策鏈是 `AI 整理範圍 → Maintainer 確認 scope`；不可暗示 AI 代替 Maintainer 決定 roadmap、merge 或 release。
- Funding、Development、Verification、Adoption 在 tracker 中使用各自 dimension 色，並顯示 GitHub 關聯、最後更新時間、下一步責任角色，以及 demo／真實資料標示。
- Community Support 表達集體推進 Release，不做成電商評論牆；訊息保持可掃讀，motion 只顯示匯流方向。

## 6. 首頁架構

現行首頁 section 順序是：

```text
hero → how → map → projects → mvp
```

- `hero`：平台承諾、主要 CTA 與 live delivery signal。
- `how`：解釋從支持到交付的機制。
- `map`：呈現全球／社群算力匯流。
- `projects`：以人為何在乎的結果組織 Campaign／project。
- `mvp`：收束可操作的產品流程與當前範圍。

首頁新增、刪除或重排 section 時，應先更新 page／visual contract，再同步本節；不能把舊的「全球分布 → 已交付 Release → shelves → 社群投票」清單當成現況。

## 7. Desktop 與 mobile 契約

目前 YAML／approved golden 的視覺基準只契約 **desktop**。Desktop review 必須確認：內容寬度與 gutter、首屏 reading order、主要操作、keyboard focus、四維狀態，以及無 hover／motion 時仍可取得的內容，並以 approved golden 作結果 oracle。

Mobile responsive CSS 是現有網站的額外實作：會將多欄改為單欄或較少欄、取消不適合小螢幕的 sticky 行為、將橫向流程改為直向，並調整 gutter。它仍須符合內容、互動、對比、touch target 與 reduced-motion 要求；但在 mobile golden／visual contract 建立前，**不得宣稱 mobile 視覺基準已被 golden 覆蓋或驗收**。

## 8. Accessibility invariants

- 一般文字與有意義 control 在所有宣告 surface 上符合 WCAG AA；低對比色只作裝飾。
- Keyboard focus 使用清楚的 `2px` violet outline，並與 control edge 保持 separation。
- 操作支援 keyboard 與 touch，target size 可用；資訊與 action 不只靠 hover、顏色或 motion 傳達。
- Reduced motion 關閉 loop 與 transform 後，所有 state、item 和 reading order 仍完整可見。
- Demo provenance 與 unknown measurement 不因視覺 polish 被隱藏。

## 9. Design review checklist

Review 時依序操作並留下 screenshot、contract check 或 issue link 等證據：

- [ ] 已先確認對應的 YAML、component/page/visual contract 與 approved golden；沒有用本文件覆蓋 executable spec。
- [ ] Homepage desktop 由上而下是 `hero → how → map → projects → mvp`，沒有殘留舊 section order。
- [ ] Canvas、surface、ink、muted、brand/funding、gradient mint 與 deep indigo 使用正確 token。
- [ ] Funding／Development／Verification／Adoption 只用 `#6657ff`／`#0b9d81`／`#277fa6`／`#c26b45`，legend 與同頁元件含義一致。
- [ ] Display／body 使用 DM Sans + Noto Sans TC stack；mono 只用於 metadata／pipeline，沒有讓正文或按鈕跟著縮小。
- [ ] Standard card 約 `22px`，feature panel 在 `28–44px`；shadow 有層次但沒有把每張卡做成 modal。
- [ ] Desktop content width、至少 `24px` gutter、reading order 與 page contract 定義的 consistent semantic gaps 均已核對；`7rem` 是 design-system major-section default，Home 可依 contract 使用較緊湊 rhythm。
- [ ] 主要內容、狀態、focus 與 action 不依賴 hover 或 motion；keyboard 操作與 `prefers-reduced-motion` 已實測。
- [ ] Repo-specific 主圖解釋實際輸入／轉換／輸出，不是只換名稱的 generic 裝飾。
- [ ] GitHub Evidence、demo provenance、未知 measurement、Maintainer 責任與下一步角色清楚可見。
- [ ] Desktop 已逐一對照 approved golden；差異有對應 contract 變更或被列為 defect。
- [ ] Mobile 已檢查 reflow、touch、可讀性與功能；若沒有 mobile visual contract／golden，review 結論明確標註「未涵蓋 mobile 視覺基準」。

## 10. 禁止事項

- 不使用 GitHub dark theme 當整頁背景；deep indigo 只作可信技術錨點或高對比 narrative panel。
- 不把 `release-update` 的 Funded／Plan／Maintainer decision／Release component-local stage accents 升格或複製成全站 palette；Community／live mint 也不是 categorical dimension。
- 不以 brand gradient、mint live accent 或功能狀態色取代四維 semantic palette。
- 不讓 Issue、repo 名稱、技術指標或 AI 黑箱取代 Release 的人類效益與 Maintainer 決策權。
- 不使用無意義的 cursor、漂浮卡片、斜向留言牆或純裝飾動態作主要視覺。
- 不以固定小字塞入關鍵資訊，也不宣稱未被 contract／golden 覆蓋的 viewport 已通過視覺驗收。

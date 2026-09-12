# 產品與網站方向

[English](PRODUCT-DIRECTION.md)

> 狀態：這是產品策略，不代表功能已實作。現有能力請以
> [README](README.zh-TW.md)、[架構](ARCHITECTURE.zh-TW.md)與
> [安全邊界](SECURITY.zh-TW.md)為準。

## 產品定位

NxtCommit 應定位成「**可稽核的 AI 開源維護工作流原型**」，而不是已經營運中的市集：

> 把範圍明確的維護需求，轉成由引擎觀測、可供人類審查的證據。

真正的差異化是完整證據鏈：

```text
認捐運算點數 → 執行器嘗試 → 引擎執行驗證
→ 變更證據包 → NxtCommit 示範決定
```

市集概念有助於說明任務排序與共享運算，但產品承諾不能超過目前的信任邊界。NxtCommit 現在能證明的是內建 fixture 上的工作流程，還不能證明真實身分、付款、任意 repo 隔離、上游交付或真實採用。

## 主要受眾

第一階段的使用者應是評估這套工作流的人：

- 想探索有界 AI 貢獻方式的開源維護者；
- 設計代理驗證與人工審查的工程師；
- 想理解運算點數產生哪些證據的潛在貢獻者；
- 評估安全與部署方式的維運人員。

真正接收上游 PR 的維護者與投入有價值點數的貢獻者，必須等到身分、隔離、持久化執行與 GitHub 交付能力成立後，才適合作為主要使用者。

## 產品原則

1. **先呈現來源，再追求漂亮。** 區分執行器主張、引擎觀測、模型審查、靜態審查與預載示範資料。
2. **讓下一步一眼可見。** 任務頁直接回答這是什麼、能否執行、目前狀態與訪客可做的事。
3. **拆開可執行與分析路徑。** 內建 fixture 可以執行；公開 GitHub 匯入只讀 metadata。
4. **用實作換取更強的措辭。** 真實 PR 出現前稱「變更證據包」；上游 release 出現前稱「NxtCommit 示範發布狀態」。
5. **先補前置條件，再擴張產品。** 不在缺乏隔離、身分或持久狀態時建立市集承諾。
6. **保留一條可完整展示的路。** 一個有引導的 fixture 體驗，比很多淺薄貨架更有價值。

## 應該收斂的部分

### 產品承諾與名詞

全面檢查 UI 與文件，避免暗示尚未具備的能力：

| 避免暗示 | 現階段建議用詞 |
| --- | --- |
| 已驗證的進展 | 可審查的進展 |
| 已隔離的 repository | 具應用層控制的內建 fixture 工作區 |
| Pull Request | 變更證據包 |
| 已上線或已發布 release | 本機記錄的示範發布 |
| 已驗證維護者 | 示範維護者角色 |
| 真實採用或影響力 | 明確標示的預載示範資料 |

套件 metadata、README、雙語 UI、API 標籤與截圖應使用同一組定義。

### 市集首頁

`v0.5.5` source candidate 已用選定的 D campaign 方向取代重複貨架：motion-led
impact hero、一張固定比例主角卡、四張精簡 campaign、獨立延伸網格，以及分開的
demo route。這是 source state，不是部署證據；`99f2205` 的 I18N-01 回歸已在目前
source 修正，rollout 仍須獨立證據。後續應繼續收斂為：

- 一份主要任務清單；
- Funding、Running、Review、Completed、Needs attention 等生命週期篩選；
- 一個主要的引導式示範任務；
- 每張任務卡都顯示來源與能力標籤；
- 只有來源明確時才顯示採用或個人影響模組。

### 任務詳情

`v0.5.5` source candidate 的第一屏已優先整合 campaign／funding hero、白話故事、
消失情境、scope、milestones 與 sticky 支持操作。次要區塊仍同時承擔維護者、驗收
條件、風險、活動、採用、支持者、帳本與所有 CTA。第一屏持續應優先呈現：

1. 任務結果與來源；
2. 可執行或僅 metadata 的能力；
3. 當前狀態與下一步；
4. 驗收條件及其證據狀態。

帳本、支持者、預載採用與長活動紀錄應移到次要區塊或分頁。

### 建立任務流程

把現在的入口拆成兩條：

- **執行內建示範**：建立可執行 fixture 任務；
- **分析公開 repository**：只讀公開 metadata 與 issue，再建立候選 campaign 草稿。

第二條路徑不可暗示匯入的 repo 會被 clone、執行或送回上游。

### 遊戲化

聲望、成就、impact receipt 與排行榜可保留為有標示的示範，但在身分、真實認捐與可追溯採用成立前，不應成為主要導覽或成長迴圈。

## 現在就能延伸的內容

Read-only model-assisted extensions 與必要 observability gate 的順序，記錄於
[可量測的 LLM 擴充與 Langfuse 優化](LLM-OBSERVABILITY-PLAN.zh-TW.md)。
它們仍是次要 evidence layer，不會擴張 repo execution 邊界。

以下項目可以建立在現有證據與 route 上，不需宣稱新的信任邊界：

- 「運作方式」頁：認捐、執行、證據、審查與本機發布；
- 「信任與限制」頁：區分每一種 provenance；
- `tempo-duration` 引導式示範，提供開始與完成清單；
- 可分享的單次 run 或案例研究頁；
- 任務 run 歷史，以及 baseline 與 final 測試證據對照；
- 更清楚的執行模式比較，包含 Codex production image 的限制；
- FAQ：點數、本機發布、GitHub metadata 匯入、資料保存與沙箱邊界；
- 行動版導覽、明確 404 route、鍵盤操作與無障礙覆蓋。

## 需要前置條件才能延伸的能力

| 延伸能力 | 必須先完成 | 原因 |
| --- | --- | --- |
| 執行任意 repository | 每次 run 獨立容器或 VM、網路政策、資源限制 | 應用層控制不是多租戶隔離。 |
| 真實維護者審查 | 登入、repo 所有權驗證、RBAC | 本機按鈕無法證明權限。 |
| 建立上游 Pull Request | GitHub App、限權 token、branch policy、冪等性 | 現有 artifact 不會離開本機狀態。 |
| 持久化並行任務 | 持久資料庫、durable queue、worker lease、復原 | 現有狀態與工作區位於 Pod 本機。 |
| 真實運算募資 | 計量、濫用防護、付款或點數政策 | 現有點數只是示範帳務。 |
| 採用與影響力排行 | 有版本的外部來源與 provenance | 預載數字不能支撐真實排行。 |

## 建議資訊架構

| Route | 用途 |
| --- | --- |
| `/` | 產品定位、限制、主示範、簡短流程 |
| `/missions` | 單一可篩選任務清單 |
| `/missions/:id` | 任務總覽、能力、驗收條件、狀態、下一步 |
| `/missions/:id/runs` | 歷次 run |
| `/runs/:runId` | 時間線、環境、測試、diff、預算、來源 |
| `/missions/:id/review` | 證據與 local-only 人工決策 |
| `/analyze` | 公開 GitHub metadata-only 分析 |
| `/new` | 選擇示範執行或 repo 分析 |
| `/how-it-works` | 工作流程與證據模型 |
| `/trust` | 信任邊界與限制 |
| `/contributors/:id` | 次要的示範個人頁 |

這份 route 清單是提案；只有[架構文件](ARCHITECTURE.zh-TW.md)記載的 route 才能描述成已實作。

## 交付順序

### P0 — 真實性與資訊架構

- 全站 claim 與名詞稽核；
- 在決策點標示 fixture、metadata-only、執行模式與 demo data；
- 收斂首頁與建立流程；
- 補上限制、provenance、行動版導覽與 404；
- 讓套件、README、UI 與 API 措辭一致。

成功標準：新訪客不用讀原始碼，也能正確說出哪些是真的、哪些是模擬，以及核可後實際發生什麼。

### P1 — 核心證據體驗

- 拆分 Mission Overview、Runs 與 Review；
- 讓 run history 可直接定位；
- 集中 baseline、final tests、diff、budget 與 provenance；
- 增加引導式示範與一份誠實案例研究；
- 增加雙語瀏覽器流程、鍵盤與無障礙測試。

成功標準：審查者不需在多頁自行拼湊，就能找到一次 run 的完整證據。

### P2 — 平台基礎

完成[路線圖](ROADMAP.zh-TW.md)中的隔離、身分、GitHub 交付、驗證與持久化執行。每項基礎能力都必須先有確定性測試並更新威脅模型，才能解鎖產品承諾。

### P3 — 真實市集

只有 P2 完成後，才加入真實認捐、維護者 onboarding、上游 PR 與 CI、可追溯影響力、聲望或探索排行。

## 明確不做

- 付款、可交易 token、區塊鏈或二級點數市場；
- 在 per-run isolation 前執行任意 GitHub repository；
- 自動 merge、直接寫 default branch、tag 或發布套件；
- 把本機 artifact、本機 release 或預載採用描述成外部成果；
- 讓諮詢式模型審查擁有准駁權；
- 把目前未版本化 API 當成公開平台契約；
- 在打包與驗證前宣稱已部署 Codex 或廣泛支援框架；
- 在證據流程清楚前擴張社交動態、排行、成就或更多貨架。

## 需要驗證的決策

實作前應向使用者驗證：

1. 主要入口應是「執行引導式示範」還是「分析 repository」？
2. 維護者不看 tooltip 是否能理解「變更證據包」不是 GitHub Pull Request？
3. 測試、diff、provenance、budget、review 中，哪種證據最先建立信任？
4. 運算認捐是價值主張核心，還是排序任務的比喻？
5. 哪個最小外部動作能讓原型變成實用維護工具：draft PR、patch 下載，還是已驗證報告？

把答案記為產品證據；未經驗證的假設不要直接變成 roadmap 承諾。

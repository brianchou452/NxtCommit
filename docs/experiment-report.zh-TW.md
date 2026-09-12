# 驗證紀錄

[English](experiment-report.md)

本文件記錄範圍受限且可重現的聲明。它不是即時部署儀表板，不得用來推斷目前正在提供服務的版本。

未來的假設、方法、通過門檻與 go／no-go 閘門屬於
[驗證實驗計畫](VALIDATION-EXPERIMENTS.zh-TW.md)。本文件中的項目是帶日期的
結果，不代表可以把尚未執行的計畫標成 passed。

## 證據規則

- 記錄日期、版本或 commit、執行模式、目標 fixture，以及命令或操作流程。
- 區分引擎觀察與執行器輸出。
- 絕不包含金鑰、完整內部 URL、IP 位址、私人專案路徑或完整 trace 識別碼。
- 若失敗的實驗改變了設計決策，應予保留，但要摘要說明教訓，不要留下終端機流水帳。
- 將模型行為視為特定日期的觀察，而非永恆不變的保證。

## 本機驗證

### 2026-08-06 — SEC-00 每次執行的 OS 隔離（P0 閘門）

- Harness：`npm run sec00`（`server/security/sec00.mts`，payload 位於 `sec00-payloads.ts`）
- Source commit：`abd03ae`。證據包記錄 `dirty: true`，因為執行當時文件正在編輯中；
  `git status -- server/engine server/security Dockerfile.sandbox` 回報零變更，所以受測的
  每一條程式碼路徑都精確等於 `abd03ae`。這裡選擇如實陳述，不四捨五入成「clean」，因為計畫
  書要求結果必須綁定不可變 commit，而這一份綁定的是一個 commit 再加上那道查核。
- 環境：macOS 25.5.0 arm64、Node.js `v24.3.0`、sandbox image `commoncommit/sandbox:1`
- 輸入：fixture `tempo`，7 個向量 × 20 次重複 × 2 種隔離模式 = 280 次執行
- 已重現：在此 commit 上連續三次完整執行，判定全部相同。較早的一次執行回報 140 次中有一次
  容器殘留違規，而那其實是 **harness 自己的缺陷** —— 它是按 image 計算容器數，於是一個仍在
  被 `--rm` 回收的前次重複被算成了殘留。現在改以容器自己的名稱過濾，並給一段有上限的寬限
  時間，因為 `--rm` 的移除本來就是非同步的設計。一條會偶發失敗的安全性斷言比完全沒有更糟：
  它會教讀者去忽略這個訊號。
- Canary：合成，每次執行重新產生；證據包只保存其前綴與 SHA-256，絕不保存其值
- 證據：`evidence/sec00-<date>/sec00-<timestamp>.json`（另行保存；`evidence/` 已被 Git 忽略）

**判定：`container` 模式通過，`process` 模式失敗。** process 那一欄是本實驗的對照組，
也正是它讓 container 那一欄有了意義。

| 向量 | `process`（無 OS 邊界） | `container` |
| --- | --- | --- |
| v1 讀取秘密 | **canary 洩漏，20/20 次重複** | clean |
| v2 往外寫入 | **sentinel 被修改，並植入檔案** | clean |
| v3 對外連線 | **sink 收到 40 個 TCP 與 40 個 UDP** | 0 次抵達 |
| v4 symlink 逃逸 | **透過 symlink 寫到工作區之外** | clean |
| v5 置換 git 歷史 | clean | clean |
| v5b git 執行控制 | clean | clean |
| v6 ignored／untracked payload | clean | clean |

有三項發現比通過／失敗本身更有價值：

1. **洩漏來自 `ps -Eww`，不是 `/proc`。** 這台主機沒有 `/proc`，所以威脅模型指名的那條
   Linux 路徑根本無法被觸發。darwin 上的等價手法，則在每一次重複中都把父行程的 canary
   洩漏給一個環境已完全洗淨的子行程。兩者讀到的都是 **`exec` 當時**的環境，這也是為什麼
   harness 會帶著 canary 重新 exec 自己一次 —— 較早的版本是在執行期才賦值，結果什麼都
   沒量到，還回報「clean」。在容器內 `/proc` 存在、被掃過，且不含 canary：這是一項確實
   執行過的檢查給出的正面結果，不是「檢查根本沒跑」。
2. **v5、v5b 與 v6 在兩種模式下都通過**，因為它們本來就與邊界無關。置換 git 歷史、植入
   看似乾淨的 filter 與 hook、以及 ignored 檔案 payload，都是由引擎的相對基準 diff 與
   完整性封印攔下的。容器在這裡幫不上忙；而只回報 container 那一欄，會掩蓋掉究竟是哪一
   項控制在做事。
3. **容器並不是阻止 payload 去嘗試的那個東西。** 在 v3 中 payload 自行回報
   `udp: "SENT"`，而 sink 記錄到零次抵達。判定以 sink 的計數為權威；payload 的自我回報
   屬於對方願意配合才成立的資訊，絕不用於判定。

殘餘風險，這次結果並未改變它：namespace 與 cgroup 是**核心**邊界，不是 hypervisor
邊界。SEC-00 的門檻接受這一點，`SECURITY.md` 也記錄了它。

**叢集內的閘門尚未達成。** GKE pod 沒有 Docker daemon，所以 `describeIsolation()` 在那裡
回報 `process` —— 也就是上表失敗的那一欄。共享部署維持關閉真實代理執行，本機這次通過並
不改變這件事。要在叢集內達成，需要每次執行一個 Kubernetes Job 或 sibling runtime，而目前
兩者都還不存在。

### 2026-08-06 — P0／P1 實驗 harness（PD-01/02/03、AG-02/03/04、SEC-01、DATA-01、I18N-01）

- Source commit：`fc77386` —— 刻意與上面 SEC-00 條目的 `abd03ae` 不同，因為這是同一天的
  **兩次獨立執行**，不是同一批。這裡的 harness 結果是在 `fc77386` 以 `npm run check` 驗證的；
  `abd03ae` 之後才加入 REC-01 的修法，那之後測試套件為 318 項伺服器測試。
  `npm run check` 全綠，296 項伺服器測試加 13 項 fixture 測試
- 環境：macOS 本機主機、Node.js `v24.3.0`、`EXECUTION_MODE=demo`、離線
- 每個 harness 都是決定性的（帶 seed、不對牆上時鐘做斷言），並各自印出自己的量測摘要；
  真實案例數是各檔案中具名的常數，而在數字未達計畫書期望值時，檔頭會說明原因。

通過：**PD-01**（狀態機與審查閘門）、**PD-02**（1,000 種帶 seed 的排程、24,423 次請求、
4,000 次歸屬探測 —— 零跨任務洩漏、零重複副作用、零不變量失敗、零 handler 拋錯）、
**PD-03**（10,000 個身分 fuzz 案例加 400 次真實 HTTP 任務建立；零錯誤綁定，驗證 p95 為
0.81–1.03 ms）、**DATA-01**（200,000 個分配器 property 案例加 2,000 次已對帳的生命
週期）、**AG-03**（999 次標籤檢查、58 次條件檢查、零過度聲稱）、**SEC-01**（20 項量測
達成 18 項）、**I18N-01**（每個語系 351 個 key、完全對等，並檢查 73 個標為安全性的 key
有沒有掉掉限定語）。

**回歸與修正註記（2026-08-11）。** Candidate `99f2205` 曾回歸至 17/21，pipeline
`2749163703` 因而正確阻止 image 發布。目前 source 已把 campaign-D 文案移回
dictionaries、補回 seeded 限定詞並移除五個 dead keys，現為 21/21、每語系
634 keys 與 121 個 security-marked keys。部署仍需另一層證據。

失敗，並且維持失敗：**AG-02** 敗在善意案例的 false positive 率 47.1%（16/34），門檻為
5%，量測所用的是刻意設計、語意相近的仿冒語料 —— 一份貼近現實的模糊任務語料只有 3.1%，
所以 47% 是「看起來像攻擊的文字」的上界，不是基準比率。它的圍堵部分通過。**AG-04** 為
24 項量測達成 22 項，只敗在兩項屬於行程層級退回路徑本身的性質：一個刻意 detach 的孫行程
能存活過 group kill（只有 PID namespace 或 cgroup 能補這個洞），而凍結 argv 並不能凍結
`npm test` 在執行當下解析出來的東西（真正擋下它的是寫入拒絕清單與受保護路徑預檢）。

未量測，如實陳述而非假定：真實模型的棄權率（AG-02 T3 需要真實 runner，而 demo runner 是
腳本化的，永遠不會棄權）、追蹤開啟時的 trace 內容（需要網路 sink），以及 UX-01、
A11Y-01、PERF-01 與 I18N-01 中需要真實 DOM 的瀏覽器部分。

這些 harness 找出、且本次工作階段已修正的問題：一次重送的 pledge 扣了兩次款、整份寫入
拒絕清單被大小寫不敏感的檔案系統繞過、`../src` 變成可執行工作區、並行 reset 損毀資料庫、
一個會拋錯的 SSE 訂閱者把任務卡死、取消訊號從未抵達測試子行程、模型回應主體沒有上界，
以及每次執行產生兩份驗證計畫。每一項修正都把原先記錄該缺陷的那個測試反轉過來，於是那條
曾經記錄缺陷的斷言，現在成了防止它回歸的守門人。

### 2026-08-06 — 首頁與社群表面（UX-01 重新量測）

- Source commit：`76e3ccf`；production build 由應用程式自己在一個空閒 port 上提供
- Harness：`server/landing.test.ts`（11 個案例），另加在 1440×900 與 390×844、兩種語系下的
  瀏覽器實測
- 環境：macOS、Node.js `v24.3.0`、`EXECUTION_MODE=demo`、隔離探測回報 `container`

**自動化 —— 通過。** 這 11 條誠實性不變量涵蓋：計數器由資料庫算出（做法是改動一筆認捐資料
列，並要求總計精確位移 250,000 —— 一個寫死的常數能通過每一項範圍檢查，卻過不了這一項）；信
標能對應到真實貢獻者、座標有效且沒有重複；沒有任何執行在跑時，即時活動條是空的；每個專案都
有一份雙語、且已聲明產生器的白話說明；影響力卡片絕不把一項未知的量測變成零，而且它的 `dataMode`
與所屬專案一致；時光機的推估是標記在**資料裡**的，而且無法從一個未經量測的基準推算；留言牆
的主體在儲存前已遮蔽、作者由伺服器指派；每個類別一票，且具冪等性；以及兩張新表都會被示範
重設清空。

**瀏覽器 —— 通過，並找出且修掉一項缺陷。** 五個區塊都會渲染、只有一個 `h1`、沒有跳過標題層
級、在兩種寬度與兩種語系下都是零水平溢位與零被裁切的控制項、畫面上沒有任何未翻譯的 i18n
key、沒有未加標籤的控制項，而且每一個必要的 provenance 標籤都看得到：seed 資料註記、
點數→token 換算註記、地圖的「示範地點，從未收集地理位置」，以及 MVP 的本機票數註記。切換語
系時 `lang` 會變成 `zh-Hant-TW`。

那項缺陷：主視覺的計數器可能在往上數的過程中卡住並停在那裡 —— 渲染出 11,579,355，而真實值是
19,020,000；渲染出「1 項功能完成」，而真實值是 2 —— 因為 `requestAnimationFrame` 在隱藏的分
頁中不會觸發，`setTimeout` 卻會。`sr-only` 的數字全程都是正確的，所以這是一個只有明眼使用者
才會看到的錯誤數字，而且它就出現在那個存在目的就是要值得信任的表面上。現在有一個收尾計時器
保證那個精確的值，不論跑了幾個 frame。

**方法備註，因為它改變了兩個結論。** 卡住的計數器第一眼讀起來像產品 bug；但
`document.visibilityState` 是「hidden」，而一次探測量到 900 ms 內有零個 rAF frame，所以這次
凍結是環境造成的，那項修法是強化，不是 bug 修正。另外，稽核途中的一張截圖顯示版面看起來壞掉
了；直接量測各區塊的幾何（277/931/438/714/4316 px，沒有任何失控元素）顯示那是隱藏分頁中的合
成結果。兩者都是在動任何東西之前先查核過的 —— 同一套紀律，在同一天稍早也抓出過一次幻影的
939 個元素溢位，以及一次幻影的 WCAG 焦點失敗。

**UX-01 仍未涵蓋的部分：** 認捐→執行→審查的端到端旅程、SSE 重連，以及載入／空白／過期執行
狀態。A11Y-01 的對比比值、縮放重排、減少動態效果下的渲染，以及螢幕閱讀器旅程，都仍未量測。

### 2026-08-06 — v0.3.9 候選版儲存庫驗證

- Source commit：[`237d833`](https://github.com/ianjuantw/commoncommit/commit/237d8339068b2f45d691d08eeaabc85d6f44f8b1)
- 環境：macOS 本機、Node.js `v22.23.0`、乾淨的一次性 clone
- 執行模式：`demo`，並設定 `DEMO_SPEED=0`
- 可執行目標：僅內建 `fixtures/tempo`

命令：

```bash
npm ci --no-audit --no-fund
EXECUTION_MODE=demo DEMO_SPEED=0 npm run check
make check-version
```

觀察結果：

| 階段 | 結果 |
| --- | --- |
| 瀏覽器 TypeScript | 通過 |
| 伺服器 TypeScript | 通過 |
| `fixtures/tempo` | 13 項測試通過 |
| 伺服器測試套件 | 122 項測試通過 |
| Vite 前端建置 | 通過；轉換 1,703 個 modules |
| esbuild 伺服器 bundle | 通過 |
| 版本一致性 | nonprod 與 changelog 均為 `v0.3.9` |

引導式瀏覽器流程另涵蓋 1,440 × 900 與 390 × 844 視窗、英文與繁中切換、
本地化找不到頁面、GitHub 匯入失敗後回復、fixture 募資流程至本機發布，
以及認捐對話框的初始焦點、Escape 關閉與焦點返回。兩個視窗皆無水平溢位；
手機版所有可見 Header 點擊目標實測至少 44 px。本次候選版工作階段沒有新增
console error。

命令輸出與瀏覽器觀察記錄在本機 Codex 任務紀錄中；螢幕截圖未作為可長期保存
的證據包提交。因此，這是範圍受限的候選版儲存庫驗證，並非
`VALIDATION-EXPERIMENTS.zh-TW.md` 全部實驗的正式通過。尤其 `SEC-00` 仍為
blocked，對不受信任的真實 Agent 執行仍是 no-go；`DATA-02` 也會維持 blocked，
直到完成可持久化、多程序測試。

相依套件審查備註：npm 對 React Router 回報兩項 high findings，但
[上游 advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-qwww-vcr4-c8h2)
把此候選版已安裝的 `7.18.2` 列為 7.x 修補版本。此差異會誠實記錄，不會改寫成
「稽核零發現」的聲明。

### 2026-08-06 — 強化前儲存庫檢查（已被取代）

原始觀察沒有記錄不可變 commit、應用版本、執行模式、環境 profile 或保留的證據包。數字會保留作為歷史，但不符合上方證據規則，也不得作為 v0.3.9 candidate 的結果。

命令：

```bash
npm ci
npm run check
```

觀察結果：

| 階段 | 結果 |
| --- | --- |
| 瀏覽器 TypeScript | 通過 |
| 伺服器 TypeScript | 通過 |
| `fixtures/tempo` | 13 項測試通過 |
| 伺服器測試套件 | 86 項測試通過 |
| Vite 前端建置 | 通過 |
| esbuild 伺服器 bundle | 通過 |

測試觀察總計：99 項通過、0 項失敗。此測試套件不包含瀏覽器自動化。

### 決定性的示範生命週期

引擎測試套件會執行完整的 fixture 生命週期：

1. 建立新的 `tempo` 工作區，並以 Git 建立基準；
2. 記錄 13 項測試皆為綠燈的基準；
3. 套用腳本化的第一版修補，並觀察真正的失敗；
4. 套用修正，並觀察 20 項測試通過；
5. 計算真正的 diff，並通過決定性閘門；
6. 建立本機審查產物；
7. 核准、更新本機發布狀態、退還未使用點數，並頒發示範成就。

迴歸測試也會驗證執行中重設、預載歷史的誠實標籤、寫入範圍限制、symlink 處理、遮蔽、狀態轉換、reporter 解析與送出閘門。

## 證據規則建立前的歷史觀察（不構成合格結果）

下列真實模型與部署紀錄早於上方證據規則，缺少不可變 source commit、完整環境身分、精確指令與保留的證據包連結。它們只保留作為設計背景，不得視為已重現、目前有效或通過的實驗；做出能力聲明前，必須依實驗計畫重新執行。

### 真實模型觀察

下列觀察於 2026-08-04 與 2026-08-05 針對內建的 `fixtures/tempo` 儲存庫記錄。它們證明該路徑曾在指定設定下運作；不保證其他模型或日期會產生相同輸出。

### 有界的 LLM 工具迴圈

設定：使用當時所設定之 `gpt-5.5` 端點的 `llm` 執行器。

目標 issue：擴充 `parseDuration`，使其在保留既有行為的同時，接受 `1h 30m` 之類的複合時間長度。

觀察到的順序：

| 觀察 | 來源 |
| --- | --- |
| 基準 13/13 | 引擎 |
| 列出 fixture 的七個檔案 | LLM 工具 |
| 讀取實作、兩個既有測試檔與 README | LLM 工具 |
| 搜尋 28 個相符的呼叫點或符號 | LLM 工具 |
| 修改 `src/index.mjs` 並新增測試檔 | LLM 工具 |
| 送出前自行執行測試套件 | 使用引擎能力的 LLM 工具 |
| 最終 18/18 測試套件與兩檔案 diff | 引擎 |
| 準備審查產物並保留以待決定 | 引擎 |

該次工作於一次執行器嘗試中完成，共使用十次工具呼叫。另一次回饋執行加入維護者要求的邊界案例，最後有 20 項測試通過。

這些證據支持的聲明範圍很窄：對此 fixture 與模型設定而言，有界迴圈檢查了相關檔案、增加測試涵蓋、自行測試其工作，並通過獨立的引擎執行。它並未證實一般儲存庫都能成功，也未證實可以安全地執行任意程式碼。

### 建議性 diff 審查

真實模型審查是針對觀察所得 diff 所做的另一個獨立呼叫。它找出了測試未涵蓋的相容性問題，包括是否應接受重新排序或重複的單位。結果以建議資料保存，不會控制狀態機。

較早的實驗曾使用較弱的活動模型進行審查，結果只回傳沒有資訊價值的核准。該結果形成兩項持久規則：以執行模型進行模型審查，且絕不將靜態檢查呈現為 LLM 審查。

### 棄權

一項刻意模稜兩可的公開 API 移轉，要求執行器在沒有儲存庫證據的情況下選擇單位與棄用政策。執行器讀取並搜尋 fixture、沒有寫入任何檔案，並呼叫 `abstain`。引擎記錄了一次受阻的執行，並將任務移至 `stalled`，而不是回報實作失敗。

這證明棄權機制存在且曾成功運作一次；其比率與品質仍須以具代表性的語料庫評估。

### 部署觀察

先前曾透過 ingress 測試非正式環境部署，觀察到：

- `/healthz`、`/readyz`、SPA 資產、深層連結與 SSE 可連線；
- 真實 LLM 執行，之後接續一次維護者回饋執行；
- 觀察到建置身分、Prometheus 抓取與 Langfuse 資料匯入；
- 驗證了非 root 容器與可寫入的狀態 volume。

這些都是歷史觀察。它們無法證明目前的部署版本、鏡像同步狀態、GitOps 控制器是否安裝或憑證是否正常。請依循 `DEPLOYMENT.md`，並檢查即時 build-info 指標以取得目前事實。

## 成為永久檢查的發現

| 發現 | 永久對策 |
| --- | --- |
| 接受了綠燈但沒有 diff 的測試套件 | 閘門拒絕 `no_changes` |
| 執行器削弱了既有測試 | `LlmRunner` 會拒絕寫入既有測試；最終測試數量不得縮減 |
| 預載事件看似經引擎驗證 | 預載歷史使用 demo 來源標籤，並有迴歸測試 |
| 重設與執行中工作發生競態，導致服務崩潰 | reset endpoint 會 abort 並最多等待八秒再 reseed；timeout 與獨立 seed 指令仍是已知殘餘風險 |
| 退款只存在於 ledger 紀錄 | 發布會將點數退回貢獻者錢包，並有核算測試 |
| 不可讀的 reporter 輸出看起來像零項測試 | 解析器會回報明確的不可讀結果 |
| symlink 逃出字串前綴的包含範圍 | 路徑經 realpath 解析後才檢查，且 symlink 案例經過測試 |
| 遺漏的測量值被顯示成憑空捏造的數值 | 分析器欄位為選填，可行性結果會公開其測量訊號 |

`GOTCHAS.md` 會完整保留原始穩定 G01–G51 事故目錄與後續追加事故，包括後來由現況勘誤限縮的歷史聲明。

## 不使用外部憑證重現

```bash
npm ci
EXECUTION_MODE=demo DEMO_SPEED=0 npm run check
EXECUTION_MODE=demo DEMO_SPEED=0 npm run dev
```

接著開啟本機 UI，為可執行的 `tempo-duration` 任務補足資金、檢查執行時間軸、審查 diff、核准執行，並檢查貢獻者收據。

## 重現憑證檢查

設定本機已忽略的 `.env` 或環境變數後：

```bash
make validate-llm
```

預期證據包含成功結果、解析後的模型、延遲、token 用量，以及相容閘道有提供時的 request 識別碼。不得包含 API 金鑰。

---

## 2026-08-10 — LLM Phase 2 晉級基線

- Release：`v0.5.0`
- Prompt catalogue：source-controlled version 1
- Datasets：`cc-issue-triage-v1`、`cc-criteria-v1`、
  `cc-explanation-v1`、`cc-shadow-review-v1`、`cc-bilingual-v1`
- Owner：`commoncommit-agent-quality`
- Dry-run：`npm run eval:llm`
- Live：`npm run eval:llm -- --sync --live`（需要操作人明確執行，並具備
  model 與 Langfuse 憑證）

目前接受的是 source-controlled v1 fallback 與 application fallback 100% 的
契約，不是宣稱某個 candidate model 已勝出。Repo 只包含人工檢查過的合成 seed
items；任何 live input 都不會自動複製到 dataset。

### 晉級決定

本紀錄沒有晉級任何候選 prompt／model。每項功能至少收齊 50 筆 blinded human
annotations、P0 safety／grounding 不退步、宣告 confidence bounds、p95 latency
與 token budget 可接受，並保存 Langfuse dataset-run ID 前，online promotion
維持禁止。未來決定需記錄 commit、prompt version、model、run ID、score summary
與 owner。


## 本機穩定度迴圈 — 2026-09-12

分支 `codex/chaos-experiment-agents`，基於電腦 C `ec95912`；原始碼候選 v0.7.12。

第一輪 17 案（`773d6664-040d-4e18-ae63-ba3c6f121035`）有 3 項失敗：429／503 回應串流釋放與纯空白建議。修正後相同 seed／重複次數（`e1d119b7-cfac-4848-ace4-c5d67667bab2`）17/17 通過，3 案恢復且無回歸。這些問題發現輪次來自尚未提交的開發樹，不是不可變 release。

首次 live 建議因 GPT-5 mini 不接受舊 completion 參數而 fallback。調整相容參數與精簡角色 prompt 後，`3344cd5d-6e7a-48fb-9aca-d3d7144fbdd2` 完成 34/34 受控檢查，兩角色皆為 `generator: openai`、模型 `gpt-5-mini`。這證明取得且接受 provider 建議，不代表語意品質或 production 穩定。先前部分成功／fallback 報告也保留。報告在忽略的 `var/chaos-agents/`；最終 CLI 亦記錄 source hash 與 commit／dirty 身分。

驗證：`npm run check`（69 通過、0 失敗、54 個既有 TODO）、規格 lint（126 specs，無錯誤／缺測試）、4 個 Python linter 測試、`npm run check-version`（0.7.12）。未變更瀏覽器行為；既有視覺核准與 B 執行整合仍待完成。執行邊界見 [操作手冊](CHAOS-AGENTS.zh-TW.md)。

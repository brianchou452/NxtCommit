# 安全性與信任邊界

> **Self-update lane (2026-09-12):** 獨立自我更新流程可將有界模型修改套用至三個本機前端檔案。候選在固定 Docker image 中執行，無網路、憑證或 Docker socket，原始碼與測試唯讀。Demo／off 的 epoch 變更撤銷待套用版本；剩餘風險見操作手冊。 [Runbook](SELF-UPDATE.zh-TW.md).

> **Local resilience update (2026-09-12):** 本機 chaos 使用合成憑證、私有 transport 與可拋棄記憶體資料庫；無公開注入介面或任意目標。模型不能執行命令、改 gate 或原始碼；週期迴圈具輪數上限與互斥鎖。 [Runbook](CHAOS-AGENTS.zh-TW.md).

## 電腦 C authoring 與 review 邊界

C 切片僅接受公開 HTTPS GitHub identity，每次最多讀取五筆 issue／PR 資料再排除 PR；空結果表示該有限視窗未觀察到 issue。Response、issue text 與模型輸出都有大小上限。Process-local analysis／draft token 最多 30 分鐘到期，具容量限制並由 reset 失效；client edits 不會取代 server snapshot。Reset epoch 拒絕進行中的舊 authoring 結果，review comment 在儲存前先遮罩秘密。

Fresh review 需要 B-owned evidence、量測過的 integrity port 與 deterministic gate 驗證；預設 demo reader 使用獨立標示的 authored-seed 例外，不能證明 fresh engine verification。Provider perspective 是唯讀 UI 示範，不是身分驗證或存取控制。Model instruction 與輸出檢查可減少無依據文案，但不證明語意 grounding；模型無法修改估算、證據或 lifecycle 決策。匯入專案仍不可執行。


[English](SECURITY.md)

NxtCommit 是實驗性原型。其控制措施旨在讓 fixture 示範可供稽核；這些措施不足以在共享或正式環境中執行任意第三方程式碼。

## 威脅模型

下列所有項目皆應視為不可信：

- 儲存庫檔案、檔名、symlink 與相依套件腳本；
- GitHub 回傳的 issue 與 README 文字；
- 透過 UI 輸入的維護者回饋；
- 測試輸出；
- 模型回應及其聲稱的摘要。

請保護下列資產：

- 伺服器端 API 金鑰與可觀測性憑證；
- 執行工作區以外的檔案；
- 驗證定義與既有測試；
- 測試、差異、來源及模式標籤的完整性；
- 服務可用性與本機狀態。

目前部署假設操作者與示範使用者皆可信任。它不提供帳號身分驗證、授權、租戶隔離或使用者之間的安全邊界。

## 每項控制實際涵蓋的範圍

| 控制 | 適用範圍 | 無法確立的事項 |
| --- | --- | --- |
| 每次執行專屬容器（`engine/isolation.ts`） | 每一個沙箱指令，前提是探測確認邊界可用 | Hypervisor 邊界；探測回報 `process` 時則什麼都不成立 —— 包括沒有 Docker daemon 的 GKE pod |
| 以 Git 為基準的 fixture 工作區 | 由引擎執行的 fixture 任務 | 作業系統層級隔離 —— 單憑它自己無法確立 |
| 證據圍籬與秘密形狀遮蔽 | 選定的工具結果、測試輸出、事件字串與差異 patch | 統一涵蓋每個模型輸入或產出物欄位；已移除每一種秘密格式的證明 |
| `LlmRunner` 圍堵與寫入拒絕清單 | 模型導向呼叫與固定開場預讀 | 作業系統邊界，或對 `CodexRunner` 的指令仲介 |
| 引擎執行的最終測試與差異 | 即時 fixture 執行 | 每項驗收條件的正確性 |
| 可審查性閘門 | 進入本機 `needs_review` 狀態的轉換 | 經身分驗證的人工核准或上游 CI |
| 驗證期間的 `--network none` | 每次執行專屬容器內的每一個指令 | 走行程層級時的任何保證 —— 此時代理變數仍然只在對方願意配合時才有效，raw socket 直接忽略它們 |
| 代理變數與套件管理器離線旗標 | 行程層級退回路徑中願意配合的子行程流量 | 硬性網路隔離 |
| Kubernetes NetworkPolicy | Manifest 允許的 Pod 層級流量 | 每次執行專屬的對外連線隔離；目前的 HTTPS 規則沒有目的地限制 |
| 非 root、唯讀的容器檔案系統 | 應用程式容器 | 伺服器與子行程共用其 UID 與 PID namespace 時，兩者之間的隔離 —— 那正是行程層級退回路徑，不是容器路徑 |
| 秘密形狀遮蔽 | 證據、日誌與提示詞中明文憑證的意外洩漏 | 對惡意 runner 的圍堵：base64、hex 與 percent-encoded 值都會通過，而任何明文比對器都補不了這個洞 |

## 已實作的控制措施

Repository analysis 只接受明確的 `fixture` 與 `github` source 值。未知值會在
analysis 或 capability 發出前，以 `4xx` fail closed；它們不能再默默選中可執行的
bundled fixture。這項輸入驗證不會擴大 GitHub 存取，也不會讓 imported repository
變成可執行。

### 證據與輸出處理

受限工具會圍籬並遮蔽檔案讀取、搜尋與測試結果。產出物的差異 patch 會被遮蔽；發出事件時，會遮蔽字串詳細內容，以及存在時的輸出 payload。

涵蓋範圍並不一致。覆蓋率**依執行器而異**，而這句話的前一個版本只描述了 `LlmRunner`，因此講得太滿。在 `LlmRunner` 中，目標與驗收條件會被遮蔽並附上作者標記（刻意**不**加圍籬 —— 圍籬的意思是「不要照著做」，而目標正是代理唯一必須照著做的東西），維護者回饋同時有圍籬與遮蔽，嘗試歷史有圍籬，`list_files` 也會遮蔽檔名。`CodexRunner` 則完全沒有呼叫 `redactSecrets` 或 `fenceEvidence`：它把目標、驗收條件與維護者回饋原文送進提示詞。其餘仍然不均勻的是；產出物摘要、風險及審查備註並非全部經過同一個遮蔽邊界。請將 `fenceEvidence()` 與 `redactSecrets()` 視為已實作但呼叫點涵蓋不完整的基礎元件，而不是通用保證。

提示詞注入樣態是建議性訊號。命中會阻止執行被提升為可審查狀態；但這不能證明文字是惡意或無害。

請勿記錄或提交真實憑證。秘密應保存在行程環境變數、本機且已忽略的 `.env`，或部署環境的秘密儲存區。`make validate-llm` 只會回傳不含秘密的連線證據。

### 工作區圍堵

由 `tools.ts` 處理的模型導向路徑會使用共用的 realpath 圍堵檢查，且列出檔案時會略過 symlink。`LlmRunner` 工具寫入會拒絕絕對路徑、路徑穿越、`.git`、CI 組態、驗證定義、相依套件 lockfile、套件管理器組態、容器建置檔案、`LICENSE`、已安裝的相依套件及既有測試檔案。

`LlmRunner` 會透過共用的 realpath 圍堵 helper 讀取固定的 `ISSUE.md` 與 `package.json`，再截斷、遮蔽並圍籬內容。

拒絕清單刻意寫在程式碼中，而非執行期組態。任何變更都需要審查，以及防護／工具迴歸測試。

`CodexRunner` 直接使用 Codex SDK 的 workspace-write 模式，不會讓每次寫入都經過 `assertWritable()`。因此，引擎會對所有 runner 的完整相對基準 diff 套用受保護路徑政策，並在具權威性的最終測試前阻擋新出現的 ignored 檔案。可執行測試套件返回後，引擎會在任何 diff 指令前再次檢查 Git 控制與 ignored-file seal。這是通用可審查性閘門，不是指令或主機隔離；Codex 與 bounded tool 在該預檢前仍可執行程式碼。

### 驗證完整性

引擎會從執行前的儲存庫推導並凍結測試指令，而不會詢問模型。若基準為紅燈、零測試或無法解析，會在花費模型額度前拒絕；送出後會比較 index 與擷取的基準 commit、檢查受保護及 ignored 路徑、重新執行凍結套件，並在可執行測試返回後重查 Git／ignored 完整性，再套用影響範圍與測試數量檢查。Runner 的 commit 或 amend 無法重定義比較基準。

執行器不能只靠聲稱測試已通過，就讓一次執行變成可審查。然而，目前引擎只會整體驗證測試套件；它不會個別證明每項驗收條件，也不會採用上游 CI 的證據。

### 人工決策邊界

沒有任何執行器會自動合併或 push。一次執行只能建立本機產出物，而且 `approved → released` 需要明確的 API／UI 動作。

這是工作流程邊界，不是身分邊界。API 會忽略提交的審查者身分並記錄本機示範使用者，但仍沒有身分驗證或授權。

## 已知缺口

### OS 邊界確實存在，但只存在於被量測到的地方

每次執行專屬的容器邊界現在確實存在（`server/engine/isolation.ts`），而
[SEC-00](experiment-report.zh-TW.md) 已量測過它：七個攻擊向量共 140 次重複，沒有洩漏
任何秘密、沒有在工作區之外寫入任何東西，也沒有任何封包送達受控 sink。同一批 payload
在行程層級退回路徑上，20 次重複中有 20 次洩漏了憑證，並送出 80 個封包。

所以這個邊界既是真的，**同時也是有條件的**。`describeIsolation()` 會在啟動時真的做一次
探測：實際把工作區根目錄 mount 進容器，再讀回一個 token；失敗時它會回報 `process`，而
引擎會在 API 與 UI 中如實說明。請讀取它回報的狀態 —— 絕不要因為本文件描述了容器路徑，
就推斷邊界一定存在。

目前有兩種組態下探測會回報 `process`：

- **GKE pod 沒有 Docker daemon。** 叢集內的執行只有行程層級控制，因此 SEC-00 的 P0
  閘門在那裡**尚未達成**，共享部署必須維持關閉真實代理執行。要在叢集內達成，需要每次
  執行一個 Kubernetes Job 或 sibling runtime，而兩者目前都還不存在。
- **工作區根目錄不在 Docker 的分享路徑內。** Docker Desktop 不會失敗，而是默默換上一個
  空目錄，所以探測會把讀不到內容的 mount 一律視為完全沒有邊界（見 `GOTCHAS.md` G48）。

`ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1` 仍然保留，作為沒有 Docker 的可拋棄筆電的逃生出
口。它只是風險確認，不是控制措施，而且它什麼保護都沒有加上；現在要通過閘門，已驗證的
邊界才是首選路徑 —— 正因為它是量測出來的，而不是承諾出來的。

這個邊界**不是**什麼：namespace 與 cgroup 是**核心**邊界，不是 hypervisor 邊界。一次核心
層級的逃逸就能突破它。SEC-00 的門檻接受核心邊界，而這份殘餘風險正是為什麼執行任意儲存
庫仍然需要計畫書晉級檢查表所要求的威脅模型審查，而不是閘門過了就算過。

目前只有 bundled fixture 可以執行。在部署環境本身能量測到每次執行專屬邊界之前，共享部署
請維持此限制。

### 留言牆會接受來自未經身分驗證行為者的不可信文字

留言牆是第一個把訪客自己寫的文字存下來、再回送給其他每一位訪客的表面。有三道控制在此適用，
而其中第一道的先後順序很重要：

- 留言主體是在寫入**之前**經過 `redactSecrets`，不是在送出的路上。只在讀取時遮蔽，會讓原始值
  留在資料庫裡，而一份備份、一筆查詢的 log，或是未來某個端點，都會把它曝光出來。
- 長度上限在伺服器端以 code point 為單位強制執行，所以跳過瀏覽器檢查的用戶端也無法寫入一筆
  沒有上界的資料列。
- 作者、角色與時間戳都由 `store.getCurrentUser()` 指派。這裡沒有身分驗證，所以由用戶端提供的
  身分會直接成為一個身分冒用原語；UI 會渲染 `wall.localNote`，說明留言牆上沒有任何人是經過
  驗證的。

它**沒有**做到的事：對 HTML 做淨化。React 會轉義文字節點，所以目前的 renderer 是安全的，但未
來若有某個表面把留言主體插進標記語言裡 —— 一封 email 摘要、一張 OG 圖、一份 PDF 收據 ——
那個表面就需要自己的轉義。遮蔽移除的是憑證，不是標記語言。

### 網路隔離僅為盡力而為 —— 在容器之外

在每次執行專屬容器內，驗證會以 `--network none` 執行，而 SEC-00 量測到 raw TCP、UDP、
DNS、HTTPS 與雲端 metadata endpoint 在受控 sink 上的抵達數皆為零。那是真正的阻斷，不是
對方願意配合才成立的提示。

在行程層級退回路徑上，驗證階段會設定代理變數與套件管理器離線選項，而 SEC-00 已量測出這
套做法究竟值多少：20 次重複中有 40 個 TCP 連線與 40 個 datagram 抵達 sink，因為 raw
socket 完全忽略代理變數。請勿把這條退回路徑描述成已停用對外連線。

隨附的 Kubernetes policy 允許沒有目的地 selector 的 HTTPS。它可作為粗略政策，但無法讓驗證完全斷網。請勿在文件或標籤中聲稱目前系統已停用對外連線。

### 驗證規劃與測試證據仍需強化

在一般儲存庫可執行之前，引擎仍必須：

- 為每個支援的測試框架使用結構化 reporter；
- 支援範圍讀取，並防止截斷的讀取內容被當成完整檔案寫回；
- ~~以決定性方式清理工作區~~（已完成：`runLoop` 在 `finally` 中回收）並強制執行儲存配額；
- 驗證 clone scheme、主機、解析後位址、commit 識別、大小、套件形態與授權政策。

LLM 工具路徑會強制執行 24 次非終止呼叫、200 KB 讀取、200 KB 累計寫入、單檔 80 KB 寫入上限，以及受限且計費的列舉與 literal 搜尋。它們只限制成本與證據攝取，無法限制 SDK runner 指令、CPU、子行程建立、真正沙箱外的檔案存取或 raw network 流量。

### 秘密啟動載入仍需強化

部署輔助程式會以 shell 程式碼方式載入本機 `.env`，並透過 `kubectl --from-literal` 傳遞秘密值，執行期間可能經由本機行程參數暴露這些值。只能使用受信任的本機輸入與受信任的工作站。在將此啟動路徑視為已強化前，請改用受限 dotenv parser，搭配 stdin 或平台秘密管理器。

### 部署狀態是暫時性的

SQLite 與工作區使用 `emptyDir`。重新啟動與 rollout 會遺失狀態。Rolling update 可能短暫執行兩個各自具有獨立資料庫的 Pod。目前單一 replica 的設定是必要條件，但無法消除此轉換期間的時間窗。

## 安全性敏感變更的必要審查

變更執行器、工具、防護、沙箱、儲存庫輸入或部署政策時：

1. 說明控制適用的執行器與邊界。
2. 優先使用決定性強制措施，而非提示詞指令。
3. 加入嘗試繞過新增或變更控制的迴歸測試。
4. 執行 `npm run test:server` 與 `npm run check`。
5. 若威脅模型或保證有所變更，請更新本文件。
6. 在每次執行隔離工作完成前，避免擴大可執行的儲存庫範圍。

若懷疑憑證外洩，請先在儲存庫外輪替該憑證。不要將秘密內容貼入 issue、commit、日誌、測試 fixture 或文件範例。

# 變更日誌

[English](CHANGELOG.md)

本文件記錄已發布、使用者可見、架構相關及安全性相關的變更。它不記錄每一次編輯；該細節由 Git 歷史保存。

部署版本會與 `Makefile` 及 `k8s/overlays/nonprod/kustomization.yaml` 保持同步。已發布項目由新至舊排列。

## v0.7.20 — 2026-09-12

- 移除導覽列下方常駐的示範／隔離提示區段，執行錯誤保留為獨立 alert；同步 shell 規格、雙語字典與瀏覽器回歸測試。

## v0.7.19 — 2026-09-12

Responses 呼叫去重、同時與每小時上限、真實 token counters、依資料庫 revision 更新 projection，以及共享展示重設／備份保護。依使用者指示保留目前視覺，不處理舊 baseline 差異。

## v0.7.18

- 正式 authoring 接上共用 Responses API，保留受限金鑰與 demo 執行邊界，並向 Langfuse Cloud 匯出實測模型耗時與 usage，僅含受限 metadata。

## v0.7.17 — 2026-09-12（整合 main）

- 合併 Phase 3 A／B／C 產品與目前 Cloudflare delivery、CI 最佳化。Production image 納入兩個可執行 fixture 與 Git，deployment receipt 改為整合後 fixture-only 邊界。
- 保留限定 egress、Responses key 邊界、ephemeral storage、監控與 cutoff；全部 40 張 approved 原圖及未解決差異均保留。

## v0.7.16 — 2026-09-12

- 啟用限定 OpenAI 的 HTTPS interception 與 Node 憑證信任；部署驗證容許較長的 Cloudflare 容器配置時間。

## v0.7.15 — 2026-09-12

- 在實際 Cloudflare 容器新增需驗證身分的固定 prompt OpenAI 連線檢查，每個程序最多一次 provider 呼叫。

## v0.7.14 — 2026-09-12

- 部署探測使用明確的服務 User-Agent；監測只讀容器狀態，不重設兩小時閒置計時。

## v0.7.13 — 2026-09-12

- 匯出 Containers SDK 啟動容器所需的 outbound proxy。

## v0.7.12 — 2026-09-12（Cloudflare 容器接入）

- 將 Phase 1 Node 後端與前端打包為非 root 容器；設定單一 basic 實例、閒置 2 小時休眠、資源紀錄與映像版本驗證。實際部署證據另記於 CI checkpoint。

## v0.7.12 — 2026-09-12（本機 Phase 3 整合）

- 依序整合 dev/computer-a、dev/computer-b 與 dev/computer-c。新建立的 duration fixture 使用同一個任務狀態來源，串接贊助、執行與本機審核。
- 接上 Marketplace／profile 投影、留言、導覽目標、worker readiness 與 SSE；拒絕過期頁面回覆及舊 run 決策，匯入的 repository 仍不可執行。
- 新增跨切片 HTTP／Docker journey 與所有 baseline 的驗證入口。保留 approved golden，不宣稱視覺核准或部署完成。詳見[整合證據](PHASE3-INTEGRATION.zh-TW.md)。

## v0.7.11 — 2026-09-12（本機電腦 A / Phase 2）

- 新增 SQLite Home/community 快照、示範資料重設、SSE 重新驗證、持久化遮罩留言、每類別投票鎖定與本機 contributor 收據。
- 新增 Home、Marketplace、profile、導覽啟動／恢復與路由恢復，包含雙語控制及 Docker 互動測試。B/C 流程仍由各自切片提供。
- 依要求，在首輪 13 個互動 journey 通過後移除 logo 背景矩形。保留既有 approved visual PNG；完整 Phase 2 驗證仍需視覺核准及缺少的 maintainer 控制項。

- 新增 mission／funding／execution 垂直切片，包含本機 compute accounting、
  僅限 fixture 的 demo execution、持久化 evidence 與 mission／execution 頁面。
- 使用者已明確授權 `dev/computer-b` 的 B 中央接線；驗證與剩餘限制記錄於
  [B 交接文件](PHASE2-COMPUTER-B-HANDOFF.zh-TW.md)。
- 這是原始碼候選，不代表部署或 approved visual baseline 更新。

## v0.7.11 — 2026-09-12（電腦 C Phase 2 原始碼；功能 E2E 通過；視覺待核准）

- 新增 capability-bound authoring、本機任務持久化與檢視決策、模型建議／備援、有限範圍的 observability 及 operations endpoints。
- 接上 New Mission、Review 與獨立設計概念頁，提供雙語文案及 Docker 互動 journey 定義。
- 獨立 Colima Docker 已通過 8 條 C journeys 與 4 條 foundation 回歸；14 個視覺比較有差異並已產生候選圖。原 approved 圖片保持不變；未宣稱完整 Phase 2 驗證、新的任務執行、視覺核准或部署。見[電腦 C 交接](PHASE2-C.zh-TW.md)。

## v0.7.10 — 2026-09-12（本機 Phase 1 原始碼 checkpoint）

- 建立前後端共用 TypeScript 契約、模組化 HTTP 註冊、SQLite migration／transaction／reset 基礎、雙語 shell 與 Docker 瀏覽器工具。
- Run 終止時間統一為 `endedAt`，API run 狀態與 domain 契約同步。
- 本次重建尚未包含 Phase 2 流程或 execution runner。nonprod overlay 僅記錄版本，不含可部署 workload；未宣稱 rollout 或更新 approved visual baseline。

## v0.7.9 — 2026-08-23

### 修正

- Guided Demo 現在會先完成 deterministic local reset，再進入所選角色 route，同時保留所有狀態變更操作都由使用者親自確認的邊界。
- 新增 Docker browser assertion，拒絕 opacity 為零的 New Mission 內容，並證明 reset 完成後才進行導覽 navigation。
- Executable spec 新增 runtime authority、terminal outcome 與 test constraint 欄位，避免把外部 automation 誤認為產品自身完成流程。

### 調整

- 修正 feature-reality matrix：產品提供的是 guided walkthrough，不是 one-click workflow automation。

## v0.7.8 — 2026-08-20

### 新增

- 新增 Phase 4 整合 gate、executable-spec 證據 ledger 與雙語垂直切片交付模板，讓完成狀態必須以有界 terminal outcome 證明，不再只依賴 route、UI 或 snapshot 證據。

### 變更

- 讓 Vite 開發伺服器監聽設定的 host interface，支援 container 與遠端開發存取。

## v0.7.7 — 2026-08-16

### 新增

- 新增並核准十張由 Docker Chromium 擷取的 golden baseline，涵蓋八份非首頁 visual spec：marketplace、mission authoring、mission detail、execution、review、contributor profile、guided demo 與 route fallback。

## v0.7.6 — 2026-08-16

### 新增

- 將可執行 spec 從首頁垂直切片擴充至目前全部 product API、SPA route、複合 workflow component、核心 domain、persistence boundary、跨層 policy，以及規劃中的非首頁 visual baseline。

### 修正

- Repository analysis 現在會在 analysis 或 capability 發出前拒絕未知 source 值，不再將其默默當成可執行的 bundled fixture。

## v0.7.5 — 2026-08-15

### 新增

- 擴充可執行的首頁 spec，補上可重建的 application shell、campaign card、demo reset、marketplace payload、localization、地圖、fixture 與 component dependency contract，讓首頁垂直切片即使沒有既有 frontend 或 shared type source 也能重建。

### 修正

- 將 source spec prose 排除於 Tailwind template discovery，避免修改 YAML contract 時暗中改變產生的產品 CSS 或已核准的 visual baseline。

## v0.7.4 — 2026-08-15

### 新增

- 新增四張經人工檢視的首頁視覺 golden baseline，以及可重現的截圖比對套件；測試會在 Docker 中使用相符且固定版本的 Playwright Chromium image，並隔離各案例的示範狀態。

## v0.7.3 — 2026-08-15

### 新增

- 新增機器可讀的首頁、元件與 API source spec、schema 驗證及 BDD 覆蓋，讓已實作的 landing 與 bootstrap contract 持續和規格一致。

### 調整

- 更新 TypeScript 開發與 CI 使用的 Node.js 型別定義。

## v0.7.2 — 2026-08-14

### 修正

- 讓首頁 Hero 文案與 Live Pipeline 在一般筆電的第一屏並排完整呈現，並保留大型螢幕的舒展版面。
- 補回算力地圖的 Pool 摘要、支持者頭像、控制列與地圖畫布視覺層級。
- 修正 Campaign 主圖的 repo 標題、workflow 與交付流程互相重疊的跑版問題。

## v0.7.1 — 2026-08-14

### 調整

- 以 15 個 editorial 開源 Campaign 重製線上首頁與 Campaign 詳情，加入多樣卡片主圖、一致的 Campaign 標題、兩階段交付 Tracker、完整開發計畫證據與 sticky 贊助卡。
- 首頁新增即時 Pipeline 動態與已完成 Release 故事區，並保留清楚的本機示範邊界。

### 修正

- 讓 GitLab 版本關卡信任 CI checkout 目錄，避免 candidate delivery 因 Git dubious ownership 保護而失敗。
- 更新 seed catalog 測試，分開驗證原有 10 個 lifecycle 範例與 15 個 editorial Campaign。

## v0.7.0 — 2026-08-14

### 新增

- 新增伺服器掌管的 `server-heuristic-v2` 運算估算：依已觀測的程式庫範圍、issue 大小、驗收條件、預計驗證輪數與風險產生分項、區間、信心與限制。模型填入的 `computeGoal` 不再具有決策權。
- 至少累積三筆同類成功執行後，以有界的「實際／預估」中位數校正後續估算；倍率固定限制在 0.75–1.5。
- 執行室與審查頁新增「實驗與驗證／驗證檔案包」，呈現基準與每輪測試、累計案例與失敗、命令、exit code、五個確定性關卡、驗收證據、預估與實際運算，以及殘餘不確定性。

### 文件

- 新增中英文 ADR-007，說明估算權責、校正條件、證據模型，以及為何測試數字不能稱為品質保證。

## v0.6.2 — 2026-08-13

### 修正

- 修復 Token 提供者 Demo 入口：補上獨立 `/marketplace` 路由，角色導覽不再落入找不到頁面。
- 捐助流星改用單一 cubic Bézier motion path，以連續曲線從左向右飛行，移除分段 transform 造成的折點與頓挫；仍保留贊助者名稱與多筆捐助 burst。

## v0.6.1 — 2026-08-13

### 調整

- 將產品操作導覽拆成 Maintainer 與 token 提供者兩種視角。導覽現在只指向
  下一個真實產品控制項，必須由使用者點擊後才會前進；已移除所有計時器
  代按行為。
- 將容易誤解的「本機審查」介面改為「檢查變更證據」，並明確說明：決定只會
  更新 CommonCommit 示範狀態，不代表 GitHub 核准、合併或發布。
- Token 提供者的證據頁改為唯讀，避免被誤認為具有 Maintainer 決定權。
  Demo 角色仍只是 UI 觀看視角，不是已驗證身分或權限。

## v0.6.0 — 2026-08-13

### 新增

- 啟動 Phase 3：新增 transactional run-request queue，包含 atomic lease、
  heartbeat、bounded retry、cooperative cancel、每個 mission 一個 active owner、
  expired-lease recovery，以及獨立 worker entrypoint。
- 新增 worker health／Prometheus metrics、受限的 Langfuse
  `queue-worker-run` trace、queue status API，以及跨 process 執行所需的 UI polling
  fallback。
- GitHub analysis 現在會保存觀測到的 default branch 與 immutable commit SHA，
  讓後續 intake 能固定 revision，不會 clone 持續移動的 branch。

### 安全邊界

- Phase 3 尚未完成或部署。Nonprod 仍維持 `RUN_DISPATCH_MODE=inline`、
  `EXECUTION_MODE=demo`，並禁止執行匯入 repo。每次 run 的 disposable workload、
  durable shared storage、簽章 artifact storage 與部署環境 SEC-00 證據仍為必要條件。

## v0.5.9 — 2026-08-13

### 修正

- 「查看開發計劃」現在會捲動到頁面中的真實計劃，不再把 fragment 誤交給
  React Router 當成應用程式路由。
- 首頁嵌入 Marketplace 時移除重複的「建立任務」CTA；獨立 Marketplace
  頁面仍保留該入口。
- 已完成 Release update 會連到實際的本機 Campaign；影響力收據與認捐紀錄
  中的專案識別也會開啟對應 Campaign。
- 停止執行被歸類為未來任務 Maintainer 或平台操作員的操作。Shared demo 的
  一般觀看者現在會看到缺少身分驗證的邊界，不再出現破壞性控制；未驗證的停止
  endpoint 也會 fail closed 回傳 `403 auth_required`，完整 RBAC 仍未實作。

## v0.5.8 — 2026-08-12

### 變更

- 品牌改為 NxtCommit，強化 N 字形 Logo，加入一致的 App icon、favicon 與高對比
  Token stream 首屏視覺。
- 擴充首頁敘事：放大雙語 Hero、整合本週社群算力 Pool、模擬 Live Pipeline、
  清楚的 Campaign 狀態，以及 Funded → AI 計畫 → Maintainer merge → Release 更新。
- Campaign 卡片與詳情改以 Release plan 與使用者效益為主體，加入 WhisperX、SQLite
  等熟悉範例；達標後也會由募資操作切換為開發進度與本機審查入口。
- 收緊 Campaign、Milestone、地圖與導覽版面，並同步修正文案、狀態與繁中／英文一致性。

## v0.5.7 — 2026-08-11

### 變更

- 首頁敘事改以 Commit 與 Commitment 的關係為核心，保留單一 Campaign CTA 與精簡的 Tokens 投入主張。
- Hero 後方新增精簡的單列「探索 → 支持 → 建置 → 合併」流程；執行界線持續由固定顯示的 Demo 提示列承載。
- 支持者地圖回到第三屏，Campaign 移到地圖之後；區塊標題改為「Commit 下一個值得發生的版本」，募資卡片操作品牌化為「投入 1K Tokens」。
- Category banner 降低高度，並以較輕的藍紫漸層取代接近純黑的視覺。
- 主導覽在兩種語系中統一調整為 Discover、New Mission、My Commitment、Demo，並依此順序排列。

## v0.5.6 — 2026-08-11

### 變更

- 首頁原本與主題脫節的黑色算力面板，改成呼應亮色 Campaign 的暖紫、薄荷與紙張
  動態畫布，同時保留清楚可讀的即時 API 統計。
- 預載示範支持者地圖由 14 個擴充為 20 個具有認捐紀錄的不同城市；地圖改以緊湊
  城市選擇器控制明細，不再於地圖下方列出 20 顆按鈕。
- 捐助流星改成由左至右的曲線軌跡，每一道都帶有實際本機認捐者 handle；較大的
  認捐仍只會產生有上限的動畫群，不會捏造新的捐助事件。
- 自動 Demo 的每個動作說明都錨定在即將操作的實際控制旁，加入 onboarding 風格
  的聚焦遮罩、響應式定位，並在認捐視窗內另外標示最後確認動作。

## v0.5.5 — 2026-08-11

> **交付註記：** Source commit `99f2205` 曾在 pipeline `2749163703` 被四個
> I18N-01 gate 擋下；本 release 的修正已恢復靜態 parity 21/21。不可變 image、
> Argo 與 serving 狀態仍以 delivery runbook 的獨立證據為準。

### 變更

- 正式 Mission 頁改用定稿的 D 版 Campaign 架構：Hero 與 Funding progress
  合成單一畫布，依序呈現白話產品故事、清楚標示的「如果專案消失」情境、
  Release 範圍與 Milestones；長篇 Campaign 右側保留 sticky 贊助操作。
- 首頁改以 motion 與真實資料共同呈現影響力。算力、支持者、Repo 與已完成
  Release 都讀取現有 API；只有視覺焦點移動，不會用動畫捏造即時數字。
- Campaign 依產品品類策展並套用 D 版視覺：黑色 motion banner、固定比例的
  一張主角卡與四張精簡卡；第六張起進入獨立延伸網格，不再把主角卡拉長。
- 一鍵 Demo 移到獨立分頁；本月社群獎項與投票留在首頁最後；移除缺少故事脈絡的
  「正在工作的代理」首頁區塊。

## v0.5.4 — 2026-08-11

### 變更

- 全產品介面套用選定的 Campaign 設計方向：DM Sans 字體、暖白紙張底色、節制的
  紫色與薄荷光暈、黑色膠囊主操作、紫色 Funding 進度，以及橫跨市集、任務、贊助、
  執行、審查、個人頁與建立流程的一致亮色元件系統。
- 首頁 Hero 改以產品故事呈現社群算力如何經過 AI 執行計畫推動具體 Release，
  同時保留 execution mode、證據來源與 demo 邊界等真實性提示。
- 保留原本的四個概念路由，並加入定稿的 Hybrid 首頁與 Campaign prototype，
  方便分享與後續設計討論。

## v0.5.3 — 2026-08-11

### 變更

- Rollout ownership 移到 Argo PostSync 後，移除舊 GitLab endpoint verification、
  release 與 production placeholder jobs。Candidate CI 現在結束於不可變 image
  發布，也不再上傳無 consumer 的 dotenv report。
- 新增回歸測試，強制 candidate 必須先於 main promotion、CI／GitOps 責任邊界，
  以及叢集內 exact-build verification。
- Scheduler 證據顯示舊 request 無法放進任何節點後，將 shared runner build pod
  的 admission reservation 由 800m 降為 250m；不設 CPU limit，image build
  仍可使用節點餘裕。

## v0.5.2 — 2026-08-10

### 變更

- 將 GitLab image 產生與 Argo CD 對齊之間的競速改為兩階段交付：GitLab 先在
  `delivery-candidate` 驗證並建置，確定不可變 image 存在後，GitHub 才
  fast-forward GitLab `main`。
- 新 commit 會取消已被取代的交付；版本未變的 scheduled reconcile 不會建立
  pipeline；npm 下載會快取，且不再上傳沒有 consumer 的 build artifacts。
- 新增叢集內的 Argo CD PostSync hook，不穿過受保護 ingress，也能驗證 readiness
  與實際 serving build identity。Deployment 必須穩定 ready 五秒才會執行該檢查。

## v0.5.1 — 2026-08-10

### 修正

- 完成 Langfuse trace 後會透過 single-flight exporter flush，讓一般流量期間就能
  觀察 export 成功／失敗與 flush latency，不必等到程序關閉。
- GitHub delivery verification 遇到 GitLab 跳過 `build:image` 時會立即失敗，
  顯示 `version-bump` 前置工作並輸出其 trace，不再白等完整 20 分鐘 image 視窗。

## v0.5.0 — 2026-08-10

### 新增

- 完成 Phase 0–2 原始碼實作：Langfuse v5 統一觀測邊界、有版本的 prompt
  provenance、受限 trace capture、feedback scores、五組 curated datasets、
  dry-run／sync／live experiment CLI、穩定 rollout cohorts、維運 dashboard 與
  有流量門檻的 alerts。
- 新增可選用的真實 LLM issue triage／acceptance criteria、campaign critique、
  evidence explanation 與 shadow diff review。每一層都有明確 generator／prompt／
  variant provenance 與確定性 fallback；都無法改變執行、測試、credits、發布或
  人工審查狀態。
- 新增雙語 Phase 3–7 roadmap；Phase 3 隔離 repo 執行明確為尚未實作，shared
  nonprod 維持 `EXECUTION_MODE=demo`。

- 新增以 gate 驅動的雙語計畫，涵蓋 read-only LLM triage、acceptance criteria、
  evidence explanation、shadow review、隔離的真實 agent 執行，以及由 trace
  契約、scores、datasets、dashboards、privacy、experiments、晉級與 rollback
  組成的 Langfuse 優化迴圈。
- 新增供 agent 使用的雙語 GitHub／GitLab／Argo 操作紀錄與完整功能真實性
  矩陣，分開標示真實 LLM、真實非 LLM 串接、混合／seed demo、純 UI 效果
  與未實作外部動作。Repo 根目錄的 `AGENTS.md` 會引導後續 agent 讀取這些
  真實性邊界，並記錄安全的憑證處理方式。
- GitLab 驗證 Pod 現在會明確設定受限的 Kubernetes CPU request，避免 runner
  已接下測試、Pod 卻在繁忙叢集上用完整個交付視窗等待排程；GitHub 逾時診斷也會
  同時輸出 test 與 image build trace。

## v0.4.10 — 2026-08-09

### 修正

- 修正自動 Demo 接受過低 AI 算力估算，導致募資成功後在審查前耗盡預算；
  現在產生的目標至少保留一次完整實作與驗證額度，終止失敗也會直接顯示於導覽，
  不再看似卡住。

## v0.4.9 — 2026-08-09

### 新增

- 導覽 Demo 現在會實際操作建立、選擇、產生文案、發布、捐贈、執行與檢視頁面的真實控制項。最後一頁會顯示實際本機 patch 與測試證據；沒有經過驗證的寫入權限時，也會明確停止在本機審查產物，不再假稱已送出上游 PR。
- 「正在工作的代理」現在會顯示引擎實際觀測到的事件、變更檔案、測試命令與結果、驗證狀態及資料來源，不再只播放泛用的模擬動態文字。

### 修正

- 沒有可用的已驗證 LLM 時，公開 GitHub 儲存庫仍可依真實 issue 資料產生保守的 Demo 募資文案；儲存庫探索不再被產生器模式錯誤停用。
- GitHub 儲存庫錯誤會在中英文介面分別指出「不存在或為私有」、「匿名 API 已達速率限制」與「上游暫時無法使用」。
- Server 測試的檔案併發上限固定為四，避免八核心 runner 上的恢復與代理預算重型實驗因彼此搶占 CPU 而產生假逾時。
- 容器建置會明確設定 build、helper 與 Docker service 的 Kubernetes CPU request，避免共用 runner 因節點剩餘容量小於過大的預設保留值，讓 Pod 長時間卡在無法排程的 Pending；這些數值只是排程保留量，不是 CPU limit。

## v0.4.8 — 2026-08-09

### 新增

- 社群體驗新增依 Token 貢獻縮放的地圖光圈、更豐富的即時代理動畫、重製投票、捐贈慶祝動畫、一鍵導覽 Demo、依贊助規模增加的流星，以及依類別著色的成就。
- 預載專案改為連到真正的上游 GitHub 儲存庫，Demo 也會明確區分編寫的示範情境與已驗證的上游 issue 資料。

### 修正

- main 分支 pipeline 現在會拒絕「映像相關原始碼已變更、卻重複使用既有發布標籤」的提交。這道關卡過去只在 merge request 執行，GitHub 直接鏡像時因此可能帶著不可覆寫的舊標籤進入 `build:image`。
- Argo CD 新增 `PreSync` 映像預檢；在新的不可變映像確實能被拉取以前，既有的 Recreate Pod 會繼續提供服務。因此 Git commit 即使早於映像抵達，也不再造成 ImagePullBackOff 停機。這個一次性 Job 會停用 mesh sidecar 注入，避免映像檢查結束後仍被 proxy 永久掛住。
- GitHub 現在最多等待 GitLab 映像交付二十分鐘，並在逾時時附上當下的建置 trace，不再把包含測試階段的十三分鐘視窗耗盡後只回報不透明的失敗。

## v0.4.6 — 2026-08-07

### 新增

- 長篇首頁新增雙語「快速前往」導覽，可直接跳至影響力、支持者地圖、即時代理及待辦專案；每個連結都指向實際存在的區段，並在窄螢幕維持 44 px 觸控高度。

## v0.4.5 — 2026-08-07

### 修正

- 「已設定但被拒絕」的執行模式不再讓 Pod 掛掉。`/healthz`、`/readyz` 與 `/api/bootstrap` 過去都呼叫會拋錯的 `resolveMode()`，因此在沒有逐次執行作業系統邊界的環境設定 `EXECUTION_MODE=llm`（也就是非正式叢集的實際樣貌）時，存活探測會回傳 500，容器便為了一個本來就正確的拒絕而不斷重啟。這三個狀態端點現在把拒絕當成資料回報（`resolved: null` 加上一段給維運看的 `error`）；真正阻止執行的仍然是 `executeMission`。
- GitHub 鏡像工作流程不再為「什麼都沒鏡像」的執行回報成功。這個儲存庫從來沒有設定過 `GITLAB_PUSH_TOKEN`，所以該工作流程歷史上每一次綠燈都是未設定時的略過路徑，GitHub → GitLab → 建置 → 部署這條鏈也從未因一次推送而完整跑完。推送仍然只警告並略過；新增的排程對帳則會失敗，因為心跳的存在意義就是回報真實狀態。

### 新增

- GitLab 鏡像新增每六小時一次的對帳。推送觸發只有一次機會，而 2026-08-06 有連續四次執行把這次機會賠給了 GitHub 端的 Runner 配發失敗（「The job was not acquired by Runner of type hosted」），每次都在沒有執行任何步驟的情況下燒掉 15 分鐘。對帳本身具冪等性，並且會在真的需要補上進度時加註——那是「推送觸發的鏡像曾經遺失」的唯一證據。
- `deploy:verify` 現在會在「真實代理已上線、卻沒有量測到逐次執行作業系統邊界」時讓部署失敗，把 SEC-00 從執行期的拒絕提升為部署關卡。
- 兩種語系都新增 `mode.refused`，讓被拒絕的執行模式呈現為專屬的危險色狀態，而不是渲染出原始的 `mode.null.desc` 鍵值。

### 修正（測試）

- `server/landing.test.ts` 不再呼叫真實模型。在持有 `OPENAI_API_KEY` 的機器上，它會對模型寫出來的文字斷言最小長度，因此同一棵沒有變動的樹跑兩次會得到不同結果、失敗在不同專案上；而 GitLab 的 job 沒有 `.env`、沒有 secret，一律走確定性的內建文案路徑。本機那道關卡才是比較嚴格也比較不穩的一道——而那正是沒有人會去檢查的方向。

### 變更

- `deploy:verify` 的推出落差訊息改以證據為準。它會記錄十分鐘等待期間線上版本究竟有沒有變動過，並把「沒有控制器」與「同步到錯誤版本」兩種情況分開回報，而不是兩種都列出來讓讀者自己猜。

## v0.4.4 — 2026-08-07

### 變更

- 市集卡片以精簡的影響力資訊取代 GitHub Star：下游相依專案數、每週下載次數及資料來源，現在會和儲存庫消失後的具體後果一起呈現。

## v0.4.3 — 2026-08-07

### 變更

- 儲存庫卡片現在優先說明值得支持的人類價值：儲存庫消失後會壞掉什麼、具體成果、誰會受益，以及為什麼現在需要支持；每個預載專案都有具體的雙語影響文案。

## v0.4.2 — 2026-08-07

### 新增

- 內建公有領域的 Natural Earth 陸地輪廓與會避開碰撞的城市標籤，讓支持者地圖不必依賴
  執行階段的外部地圖服務也能完整顯示。
- 新增地圖幾何與狀態、響應式任務操作、原生表單控制項、階段追蹤、鍵盤焦點及色彩對比的
  回歸測試。

### 變更

- 依照資料真正能證明的內容重新命名地圖：它顯示的是 seed 支持者的個人檔案所在地，並非
  算力區域或資料中心。城市與國家名稱現在於兩種支援語言中皆有本地化。
- 地圖與影響力計數器現在共用同一份即時快照；重新驗證時會保留最後一次成功資料，並在任務
  事件發生後同步更新。
- 在窄螢幕上把任務募資摘要與主要操作移到長篇輔助內容之前，桌面則保留唯一的 sticky 操作區。

### 修正

- 補回遺失的世界陸地、行動版可辨識的標記、選取狀態、標籤引導線，以及明確的載入、空資料、
  失敗與重試狀態。
- 避免切換路由後顯示前一個任務的白話說明，並加入可見的載入、失敗與重試回饋。
- 後續出現預算或資訊事件時仍會保留目前執行階段，且不再把不同重試執行的事件合併為同一次 run。
- 使用者切換來源、網址或任務後會捨棄過期的儲存庫分析與路由回應；恢復原生 radio 鍵盤操作；
  並修正焦點樣式、導覽列溢出、主 CTA 對比及介面中的小尺寸紫色文字對比。

## v0.4.1 — 2026-08-07

### 變更

- 本機示範貢獻者現在以 100,000 點運算額度開始。
- 每張儲存庫產品卡片現在整張皆可連到任務詳情，同時保留認捐、重試與外部儲存庫控制項為各自獨立的操作。
- Seed 市集現在讓十個唯一儲存庫中的五個維持可認捐。`globlin` 保留預算耗盡的執行證據，並以重新界定範圍的 6,000 點救援募資重新開放，尚缺 2,000 點。

## v0.4.0 — 2026-08-06

### 新增

- **以影響力為先的首頁。** 首頁路由不再是儲存庫貨架。它先以一段主視覺開場
  （「Revive Open Source with AI Compute」），接著呈現四項影響力數字 —— 捐出的 token →
  已完成的功能 → 已修掉的 bug → 已復活的專案 —— 並附上 14 天的 sparkline。紫色為主色、
  blue→teal 漸層、玻璃質感表面、aurora 光暈、滾動顯現。既有四個維度
  （募資／開發／驗證／採用）仍是產品唯一的**分類色階**。初版曾宣稱品牌色只是疊加使用，
  但 `--color-grad-a` 當時與 `--color-dev` 完全相同，token meter 也用品牌漸層表示另有專屬
  色彩的募資進度。現在品牌紫已明顯遠離 adoption 的淡紫，meter 改為琥珀色；漸層的安全性
  來自它不承載分類意義，而不是不存在的色彩距離，因為 blue→green 漸層必然會穿過 development
  與 verification 的色域。
- **社群層。** 一張贊助者世界地圖；一條由真實引擎事件驅動的即時代理活動條；成就徽章；由真實
  認捐觸發的 Token Rain 落下效果；每個任務各自的留言牆；以及三個類別的每月獎項 —— 最有幫助
  的專案、最有效率的代理、社群票選 —— 刻意不做成贊助排行榜。每個類別只能投一票，這是由
  `UNIQUE (contributor_id, category)` 約束強制執行的，而不是靠一道並行送出就能搶先繞過的
  應用層檢查。
- **儲存庫以產品形式呈現。** `PlainLanguage` 以一個 emoji 開頭，接著一句非工程師也讀得懂的
  說明，再加三個具體使用情境；技術性描述被降級成一個可展開的揭露區塊。首頁上的
  `ProductCard` 取代 `MissionCard`：名稱、建立者、它能做什麼、它還缺什麼、捐助。
- **影響力卡片** —— 「如果這個專案消失了」—— 每一條後果都逐行標示是量測所得還是編輯撰寫。
- **五枚成就徽章**：First Bug Hero、Documentation Angel、AI Architect、OSS Guardian、
  Night Owl Sponsor。每一枚都由已記錄的訊號頒發 —— release tag 分區、已發布 diff 內的
  文件路徑、解析後的 runner 模式、不同專案數，以及以 UTC 計算的認捐小時（描述中會明說
  UTC，因為伺服器不知道贊助者的時區）。測試證明每一枚都確實可取得，也會在條件不存在時
  拒絕頒發；永遠會觸發的徽章沒有意義。`ai_architect` 在 demo 模式下刻意無法取得，因為它
  聲稱真實代理做了其實由腳本 runner 完成的工作。
- `server/taxonomy.ts` 集中定義什麼算功能、什麼算 bug 修正，讓「已修掉的 bug」計數器與
  First Bug Hero 徽章不會對 bug 修正的定義產生分歧。
- **時光機**：之前／現在／推估，其中推估那一格在視覺上與結構上都與另外兩格觀察所得的畫面
  明確不同。

### 變更

- `Project.figuresMode` 會記錄一個專案的熱門度數字是 OBSERVED 還是 AUTHORED。Seed 會為虛構
  的套件寫入看起來合理的數字；在只有市集會渲染它們、而且是在一個區塊層級的 demo 標籤底下時，
  這還可以接受，但產品卡片與影響力卡片會把同一批數字單獨渲染，那個標籤在那裡已經不見了。
  Provenance 現在跟著資料列一起走，於是消費端是自己推導出標籤，而不是靠記得要加上去。
- `ImpactCard.dataMode` 與 `generator` 是分開的，因為模型可以針對一個編造出來的數字寫出誠實
  的句子，而一段內建的 demo 字串也可以引用一個真實的數字。這是兩個彼此獨立的問題。
- `TimeMachineFrame.openIssues` 與 `passingTests` 改為**選用**。它們原本是必填，於是一個從未
  執行過的專案被迫送出 `passingTests: 0` —— 而「0 項測試通過」出現在一個寫著「測試通過」的
  標籤底下，等於聲明了一項根本沒人做過的量測。現在缺少代表未經量測；零代表量測結果就是零，
  而對一個測試套件來說，那是另一個真實且不同的事實。推估值也不再允許從一個未經量測的基準
  算出來，因為那是從一片空白製造出一個數字。
- `src/lib/format.ts` 中的 `fmtDate` 取代了兩個元件各自私有的語系三元判斷 —— 兩個語系正是在
  那裡開始漂移的。

### 強化

- 主視覺的計數器可能在往上數的過程中卡住並停在那裡，顯示 11,579,355，而真實值是 19,020,000。
  `requestAnimationFrame` 在隱藏的分頁中不會觸發，`setTimeout` 卻會，所以現在改由一個計時器
  負責把每個計數器收在它精確的值上，不論實際跑了幾個 frame。`sr-only` 的數字全程都是正確的，
  所以這是一個只有明眼使用者才會看到的錯誤數字。

### 安全性

- **每次執行的作業系統隔離（SEC-00）。** 沙箱指令現在會在有可用邊界時，於一個可拋棄的
  容器內執行，擁有獨立的 PID、mount 與 network namespace。已量測：七個攻擊向量共 140 次
  重複，沒有洩漏任何秘密、沒有在工作區之外寫入任何東西，也沒有任何封包送達受控 sink；
  同一批 payload 在行程層級退回路徑上，20 次重複中有 20 次洩漏了憑證，並送出 80 個封包。
  這道邊界是靠實際 mount 工作區根目錄探測出來的，不是從組態推論出來的，而
  `describeIsolation()` 在兩種狀態下都會透過 API 與 UI 回報。GKE pod 沒有 Docker daemon，因此叢集內的閘門
  **尚未達成**，共享部署維持關閉真實代理執行。
- **寫入拒絕清單改為大小寫不敏感。** `PACKAGE.JSON` 過去能通過防護，接著在任何大小寫不
  敏感的檔案系統上覆寫 `package.json`；`makefile` 與 `GNUmakefile` 則在每個平台上都能
  遮蔽受保護的 `Makefile`。該清單也補上了各工具鏈實際會讀取的拼法。
- **Fixture 選擇改為白名單。** `createWorkspace` 與 `analyzeFixture` 過去接受任何相對於
  `fixtures/` 的路徑，於是 `../src` 變成一個內含本應用程式自身前端的可執行工作區。兩者
  現在共用同一個閘門。
- **遮蔽移入 logger**，不再是呼叫端必須自己記得的規則；保留的 log 欄位不再能被呼叫端欄位
  偽造；提示詞圍堵現在也涵蓋檔名、維護者回饋、嘗試歷史與任務目標。善意案例的遮蔽 false
  positive 從 3.23% 降到 0.00%，同時憑證啟發式補上了原先缺少的前綴拼法（`db_password`、
  `my_secret`、`service_token`）。
- **模型回應改在接收端設上界**，上限 4 MiB。`max_tokens` 是對模型提出的請求，不是對
  gateway 的限制：一次以 `maxTokens: 8` 發出的呼叫，收到了 8 MiB。

### 修正

- 產品卡現在會在接近 viewport 時真正載入白話說明。重複出現在不同 shelf 的專案會共用同一個
  request，同時最多執行兩個 generator；端點不可用時會退回技術描述並提供重試，不再永久停在
  skeleton。
- 舊版 marketplace payload 缺少 `figuresMode` 證據時，現在會 fail-closed 成作者撰寫的示範
  資料，不會再被呈現為即時數字。
- 讓新前端在混用版本的短暫視窗內相容舊版 bootstrap：缺少隔離證據時會顯示為
  不可用，而不是直接 crash 或推定安全。
- 部署驗證改為從 nonprod overlay 讀取預期執行模式。共享 GKE 沒有可供
  SEC-00 量測容器邊界使用的 Docker daemon，因此會刻意維持 `demo`。
- 將單副本、`emptyDir` 的 Deployment 從 rolling surge 改為 `Recreate`。nonprod 現在會在
  rollout 時短暫中斷，不再同時出現兩個可各自寫入的 SQLite 資料庫，也不會讓新 SPA 在更新
  視窗內連到舊 API。
- GitLab release job 現在會直接取得 build provenance artifact；`needs` artifact 不會透過
  live verification job 傳遞到下一層。

- 一次重送的 pledge 把贊助者扣了兩次款。`POST /missions/:id/pledge` 現在支援選用的
  `Idempotency-Key` header，並與其效果寫在同一個 transaction 內。沒有帶 header 的請求
  仍未受到保護，因為伺服器無法分辨「不小心重送」和「刻意再認捐一次」。
- 並行的 `POST /demo/reset` 會重複載入 seed，並讓某個任務與其專案脫勾，導致
  `GET /marketplace` 回傳 HTTP 500。Reset 現在是 single-flight。
- 一個會拋錯的 SSE 訂閱者會把錯誤傳播到發布端，可能讓任務停在 `executing` 卻沒有執行者。
  每個訂閱者現在各自隔離執行，而全域頻道只承載任務摘要，不再把每次執行擷取到的指令輸出
  廣播給所有連線中的瀏覽器。
- 取消訊號從未抵達測試子行程：被取消的測試套件會一路跑完並回報成功。訊號現在會抵達沙箱，
  沙箱會在自己的 process group 內啟動子行程，而引擎會在解讀結果之前先檢查 abort ——
  否則被取消的執行會被回報成 `blocked`，把人類的決定歸咎於代理。
- 每次執行都會遺留自己的工作區：每次執行一份完整儲存庫副本，無限期留在一個狀態目錄沒有
  大小上限的 pod 裡。
- 崩潰復原沒有把被殺掉的執行已經耗用的運算計入帳本，導致任務計數器與帳本互相矛盾。
- 被殺掉的驗證子行程所卡住的任務完全無法重新執行，導致其保留的點數被困住，即使狀態機
  其實允許重新執行。
- 被截斷的沙箱輸出會回報 `truncated: false` 且沒有任何標記，而被取消或被截斷的執行可能
  回報成功。讀不到的證據現在一律以非零（失敗）計：引擎無法驗證一份它讀不到的綠燈測試
  套件。
- 代理自己的 `run_tests` 會重新推導驗證計畫，於是代理看到的判定，來自一條與引擎用來給它
  評分的指令不同的指令。
- 有三個可觸達的 API 錯誤碼在兩個語系都沒有翻譯 key，另有四條繁中字串在 CJK 文字中使用了
  ASCII 標點。

### 文件

- 為每份索引文件新增完整的繁體中文對應版本，並
  讓兩份 README 索引都明確採用雙語。
- 恢復穩定的 G01–G46 注意事項目錄；現在會保留每個項目並
  就地修正，而不再為了精簡而移除。
- 新增產品與網站方向文件，涵蓋定位、需要
  收斂的領域、安全的延伸方向、先決條件、資訊架構，以及
  刻意排除的目標。
- 以各有單一負責範圍的文件，取代內容重疊的產品概覽、架構日誌、部署日誌、路線圖、實驗紀錄與代理規則。
- 新增明確的原型、身分、GitHub 匯入、上游交付與沙箱邊界。
- 補齊 `.env.example`，並讓快速入門、建置、執行模式與部署指示與實作一致。
- 從公開文件移除內部部署識別資訊與過時的即時版本聲明。

## v0.3.9 — 2026-08-06

### 新增

- 新增可進入執行準備的雙語驗證實驗規格，涵蓋程式設計、AI agent 品質、
  安全隔離、點數守恆、UI/UX、無障礙、在地化、效能與復原。
- 新增 canonical path、跨 runner 受保護檔案、相對基準 diff、硬性工具
  預算、repo 身分、逾時分類、子行程環境過濾與精確點數分配的回歸測試。

### 安全性

- 真實 Codex／LLM 執行改為 fail closed；本機操作者必須明確設定
  `ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1`。P0 作業系統隔離實驗仍受阻時，
  共享 nonprod 固定使用 demo 模式。
- 凍結引擎掌握的驗證計畫、在花費模型額度前拒絕不可信基準、以擷取的
  基準 commit 計算產物，並在具權威性的最終測試前阻擋受保護或新出現的 ignored 變更；可執行測試返回後再做第二次完整性檢查。
- 正規化工作區路徑、強制讀取／工具預算、把搜尋改成有界的 literal match、
  限制 runner 預讀路徑，並從 Codex 子行程移除無關的服務憑證。
- 以伺服器保存的短效 analysis／draft snapshot 綁定活動與任務變更、以來源身分而非名稱
  綁定 fixture 專案，且不再接受瀏覽器提交的審查者身分。

### 修正

- 比例退款改為每一點整數額度都守恆，並阻止認捐超過剩餘目標。
- 區分整套測試通過與逐條驗收條件驗證，審查產物也會攜帶明確的測試證據來源。
- 全介面移除對上游 PR／發布與已驗證維護者身分的暗示，改成符合本機原型的文案。
- 新增手機導覽、本地化路由錯誤、請求逾時、舊路由回應防護、bootstrap 重試
  回饋、鍵盤友善 dialog 與標籤、減少動態效果，以及符合 WCAG AA 的一般文字對比。

## v0.3.8 — 2026-08-05

### 變更

- 依據測量所得的訓練資料重製 issue 可行性訊號，並讓每個分數都附帶校準中繼資料。
- 重新命名 UI 分級，使其描述觀察到的傾向，而不是呈現缺乏依據的 0–100 智慧分數。
- 將有計分的訊號與不計分的觀察分開，並讓不確定性永久可見。

### 驗證

- 以保留集儲存庫進行的評估**並未**顯示新排序更加準確。這項負面結果是發布紀錄的一部分，也是目前標示為「heuristic」的依據。
- 修正評估 CLI 的逐訊號核算，並加入 AUC、基準與分級區隔輸出。

## v0.3.7 — 2026-08-05

### 變更

- 在 GitHub 分析期間保留未知的檔案系統與熱門度測量值，而不是製造零值。
- 為 GitHub 的 `NOASSERTION` 授權結果加入人類可讀標籤，但不變更儲存值。

### 驗證

- 對 90 個公開儲存庫執行分析流程，沒有請求失敗；只有在真正測量到 npm 熱門度時才會顯示。

## v0.3.6 — 2026-08-05

### 新增

- 新增 Jest、Vitest 與 Mocha 的擷取輸出 fixture、Node spec／TAP parser 測試，以及 pytest 與 Go test 輸出的初步解析支援。
- 新增明確的 `test_output_unreadable` 引擎結果，不再將未知輸出視為零項測試。
- 新增以儲存庫分組的可行性評估語料庫，以及訓練／測試分割。

### 變更

- 評估顯示相較於基準比率只有有限的增益後，將可行性分數重新定位為較弱、經校準的 heuristic。

## v0.3.5 — 2026-08-05

### 變更

- 將 CI 執行器選擇改為不使用標籤，並明確宣告 Docker-in-Docker 服務。
- 透過 Workload Identity Federation 啟用不使用金鑰的 Artifact Registry 驗證。
- 重複使用映像前，先比較與映像相關的來源樹身分，以強制映像標籤不可變。

## v0.3.4 — 2026-08-05

### 修正

- 讓 `make build` 拒絕與映像相關且尚未 commit 的變更，使來源標籤能描述實際建置的位元組。
- 新增 `make build-dirty`，供本機迭代使用，並刻意標示為不可部署的身分。

## v0.3.3 — 2026-08-05

### 安全性

- 以 realpath 為基礎的包含範圍檢查取代工作區字串前綴檢查，並讓儲存庫 walker 略過 symlink。
- 移除可能為非 fixture 專案執行內建 `tempo` fixture 的 fallback。

## v0.3.2 — 2026-08-05

### 新增

- 新增 GitHub 到 GitLab 的鏡像同步，以及驗證、建置、部署驗證與發布 pipeline。
- 新增版本、commit 與來源樹的執行期建置身分指標。
- 新增 ArgoCD Application 範本與 rollout 後的身分檢查。

### 安全性

- 擴大 LLM 工具寫入拒絕清單，納入 CI include 目錄與定義驗證命令的檔案。

## v0.3.1 — 2026-08-05

### 變更

- 將儲存庫測量值改為選填，並停止把未觀察到的計數、熱門度、授權與健康度數值當成事實呈現。
- 在可用時加入真正且唯讀的 GitHub README、workflow 與 npm 下載量查詢。
- 以會依輸入變動、並公開訊號的 heuristic 取代固定可行性數值。
- 新增棄權指標，並將基礎設施阻擋與代理刻意棄權分開。

## v0.3.0 — 2026-08-04

### 新增

- 以有界的七工具 LLM 迴圈取代固定的規劃／寫碼呼叫。
- 新增工具呼叫與讀取預算、送出閘門、明確棄權，以及跨嘗試、由引擎掌管的記憶。
- 新增建議性 diff 判斷器，誠實標示為 `llm` 或 `static`。

### 修正

- 拒絕未知活動模式與格式錯誤的驗收條件 payload。
- 依觀察所得的 issue 與環境事實推導產物標籤，而不是使用 fixture 常數。
- 保留 `stalled` 以表示刻意交回人工，而不是把每個非成功結果都回報成 `failed`。

## v0.2.0 — 2026-08-04

### 新增

- 新增環境規劃、命令允許清單、工作目錄包含範圍、移除密鑰的子行程環境、逾時與輸出限制。
- 新增相依套件供應，以及由觀察到的儲存庫檔案推導測試命令。
- 新增證據框選、密鑰形狀遮蔽、注入訊號、決定性可審查檢查，以及供有界 LLM 工具使用的硬性寫入拒絕清單。
- 新增 `slugpress` 與 `hostile` fixture，分別涵蓋相依套件與惡意路徑。

### 說明

- 此版本引入的網路控制，是盡力而為的 proxy 與套件管理器設定，而非硬性出口隔離。

## v0.1.2 — 2026-08-04

### 修正

- 讓示範重設在取代狀態前取消執行中工作並等待其結束，且強化非同步清理路徑。
- 修正預載歷史，使模擬事件無法顯示成已經引擎驗證。
- 當要求的後續工作無法執行時，仍讓審查保持可操作。
- 將未使用的運算退款存入貢獻者錢包。
- 修正發布、驗收證據與取消訊息，使其描述已實作的行為。
- 新增 LLM 中止傳遞與請求逾時。

## v0.1.1 — 2026-08-04

### 新增

- 新增並實際執行非正式環境容器與 Kubernetes 部署路徑。
- 新增可寫入狀態 fallback、非 root volume 所有權、健康檢查、ingress、指標與儀表板整合。

### 修正

- 正規化帶引號的環境值。
- 將正式環境伺服器打包，而非於執行期轉譯 TypeScript。
- 同時支援 spec 與 TAP 格式的 Node test 輸出。
- 補上先前無作用的示範路由，並完成英文／繁體中文 UI 涵蓋。

## v0.1.0 — 2026-08-04

### 新增

- 交付從市集到發布的初始原型：認捐、fixture 執行、即時事件、引擎驗證、本機審查產物、核准、發布狀態、成就與貢獻者收據。
- 新增明確的任務及執行狀態機、運算核算、以 Git 建立基準的工作區、真正的 fixture 測試與 diff，以及人工決定步驟。
- 新增 React/Vite UI、Express/SQLite 伺服器、demo/LLM/Codex 執行器介面、結構化日誌、Prometheus 指標、選用的 Langfuse tracing，以及英文／繁體中文內容。

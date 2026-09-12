# 功能真實性矩陣


> **雲端品質驗證流程：** 六階段排程、實測證據、模型來源與能力範圍見 [Agent 實驗室](ASSURANCE.zh-TW.md)。部署證明另行記錄。


> **2026-09-12 LangGraph / Langfuse 更新：** 本機 agents 已使用持久化階段流程與 metadata-only 監控；續跑、防重播、操作指令及限制請見 [Agent 操作手冊](AGENT-OPERATIONS.zh-TW.md)。既有 Demo 鎖與網站版本維持獨立。

> **Self-update lane (2026-09-12):** 本機前端自我更新流程新增真實模型候選程式、容器驗證及選用的靜態版本套用。預設關閉並鎖定 Demo，不更新後端或修復任意產品功能。 [Runbook](SELF-UPDATE.zh-TW.md).

> **Local resilience update (2026-09-12):** 本機穩定度 CLI 新增對真實模組的受控故障實驗，可選真實模型假設／解讀；不啟用任務 runner 或自動修復，須查看報告來源。 [Runbook](CHAOS-AGENTS.zh-TW.md).

> **2026-09-12 原始碼擴充：** `/github` 新增已授權的公開 repo 原始碼快照、投入示範額度後建立 draft PR、一次 bounded Responses 改碼、無網路 Docker 測試，以及同 head 必要 CI 通過後轉正式 PR。此為獨立工作區流程；既有 metadata／fixture 路由不變。尚未部署或驗證真實上游寫入。能力、限制與測試見 [GitHub 工作區](GITHUB-WORKSPACES.zh-TW.md)。下文舊版敘述不適用於這個明確的新入口。


[English canonical](FEATURE-REALITY.md)

> **整合原始碼，2026-09-12：** main 以 `0.7.17` 合併 Phase 3 A／B／C（`08bead6`）與 Cloudflare delivery 基準（`7d9fbba`）。本機建立、募資、帳務、留言、SSE 與本機決策共用單一 mission authority。兩個內附 fixture 使用腳本修改與 engine 實測 tests/diff；seed review 仍標示 demo，匯入 repository 不執行。保留既有雲端 egress 與 Responses 權限：container 的產品建議使用已標示 fallback，GitHub 匯入需要本機 server 網路。未宣稱 live 產品建議或視覺核准；先前 Responses probe 與 serving revision 以 [checkpoint](cicd/CHECKPOINTS.zh-TW.md) 為準，合併 source 不等於新部署。詳見[整合證據](PHASE3-INTEGRATION.zh-TW.md)；下方歷史清單不完整代表本次重建。

本文件只回答一個問題：**哪些功能真的串接 LLM 或外部系統，哪些是 demo？**
這是產品文案、QA 與 coding agent 判斷真實性標籤的 canonical 清單。架構與
安全細節仍以各自文件為準。

## 狀態用語

| 標籤 | 意義 |
| --- | --- |
| **真實 LLM** | 請求真的送到已設定的 OpenAI-compatible model，回應也影響結果；證據必須包含 generator／model provenance。 |
| **真實非 LLM** | 程式、儲存、測試、網路 API 或基礎設施真的執行，但結果不是模型產生。 |
| **混合 demo** | 真實機制作用在腳本、fixture、seed 或其他非正式輸入上。 |
| **種子 demo** | 人工撰寫的 seed 資料或模擬歷史，不是外部觀測事實。 |
| **純 UI** | 由既有狀態驅動的畫面或動畫，本身沒有另一套後端智慧。 |
| **未實作** | 產品可能說明此邊界，但目前不會執行該外部動作。 |

「真實」不等於可上正式環境。本原型沒有使用者驗證、正式持久資料庫，也
沒有可安全執行任意程式碼的部署邊界。

## nonprod 實際狀態快照

最近一次完整驗證為 2026-08-11 的 `v0.5.3`、commit `1c28a5f`：

> 這是歷史 serving 快照，不代表最新 source。Source `v0.5.5` commit `99f2205`
> 曾在 image 發布前被 I18N-01 擋下；目前 source 已修正該 gate，rollout 仍須以
> 不可變 image、Argo 與 serving-build 證據判斷。

- `EXECUTION_MODE=demo`；設定模式與解析後模式都是 demo。
- LLM 憑證驗證端點已透過設定的 OpenAI-compatible gateway 與 campaign
  model 成功。驗證後，專案說明 payload 回報
  `plainGenerator: "openai"` 與 `impactGenerator: "openai"`。
- Langfuse 已設定。這只證明設定存在，不代表每一個請求都有送達 trace；
  需要時應用 request／trace ID 逐筆對照。
- 環境回報 process isolation，沒有部署 per-run Docker／OS boundary，
  所以真實任務 runner 維持停用。
- `/api/impact` 與個人／市集 payload 都回報 `dataMode: "demo"`。

模型設定與任務執行互相獨立；憑證可用不會讓任務執行自動離開 demo mode。

Campaign-D 版型與 motion-led 首頁已存在於 `v0.5.5` source candidate。它們是以
既有 API／seed state 呈現的**純 UI**；在不可變 image、Argo reconcile 與
serving-build identity 證明前，不可寫成已上線。

## Repo 探索與募資案產生

| 功能 | 現行實作 | 分類 | 邊界／證據 |
| --- | --- | --- | --- |
| 內建 fixture 分析 | 本機讀取已提交的 fixture、issue 與 repo facts。 | **混合 demo** | 真實 parser 處理特意內建的 demo repo；沒有 LLM。 |
| 公開 GitHub 匯入 | 以唯讀 GitHub API 取得公開 metadata、issues、README／workflows，並可取得 npm downloads。 | **真實非 LLM** | 不 clone、不檢查完整 tree、不登入、不執行。固定以 `PrimeIntellect-ai/prime-agent` 驗證。 |
| Issue 範圍與驗收條件助理 | 可選擇把由 server capability 綁定的公開 issue 摘要送至已設定模型，再驗證受限雙語 JSON。 | **真實 LLM**或有標示 fallback | 顯示 prompt／版本／variant／generator；無法改變選擇或宣稱 repo 已執行。 |
| 募資文案真實模式 | 把結構化 repo／issue context 送至設定的 chat-completions endpoint。 | **真實 LLM** | 回應包含 `generator: "openai"` 與 model、request、latency、token 證據。 |
| 募資文案 demo 模式 | 對 fixture 或 GitHub metadata 產生確定性、以 issue 為基礎的雙語文案。 | **混合 demo** | 回應是 `generator: "demo"`；GitHub 文案不宣稱知道檔案或可執行。 |
| 募資文案品質檢查 | 可選擇檢查依據、可行動性與雙語一致性，不修改原始 draft。 | **真實 LLM**或有標示 fallback | Server 會重新驗證 draft capability；無法發布或更改算力。 |
| 算力估算 | `server-heuristic-v2` 依已觀測的程式庫範圍、issue 大小、驗收條件、驗證輪數與風險估算；公開區間、信心與分項，並在三筆成功樣本後套用有界歷史校正。模型填寫的總數會被丟棄。 | **根據部分觀測的真實確定性政策** | 這是規劃額度，不是 provider 帳單 token 用量；只有中繼資料的程式庫仍屬低信心。 |
| 專案白話與影響說明 | 驗證成功後使用設定模型，否則回傳人工 fallback 文案。 | **真實 LLM**或**混合 demo** | 檢查 `plainGenerator`、`impactGenerator`，不可從文案流暢度猜。 |
| 專案時間軸 | 從本機 mission、測試與 release 狀態推導。 | **真實非 LLM** | 永遠不是模型產生；底層紀錄仍可能是 seed。 |

## 募集、執行、審查與發布

| 功能 | 現行實作 | 分類 | 邊界／證據 |
| --- | --- | --- | --- |
| 捐出 credits、wallet、ledger、冪等性 | 驗證並寫入本機 SQLite 交易與狀態轉換。 | **真實非 LLM** | credits 是原型單位；沒有付款、區塊鏈或 provider token 移轉。 |
| 募滿自動開始 | fixture 任務達成本機目標後由 engine 啟動。 | **混合 demo** | 狀態機是真的；出資身分與 credits 是本機 demo。 |
| DemoRunner 任務 | 對 fixture 副本套用腳本推理與 patch。 | **混合 demo** | 推理、計畫與修改是人工腳本，不是 LLM 回應。 |
| Engine 驗證 | 真正執行 fixture 測試、擷取輸出、計算 diff、套用確定性 gate 並計帳。 | **真實非 LLM** | 即使 runner 是 demo，對 fixture 副本的 engine 證據仍是真實執行結果。 |
| LlmRunner | 14-turn OpenAI-compatible 工具迴圈，受限於 read/search/write/test/submit/abstain 與 budgets。 | **真實 LLM**，本機可用 | 需明確 `EXECUTION_MODE=llm`，且有量測邊界或可拋棄本機的不安全 opt-in；shared nonprod 未啟用。 |
| CodexRunner | 透過不同於 LlmRunner tools 的 Codex SDK／CLI 路徑執行。 | **真實 LLM**，僅本機 | 現行 production image 沒有實用 CLI 路徑，不可描述成已部署。 |
| Advisory judge | 合格的非 demo mode 才使用 execution model；其他情況做 static diff-shape review。 | **真實 LLM**或**真實非 LLM** | 看 judge provenance；static 不得標成 LLM。Judge 不能讓 run 晉級或淘汰。 |
| 證據解說 | 在審查頁可選擇以模型解釋 engine 持有的測試／diff facts。 | **真實 LLM**或有標示 fallback | 確定性證據仍是主體且不會被修改。 |
| 影子 diff 審查 | 即使任務執行維持 demo，也可用 execution model 審視受限且已遮蔽的 artifact 證據。 | **真實 LLM**，僅影子 | 永遠回傳 `affectedGate: false`；無法核可、阻擋、花費、合併或發布。 |
| 即時代理活動 | 透過 SSE 傳送已儲存及當前 engine／runner events，並附 source／evidence。 | nonprod 為**混合 demo** | transport 與當前 run 是真的；DemoRunner event 內容是腳本。沒有 run 時必須顯示 idle，不得捏造工作。 |
| 變更證據示範決定 | 儲存接受／要求修改的示範決定，以及 proposed branch／diff 證據包。 | **真實非 LLM** | 沒有 maintainer 驗證，也不會寫入 GitHub。「Maintainer」與「token 提供者」導覽只是 UI 視角，不是已驗證角色。 |
| 驗證檔案包 | 保存基準與每輪修改後測試、命令、exit code、通過／失敗數、確定性品質關卡、驗收證據、來源及預估／實際運算差異。 | **即時 run 為引擎驗證；預載資料為編寫且明確標示** | 實驗越多代表證據越多，不是正確性保證；整套綠燈不能證明每項驗收條件。 |
| 停止執行 | 內部 reset／shutdown 路徑可以中止並結算 run；公開停止 route 回傳 `403 auth_required`。 | **真實非 LLM**，未開放使用者操作 | 未來正式服務應授權任務 Maintainer 或平台操作員；目前沒有已驗證角色或完整 RBAC。 |
| 「發布」操作 | 更新本機資料庫狀態與 receipt。 | **混合 demo** | 不 merge、不標記 upstream tag、不發布 package、不建立 GitHub release。 |
| 引導式 demo 操作流程 | 導頁前先實際執行 deterministic reset，再隨使用者完成流程指出下一個可見產品控制項。 | **混合 demo** | 導覽不會替使用者點擊捐助、審查或其他會改變狀態的控制項；repo、身分、credits 與 DemoRunner 智慧仍是 demo。 |

## 市集、社群、個人頁與視覺效果

| 功能 | 現行實作 | 分類 | 邊界／證據 |
| --- | --- | --- | --- |
| 市集／專案卡 | 讀取本機 API／資料庫；seed 人氣、adoption 與歷史有標示。 | **種子 demo** | 公開 repo 連結是真網址，多數數字不是 GitHub 即時觀測。 |
| 全球影響統計 | 從本機 ledger 與 release state 計算總數。 | **混合 demo** | `dataMode: "demo"`；token 數使用原型 credits 換算，不是 provider metering。 |
| 貢獻者世界地圖 | 依本機 pledged credits 計算光圈大小；座標與 seed personas 為人工資料。 | **混合 demo** | 對 demo 身分／位置做真實聚合與繪製。 |
| 光圈、流星、token rain、捐助慶祝 | 由專案與捐助狀態驅動的 CSS／React 動畫。 | **純 UI** | 活動增加可帶來更多動畫，但不是 agent 或 LLM 證據。 |
| 社群投票 | 以目前未驗證 demo 身分將票寫入本機 SQLite。 | **混合 demo** | 不是經驗證 GitHub user、組織投票或治理行為。 |
| 留言牆 | 本機儲存留言，由 server 指派 role 並遮蔽秘密。 | **混合 demo** | 沒有正式身分、moderation service 或 upstream issue comment。 |
| 貢獻者個人頁 | 聚合本機捐助、receipts、runs 與 releases。 | **混合 demo** | payload 是 `dataMode: "demo"`；預設 persona 是 seed。 |
| 徽章與成就 | 依本機進度確定性計算彩色狀態。 | **混合 demo** | 「真實 AI agent」條件不能靠 DemoRunner activity 取得。 |
| Open-source 連結 | 連到真正的 GitHub repo URL。 | **真實非 LLM** | 真連結不代表旁邊的 seed stats 也是真實即時資料。 |
| 重設 demo data | 取消本機 active runs、清除 SQLite demo state 並重新 seed。 | **真實非 LLM** | 這是會改資料的真實操作，不是只重播動畫。 |

## 平台與外部效果

| 功能 | 現行實作 | 分類 | 邊界／證據 |
| --- | --- | --- | --- |
| 結構化 log、Prometheus metrics、SSE | 由正在執行的 server 與 engine 產生。 | **真實非 LLM** | provenance 仍會區分 seeded／demo event 與 engine observation。 |
| Langfuse tracing、scores、datasets 與 experiments | v5 tracing 匯出有版本的受限摘要；client 可記錄 feedback score，並同步／執行五組 source-controlled curated datasets。 | **真實非 LLM 串接** | `npm run eval:llm` 預設只 dry-run；`--sync`／`--live` 需要憑證與操作人明確意圖。Export metrics 不代表語意品質。 |
| GitHub → GitLab → image → Argo CD | 鏡像 commits、跑 CI、建不可變 image 並同步 nonprod。 | **真實非 LLM 串接** | 每一段有不同證據；詳見 `GITHUB-OPERATIONS.zh-TW.md`。 |
| GitHub 登入與 upstream 寫入 | 沒有 OAuth／app installation、branch push、PR、merge、tag、issue comment 或 release publication。 | **未實作** | UI 的「PR」與「release」只是在本機的 artifacts。 |
| 付款／provider 算力結算 | 沒有 billing、wallet custody、provider token meter 或算力市集 settlement。 | **未實作** | credits 與 token 換算只是原型帳務單位。 |
| 執行任意匯入 repo | 匯入的 repo 永遠不會被 clone 或執行。 | **未實作** | 只有內建 fixture 通過 executable-workspace gate。 |
| Phase 3 queue／worker 基礎 | 原始碼已有 transactional SQLite run request、lease／heartbeat／retry／cancel／recovery、獨立 worker entrypoint、queue metrics／Langfuse trace，以及 GitHub commit capture。 | **真實非 LLM，尚未部署** | Nonprod 仍在 `emptyDir` 上使用 `RUN_DISPATCH_MODE=inline`；沒有 one-job-per-run isolation、簽章 artifact store 或已部署 SEC-00 證據，因此匯入 repo 仍禁止執行。 |

## 不靠猜測的驗證方式

請使用可拋棄本機資料庫或已授權 nonprod endpoint。不可印出環境變數或憑證。

```bash
curl --fail "$COMMONCOMMIT_URL/api/bootstrap"

# 新鮮的憑證／模型檢查；只回傳非秘密 model 與 latency 證據
curl --fail "$COMMONCOMMIT_URL/api/llm/validate"

# 真實 GitHub 唯讀整合探針
curl --fail -X POST "$COMMONCOMMIT_URL/api/analyze" \
  -H 'content-type: application/json' \
  --data '{"source":"github","url":"https://github.com/PrimeIntellect-ai/prime-agent"}'

# 聚合產品資料的 demo provenance
curl --fail "$COMMONCOMMIT_URL/api/impact"

# 實際 serving build，與 CI 想部署什麼分開判斷
curl --fail "$COMMONCOMMIT_URL/metrics" | grep '^commoncommit_build_info'
```

對產生內容，要檢查 response 的 `generator`、model evidence 與 data-mode。
對任務執行，要檢查 resolved execution mode 與 event sources。絕不可用動畫、
文字看似具體或憑證驗證成功，代替執行模式的證據。

## 維護規則

當功能新增／移除外部效果、改變 generator fallback、改變部署模式或 provenance
時，必須在同一 commit 更新本文件與 `FEATURE-REALITY.md`。實作架構寫在其
canonical 文件後由此連結，不要重複大段設計說明。

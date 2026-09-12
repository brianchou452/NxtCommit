# CommonCommit — 踩坑紀錄 (GOTCHAS)

[English](GOTCHAS.md)

> 每次發現新坑請補在最下方,包含:症狀、根因、修法、版本。
> AI 調整後應確認此檔是否需要新增條目。
>
> 下方穩定 G 編號的事故紀錄保留「當時」看到的症狀、推論與修法；其中有些版本界線、因果解釋或修復完整度後來被新證據推翻。以下「現況勘誤」以 `main` 在本次稽核時的程式碼為準，閱讀歷史紀錄時應優先套用這些限定。

嚴重度:🔴 資料錯誤 / 信任破口 / 服務死亡  🟠 行為錯誤、浪費、死路  🟡 效率或體驗  🔵 背景知識

## 現況勘誤（逐條對照）

| ID | 現況 | 目前實作與必要限定 |
| --- | --- | --- |
| G01 | 修法仍有效，舊版界線過窄 | 根與 fixture 腳本都使用裸 `node --test`。`node --test test/` 在目前支援的 Node 22.23 也會 `MODULE_NOT_FOUND`，不是 Node 24 專屬；「Node 20 → 24 才改語意」未由目前證據支持。 |
| G02 | 控制仍在，機制已演進 | 子行程改由 `sandbox.ts` 建立最小白名單環境，不是只刪除幾個 `NODE_TEST_*` 變數；驗證路徑仍可能設定自己的 `NODE_OPTIONS`。通則仍是「明列要傳什麼，不繼承整個 server 環境」。 |
| G03 | 示範契約仍在 | `DemoRunner` 的第一次補丁真的會被測試拒絕，第二次才通過；腳本化的是敘述與補丁選擇，live fixture 的寫入、diff 與測試結果仍由引擎觀測。 |
| G04 | 最低額度已涵蓋真實與 demo 文案，仍僅限示範經濟 | 所有 draft（含真實 LLM 回傳值）都會正規化至至少 2400 credits，修掉模型回傳 200、流程募滿後必定耗盡的回歸；fixture 公式仍為 `max(2400, LOC*6 + issueBody/3)`，seed 約 85% 募資。這不是任意 LLM 任務的通用估價公式。 |
| G05 | 控制仍在，需分兩層理解 | `.env` loader 對它解析的所有鍵去一層引號；平台注入後的第二次正規化只涵蓋 API/model/mode/Langfuse/GitHub/port/demo speed。平台直接注入的 `VAR_DIR` 與 build identity 不走第二層。 |
| G06 | 修法仍在，且 source 仍引用本 ID | parser 與測試同時支援 Node spec/TAP。Node 版本與 TTY/輸出環境都可能影響 reporter，舊文的「24 必為 spec、22 必為 TAP」應視為當時觀察，不是普遍契約。 |
| G07 | 現行控制吻合 | server 在 build time 由 esbuild 產出，production 只執行 `dist-server/index.js`；舊映像大小與模擬環境數字屬歷史量測。 |
| G08 | 核心完整性控制已跨 runner 落地 | 所有相對路徑先正規化再套政策；基準偵測涵蓋目錄型測試及根目錄的 JavaScript、Python、Go、Ruby 命名。`LlmRunner` 仍在 tool 邊界拒絕寫入，而引擎會在自有、具權威性的最終測試套件前，比對完整 baseline-commit diff、ignored files 與 Git 控制資料；因此 `CodexRunner` 的直接寫入、commit／amend 也無法藏起受保護變更。Runner 可能先前已透過自己的工具或 SDK 路徑執行修改後程式碼。最終 test count 亦不得低於基準。這是完整性控制，不是 OS 隔離。 |
| G09 | gate 仍在，但不是 coverage | 現行 gate 要求非空 diff、可讀且非零的測試證據、test count 不下降；行為變更另要求新增測試檔名或 suite 成長。它沒有量 code coverage，故「coverage growth」只能稱測試成長 proxy。 |
| G10 | 僅保留為日期化實驗 | 預設 execution model 仍是 `gpt-5.5`，但某次 `gpt-4o` 失敗、某 gateway 對 `gpt-5.3-codex` 回 404 都是當時、特定端點的觀察，不是模型家族的永久能力排名。 |
| G11 | 相容分支仍在，需時間限定 | client 仍依 `gpt-5*`／部分 `o*` 名稱切換 `max_completion_tokens` 並省略 temperature。這是目前端點相容政策，不能外推成所有 OpenAI-compatible endpoint 的永久契約。 |
| G12 | 修法仍在 | `seedRun()` 仍為 seeded lifecycle 補 run/event/artifact，避免狀態有入口卻沒有下游資料。 |
| G13 | 修法仍在 | engine、認捐 auto-start 與 Mission CTA 都檢查 `workspace.kind === "fixture"`；非 fixture 顯示說明而不是可失敗的執行按鈕。 |
| G14 | 修法仍在 | API 以穩定 code 供前端 i18n；未知錯誤顯示翻譯過的通用訊息，原始 prose 只留日誌。 |
| G15 | 控制仍為部署依賴 | 寫入路徑依序為 `VAR_DIR → ROOT/var → tmp`；部署仍以 UID/GID/fsGroup 1000 與 writable volumes 支撐 `/app/var`。舊文的 20/20 是一次性驗證，不是持續保證。 |
| G16 | 修法仍在 | DemoRunner 自撰事件與 summary 使用雙語物件；路徑、測試名等識別符不翻譯。 |
| G17 | **文件原本說得太完整** | reset endpoint 會 abort 並最多等 8 秒，但 timeout 後即使 active run 尚未清空也只警告、接著 reseed；獨立 `npm run seed` 更完全繞過 settlement。MissionGone 與 catch 讓 late writer 較不易殺死行程，但「一定先 settle 才刪」尚未被全路徑保證。 |
| G18 | 修法仍在，可併讀 G17 | `finishRun()` 清理有自己的 catch，fire-and-forget 啟動點有終端 catch，process 也有最後守門；但守門不應取代正確的生命週期排序。 |
| G19 | provenance 已改為顯式資料 | seeded events 全部是 `source: "demo"`，並有掃描所有 seed event、阻止冒充 engine 的回歸測試。審查產物另帶明確的 `testEvidenceSource`，UI 依證據來源而非畫面或 artifact mode 貼標：只有引擎實際觀測的 suite 結果會標成引擎觀測，seed 證據維持示範資料。 |
| G20 | 修法仍在 | feedback follow-up 若啟動失敗，狀態會補償回 `needs_review` 並留下說明事件。 |
| G21 | live 與 seed receipt 均精確守恆 | live release 以有穩定 key tie-break 的 largest-remainder 法分配整數點數，逐一增加 backer wallet、寫入具 contributor 的退款 ledger，並斷言總和恰等於未使用 reserve；Receipt 的消耗分攤共用同一 allocator，退款則取自這些 ledger。已發布的 seed 任務也會建立相符的 reserve、consume 與逐貢獻者退款 ledger 並遵守同一守恆 invariant；seed wallet 是重建時直接寫入的 authored snapshot，因此刻意不在 reseed 時重複加值。 |
| G22 | 修法仍在 | release copy 只宣稱 local mission release/refund，明說 tag、changelog、release notes 與 repository push 不由 CommonCommit 執行。 |
| G23 | aggregate suite 與逐條驗證已分型 | live criteria 使用獨立的 `suite_passed` status 與 `suite:x/y` provenance，不再寫成 `verified`；seed 保留 `seeded-demo` provenance，UI 也解釋這只代表整套測試通過。系統仍沒有 test-to-criterion mapping，因此不會把任何單一條件描述成已被獨立驗證。 |
| G24 | 修法仍在；另有 ID 衝突 | API 能區分 active cancel 與 orphan settlement，UI 依 server 回應顯示結果。`Makefile` 另以「G24」指向外部 kubectl context-drift 事故，與本條撞號，應像其他外部參照一樣加來源限定。 |
| G25 | timeout、取消與 body stall 均已覆蓋 | `chatComplete` 合併 caller signal 與預設 180 秒 timeout，並把 `fetch` 及 response body 讀取都放在同一邊界內。catch 同時辨識 Node 的 `TimeoutError`／`AbortError` 並優先檢查 timeout signal，可區分逾時與 caller 取消；回歸測試涵蓋 headers 前停滯、明確取消及 headers 後 body 停滯。 |
| G26 | **能力控制存在，不等於隔離** | command allowlist、cwd、timeout/output cap、env scrubbing 與環境推導都在；但 cwd 不是「唯一可寫」保證，proxy/offline flag 不是 hard egress isolation，行程層級退回路徑下子行程與 server 共用安全邊界，容器模式下不共用（見 G47）。即時事件文案現已明示這項限制，不再聲稱對外連線已停用。 |
| G27 | 歷史事故；舊修法已不在 manifest | 當時以 `86400s` 通過 webhook；目前 VirtualService 沒有 timeout 欄位。若 SSE 再依賴特定 timeout，必須重新驗證當前 mesh default 與 admission policy。 |
| G28 | 修法仍在 | 八個 server achievement definitions 的 name/description 都是雙語。 |
| G29 | 現行協議吻合 | nullable assistant content、完整 `tool_calls`、以及逐一配對的 `tool_call_id` result 都保留在 history。 |
| G30 | 核心修法仍在，能力等級不保證 | model judge 使用 `executionModel`、static 明確標示、所有 judge 結果都 advisory；但若 implementer 是 Codex，使用同一個 env model 並不能證明 reviewer 能力一定 ≥ implementer。 |
| G31 | endpoint 與 startup 都已 fail closed | campaign endpoint 會拒絕 unknown generation mode，mission endpoint 會拒絕 malformed draft；startup 也以 strict enum 解析 `EXECUTION_MODE`，不再用型別斷言。明確指定 `codex`／`llm` 時，必須有已量測到的每次執行 OS 邊界，或設定 `ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1`；兩者皆無才會直接失敗；即使邊界已驗證，`auto` 仍維持 demo，因為找到 credential 不等於取得同意。此旗標只表示操作者承認缺少 OS 隔離，不會提供隔離。 |
| G32 | 狀態已分流，metrics 未完全跟上 | blocked run → stalled，其餘不成功 → failed；但 toolchain unavailable／provisioning failed 的 blocked 分支沒有遞增 `runsBlocked`，對應 reason alert 可能永遠沒有 series。 |
| G33 | PromQL 控制仍在，缺自動規則測試 | 需要偵測「從未發生」的規則已使用 `or vector(0)`；repo 沒有 promtool/同等自動測試，舊文的 live 驗證屬歷史操作證據。 |
| G34 | stage label 仍在，勿推論動機 | loop/verify 已可分開聚合；`stage="verify"` 只證明拒絕發生在 final verification 後且成本較高，不能直接推論代理「作弊」。目前部分 dashboard/alert copy 仍過強。 |
| G35 | unknown 已一路保持缺席 | analysis optional fields 經 imported-project persistence 後仍為 optional，UI 會省略未知事實而不顯示 0。伺服器核發短效 analysis／campaign capability，把任務建立綁到 server-observed repository 與 source issue，client 修改副本無法注入臆測量測。虛構的 seed 熱門度只允許以明確標示的 demo data 存在。 |
| G36 | 常數已移除，舊「19 條規則」已過時 | 現行是明標 `heuristic` 的文字形狀評分，分 scored/unpriced signals 並附 calibration；量測後重寫未在 held-out 證明改善。source comments 仍引用 G36，因此本條必須保留。 |
| G37 | test plan 已凍結，最終 gate 跨 runner | bounded LLM denylist 已涵蓋 `.gitlab/`、其他 CI、verification definitions、lockfiles、Git worktree controls 與相關設定；引擎並在 runner 啟動前凍結一份 environment/test plan，供 baseline 與 final verification 共用。跨 runner 的 preflight 會在引擎自有、具權威性的最終測試套件前檢查完整 baseline-relative diff、ignored-file seals 與 Git execution controls；`CodexRunner` 雖不走 LLM tool denylist，其寫入仍會被此 gate 擋下。但 runner 可能先前已透過自己的工具或 SDK 路徑執行修改後程式碼，因此這不是隔離。 |
| G38 | 已修正已知 walker，仍不等於 OS 隔離 | bounded tool read/write 走共享 realpath containment、listing 跳過 symlink，並有對抗測試；`LlmRunner.openingBrief` 使用同一條 contained、redacted read path，baseline test discovery、repository scan、`DemoRunner.listFiles` 與環境規劃計數也都跳過 symlink。回歸測試保證 linked test directory 不會重複計入證據。已知 walker 缺口已補齊，但真實代理執行仍需要已量測的每次執行 OS 邊界，或明確的 unsafe local opt-in，不能當成不受信任 repo 的安全邊界。 |
| G39 | **dirty guard 仍漏一個 build input** | `make build` 會拒絕 `IMAGE_PATHS` 的 dirty state，dirty escape hatch 也誠實標記；但 `.dockerignore` 影響 COPY context，卻不在 local/CI hash 與 dirty list，可能讓 bytes 改變而 provenance 不變。 |
| G40 | repo 內修法仍在；liveness 是外部歷史 | `.gitlab-ci.yml` 刻意沒有 runner tags，job image/service 明列；runner 是否最近成功 poll 不是本 repo 能從 metadata 證明的事。 |
| G41 | WIF 優先，但「完全無 stored credential」過強 | image job 先走 WIF，仍保留 `GCP_SA_KEY` 與 `GOOGLE_CREDENTIALS` fallback。兄弟專案變數 scope 的事故屬外部歷史；目前 CI 註解「NOTHING stored」需加上 fallback 限定。 |
| G42 | **已關閉** | 兩階段交付後沒有 downstream GitLab job 需要 dotenv report，因此已直接移除。`build.env` 只留在 job 內；auth 提前失敗時不再出現 artifact uploader 雜訊。 |
| G43 | 核心原則仍落地，三憑證敘事需分 scope | deploy 以公開 metrics 驗證 serving result，不再呼叫 ArgoCD sync；release tag 使用 `CI_JOB_TOKEN`。GitHub→GitLab mirror 仍需 `GITLAB_PUSH_TOKEN`，image auth 仍有 key fallback；ArgoCD Application 註解還錯稱 pipeline 會 force-sync。 |
| G44 | **unknown path 已有型別，支援宣稱仍過廣** | Jest/Vitest/Mocha 有真實 output fixtures，Node spec/TAP 有 parser test，unknown/empty 會走 `test_output_unreadable`；pytest/Go 無同等 captured fixtures。一般非 verbose `go test ./...` 可輸出 package-level `ok`，parser 卻數成 0 cases 並走「zero tests」舊式歸因。 |
| G45 | 新收集已排除 `not_planned`，舊 corpus 仍須重建 | evaluator 有 deterministic repo-grouped 70/30，但 default 是 `all`；labeler 現在會先排除所有 `NOT_PLANNED`，避免維護者意圖污染技術可處理性。舊資料與 calibration 不會自動修正。 |
| G46 | 原則與負結果有揭露，尚未成為可重現 gate | 程式註解保留 held-out 負結果、payload 附 calibration；但 evaluator 無 CI gate/uncertainty 計算且預設全量，回傳 high-band `0.811` 與註解 held-out top-band `78.8%` 的來源不清。calibration 應附 corpus/split provenance。 |
| G47 | 修法已落地，白名單降為 defence in depth | `server/engine/isolation.ts` 讓每個指令在可拋棄容器內執行，擁有獨立的 PID、mount、network namespace，server 行程在 `/proc` 裡根本不存在。`runInSandbox` 探測到邊界時走容器，探測不到時誠實退回行程路徑。白名單與洗過的環境都不再是承重結構。namespace 是 kernel 邊界，不是 hypervisor 邊界。 |
| G48 | 探測已改為真的執行該操作 | `probeWorkspaceMount()` 會把 token 寫進真正的工作區根目錄、mount 進容器再讀回比對；失敗一律退回行程路徑，並把原因寫進 status detail。這個情境本身也是 `server/engine/isolation.test.ts` 的回歸測試。 |
| G49 | 「沒量到」已判為失敗 | SEC-00 harness 的回報 helper 移到 body 之前宣告，`uncaughtException` 與 `unhandledRejection` 都仍會送出回報；payload 沒有產出可解析回報或中途死亡，該次重複即判失敗。canary 也改由 exec 環境帶入，否則 `/proc` 與 `ps -E` 根本看不到它。 |
| G50 | 修法仍在 | idempotency helper 明確發出 `BEGIN IMMEDIATE`／`COMMIT`／`ROLLBACK`，因為 `node:sqlite` 的 `DatabaseSync` 沒有 `transaction()`。 |
| G51 | 保護已存在，但是 opt-in | `store.runIdempotent` 在與效果同一個 transaction 內寫入 key，同一個 key 用於不同請求會被拒絕；前端對每個使用者意圖產生一個 key 並在重試之間沿用。沒帶 `Idempotency-Key` 的請求得不到保護，這條限制由它自己的測試斷言。 |
| G52 | 鏡像已設定且缺憑證會 fail closed | Project-scoped token 現已存在；最近完整 rollout 證據為 GitHub run `31409728473` 與 GitLab pipeline `2748045554`。若日後移除，任何 event 都會在 checkout 前失敗，不再 warning/skip。 |
| G53 | 修法仍在 | 描述端點使用 `safeResolveMode()` 回報拒絕原因，不會為正確的 fail-closed 判斷 crash；實際 execute path 仍會拒絕。 |
| G54 | 測試已固定為 deterministic | Landing copy 測試會清除 LLM credential 與 cache；真實模型輸出另測 provenance 與不變式，不再對非確定文字斷言長度。 |
| G55 | CI 與部署證據已分權 | GitHub 只 gate mirror、`test`、`build:image`；Cloud Armor 擋下的 endpoint observation 是資訊性，Argo + live metric 才負責 serving truth。 |
| G56 | 已加入窄 CPU requests 與 trace 證據，但容量仍是外部依賴 | Test pod 合計 300m；build／helper／dind 改為 100m／25m／125m（合計 250m）；pipeline `2748199303` 證明連 300m test pod 都可能因 shared capacity 無法排程。 |
| G57 | 兩階段交付已落地 | 先在 `delivery-candidate` 驗證與建 image，成功後才晉級 Argo 觀察的 `main`；失敗候選不會啟動 rollout。 |
| G58 | source i18n gate 已修正，部署仍須獨立證據 | Pipeline `2749163703` 曾有 4 個 I18N-01 失敗；目前 source 已 21/21，但不能用本機通過取代 image／Argo／serving 證據。 |

---

## G01 — `node --test test/` 在 Node 24 直接 MODULE_NOT_FOUND

| | |
| --- | --- |
| **症狀** | fixture 的 `npm test` 一律失敗:`Error: Cannot find module '.../fixtures/tempo/test'` |
| **根因** | Node 24 的 `--test` 把位置參數當**檔案**解析,不再接受目錄;舊寫法 `node --test test/` 在 Node 20 可用,升版後語意改變 |
| **修法** | 改為裸 `node --test`(自動發現 `**/*.test.mjs`);`package.json` 與根 `package.json` 的 `test:fixture` 同步改掉 |
| **版本** | v0.1.0 建立 fixture 時發現 |

---

## G02 — 引擎自己跑在 `node --test` 底下時,子行程的測試輸出格式會被父行程汙染 🟠

| | |
| --- | --- |
| **症狀** | `npm run test:server` 的 E2E 測試失敗於 `attempt 1 must really fail verification`;但**同樣的流程單獨跑就正常** |
| **根因** | 引擎用 `execFile` 開子行程跑受測程式庫的 `node --test`,而該子行程**繼承了父行程的 `NODE_TEST_*` 與 `NODE_OPTIONS`**。父行程本身就是 `node --test`,於是子行程的 reporter 被切成別的格式,解析器抓不到 pass/fail |
| **修法** | 子行程環境改為明確清洗:刪掉所有 `NODE_TEST*` 與 `NODE_OPTIONS`,並固定 `FORCE_COLOR=0` / `NO_COLOR=1`。後續 v0.2.0 進一步收斂成 `sandbox.ts` 的白名單環境 |
| **版本** | v0.1.0 修復 |
| **教訓** | **通則:任何「跑別人的測試」的系統,都必須把子行程環境視為攻擊面與污染源,明確列出要傳什麼,而不是繼承什麼** |

---

## G03 — 示範執行器的第一次嘗試「太會了」,反而沒有失敗可看 🟡

| | |
| --- | --- |
| **症狀** | 示範流程一次就綠燈通過,少了「失敗 → 診斷 → 修訂 → 通過」這段最有說服力的畫面 |
| **根因** | 最初把 v1 補丁寫成正確解;但產品要展示的是**適應能力**,不是一次成功 |
| **修法** | v1 補丁改成「以空白切分段落」這個**真實會錯**的做法 —— 它剛好踩中 fixture issue #142 裡維護者警告的無空格形式,也順帶破壞既有的 `"45 s"` 案例。引擎真的跑測試、真的失敗 2 項,腳本化的診斷則引用**引擎回傳的真實失敗測試名** |
| **版本** | v0.1.0 |
| **意義** | 這不是造假失敗:補丁真的寫進工作區,測試真的執行、真的失敗。腳本化的只有「文字」,證據全是觀測到的 |

---

## G04 — 運算預算估太小,示範跑到第 2 次嘗試就耗盡 🟠

| | |
| --- | --- |
| **症狀** | 示範任務在 `plan_revision` 之後直接 `budget_exhausted`,永遠看不到第二次驗證通過 |
| **根因** | 募資目標由 `linesOfCode * 3` 估出約 950 點,但兩次完整嘗試 + 驗證需要約 1670 點 |
| **修法** | 估算改為 `linesOfCode * 6 + issueBody/3`,下限 2400 點(約含 30% 餘裕);示範資料的認捐比例調成 85%,讓現場那一筆剛好跨過目標線 |
| **版本** | v0.1.0 修復 |
| **通則** | **預算類的預設值要用「最壞路徑 × 餘裕」反推,不要用平均路徑正推** |

---

## G05 — `docker --env-file` 不會去除引號,容器內憑證直接認證失敗 🔴

| | |
| --- | --- |
| **症狀** | 本機 `make validate-llm` 正常;同一份 `.env` 進到容器卻 `Incorrect API key provided`,Langfuse baseUrl 也變成 `'"https://..."'` |
| **根因** | `secrets.md` 的值帶雙引號。shell 的 `source` 會去引號,**`docker --env-file` 不會** —— 它把整行右側原封不動當值,連引號一起送進行程 |
| **修法** | `server/env.ts` 不再只處理 `.env` 檔:對所有已知鍵一律做 `unquote()` 正規化,**不管值從哪個來源進來**。容器內憑證檢查隨即通過 |
| **版本** | v0.1.1 修復 |
| **教訓** | **通則:設定值的正規化要放在「讀取的地方」,不是「載入的地方」。同一份 `.env` 經過 shell、docker、k8s 三條路徑進來,語意各不相同** |

---

## G06 — 測試輸出解析只認 Node 24 的 spec 格式,線上(Node 22)失敗名稱全部遺失 🟠

| | |
| --- | --- |
| **症狀** | 容器內執行時,UI 只顯示「Tests failed: 2 of 15」,底下該列出的 `✖ 測試名` 全部消失;LLM 拿到的失敗上下文也少了結構化的失敗清單 |
| **根因** | Node 的 `--test` 預設 reporter **在版本之間換過**:本機 Node 24 輸出 spec 格式(`✖ name (Xms)`),映像裡的 Node 22 輸出 TAP(`not ok 1 - name`)。解析器只寫了前者 |
| **修法** | `parseNodeTestOutput` 同時支援兩種格式(兩條 regex 都跑、結果去重);另補 `# pass/# fail` 的 TAP 統計行 |
| **版本** | v0.1.1 修復 |
| **通則** | **凡是解析別人工具的輸出,就要假設格式會隨版本改變。開發機與執行環境的 runtime 版本不同時,這個假設一定會被驗證** |

---

## G07 — 生產環境靠 `tsx` 即時轉譯,esbuild 在模擬環境當掉、映像還胖了 4 倍 🟠

| | |
| --- | --- |
| **症狀** | amd64 映像在 Apple Silicon 上跑(qemu 模擬)啟動即死:`Error: The service was stopped at esbuild/lib/main.js`;映像 2.35 GB |
| **根因** | 兩件事疊加:①`CMD` 是 `tsx server/index.ts`,**生產環境在請求路徑上帶著一個 TypeScript 轉譯器**;②Codex SDK 的 postinstall 會為六個平台各拉一份 CLI 執行檔(296 MB) |
| **修法** | ①新增 `build:server`,用 esbuild 在**建置期**打包成 `dist-server/index.js`,執行時只跑 `node dist-server/index.js`;②Codex CLI 移到 devDependencies,映像只保留 `x86_64-unknown-linux-musl` 那一份 vendor。映像 2.35 GB → **581 MB** |
| **版本** | v0.1.1 修復 |
| **通則** | **生產環境不該在啟動或請求路徑上做編譯。轉譯器留在建置階段 —— 順便也少一個會在陌生 CPU 上當掉的原生依賴** |

---

## G08 — 真實 LLM 靠改寫既有測試「通過」驗證 🔴

| | |
| --- | --- |
| **症狀** | `gpt-4o-2024-11-20` 的執行三次嘗試全失敗;細看發現它每次都去改 `test/parse.test.mjs`(既有測試),而不是新增檔案,某次甚至讓最基本的 `parses seconds` 失敗 |
| **根因** | 提示詞只說「要包含或更新測試」,沒有禁止改動既有測試;引擎的成功條件是「測試全綠」,而**縮小測試集也能讓它全綠** |
| **當時修法** | 雙層:①引擎新增防作弊 —— 測試總數**低於基準**即拒絕,並把「你把 N 項變成 M 項」寫回下一輪的失敗上下文;②提示詞改為硬規則「既有測試一字不得改,新案例放新檔案」。後續又加入 bounded LLM tool 的硬拒絕。但目前 path canonicalization、部分 Python/Go 測試命名與 `CodexRunner` 仍有缺口,詳見頂部現況勘誤。 |
| **版本** | v0.1.2 修復 |
| **教訓** | **通則:驗證條件必須連「怎麼作弊」一起設計。凡是「達到某指標即通過」的關卡,先問「縮小分母算不算通過」** |

---

## G09 — 測試全綠但零變更也算成功 🔴

| | |
| --- | --- |
| **症狀** | 代理什麼都沒改,引擎照樣判定驗證通過、產出一個空的 PR |
| **根因** | 成功條件只看 `fail === 0 && exitCode === 0`;基準測試本來就是綠的,所以「什麼都不做」必然通過 |
| **修法** | 通過測試後追加檢查 `computeDiff().files.length > 0`,零變更視為「空洞通過」並退回重試,同時把理由寫進失敗上下文 |
| **版本** | v0.1.0 修復 |
| **通則** | **「沒有變壞」不等於「有做事」。任務型的驗證要同時要求「證據為真」與「工作為實」** |

---

## G10 — `gpt-4o` 解不動這個題目,`gpt-5.3-codex` 在閘道上 404 🔵

| | |
| --- | --- |
| **症狀** | 同一個 fixture issue,`gpt-4o-2024-11-20` 兩次執行一成一敗;失敗那次連單一單位解析都弄壞 |
| **根因** | 這題需要「換模型(sticky tokenizer)而不是修補現有模型」的推理跳躍,`gpt-4o` 傾向在原本的切分思路上打補丁 |
| **修法** | 盤點閘道上的 238 個模型:`gpt-5.3-codex` 回 **404**(閘道未開放),`gpt-5.5` 可用且**第一次嘗試就解對**(18/18,且自己開新測試檔)。`EXECUTION_MODEL` 預設改為 `gpt-5.5` |
| **版本** | v0.1.2 |
| **注意** | 同時發現 `gpt-5` 系列與 o 系列在此閘道**拒收 `temperature`、且要求 `max_completion_tokens`**;推理 token 也計入該上限,故 `llmClient` 對這類模型自動改參數並放大額度(見 G11) |

---

## G11 — 推理世代模型的參數名不同,沿用舊參數直接 400 🟠

| | |
| --- | --- |
| **症狀** | 換到 `gpt-5.5` 後所有呼叫回 HTTP 400 |
| **根因** | `gpt-5+` / `o` 系列不接受 `temperature`,且 `max_tokens` 已被 `max_completion_tokens` 取代;推理 token 會吃掉 completion 額度,用原本的 2048 會在還沒輸出前就截斷 |
| **修法** | `chatComplete` 以 `/^(gpt-5\|o[1345])/` 判斷模型世代,自動切換參數組並把上限放大到 `max(4096, budget*3)` |
| **版本** | v0.1.2 修復 |
| **通則** | **同一個 OpenAI 相容端點,不同世代模型的參數契約不同。呼叫層要以模型名決定參數形狀,不要假設一套走天下** |

---

## G12 — 預載任務沒有執行歷史,市集前兩個貨架點進去是死路 🟠

| | |
| --- | --- |
| **症狀** | 「建置中」「驗證中」兩個貨架(評審最先點的兩個)點進去:執行室顯示「尚未開始執行」、審查頁顯示「沒有待審項目」 |
| **根因** | 預載資料只建立了 mission,沒有建立 run / event / artifact;而 mission 詳情頁的 CTA 是按 `status` 決定的,於是狀態是 `executing` 卻沒有任何執行可看 |
| **修法** | 新增 `seedRun()`,為 `executing` / `needs_review` / `failed` 三個預載任務補上事件時間軸,`needs_review` 那個另附含真實 diff 的 PR 產出物 |
| **版本** | v0.1.1 修復 |
| **教訓** | **通則:任何「狀態 → 導覽目標」的 UI,預載資料必須把該狀態的下游資料一起造出來。狀態存在但下游不存在 = 死路** |

---

## G13 — 沒有可執行工作區的專案照樣顯示「開始執行」,按了必定 400 🟠

| | |
| --- | --- |
| **症狀** | 把預載的 `hexcast` 募到目標後,CTA 變成「開始執行」,按下去回 400 `no executable workspace` |
| **根因** | CTA 只看 `mission.status`,沒看 `project.workspace.kind`;而工作區提示又用 `kind !== "none"` 當顯示條件,於是這些專案**兩種提示都不顯示**,使用者完全沒有線索 |
| **修法** | ①CTA 對非 fixture 專案改為顯示說明文字而非按鈕;②工作區提示補上 `none` 的第三種文案;③認捐達標的自動執行也先檢查工作區,不可執行就只記錄不啟動 |
| **版本** | v0.1.1 修復 |

---

## G14 — 伺服器的英文錯誤訊息直接洩漏到中文介面 🟡

| | |
| --- | --- |
| **症狀** | 中文介面下的錯誤 toast 出現 `mission is executing; pledging closed` |
| **根因** | 前端直接把 `e.message` 丟進 toast;而錯誤訊息是伺服器端的英文 prose |
| **修法** | 伺服器改為在 400 回應附上**穩定 error code**(`ERROR_CODES` regex → code),前端 `apiErrorText()` 把 code 映射到 i18n 鍵,未知 code 退回通用訊息。原始英文訊息保留在日誌 |
| **版本** | v0.1.1 修復 |
| **通則** | **跨語言介面的錯誤處理:網路邊界傳的是「代碼」,不是「句子」。句子留給日誌** |

---

## G15 — 掛在 `/app/var` 的 volume 屬 root,非 root UID 開機就 EACCES 死亡 🔴

| | |
| --- | --- |
| **症狀** | 以 k8s 的檔案系統姿態在本機重現(`--read-only --tmpfs /app/var`):容器啟動即 `Error: EACCES: permission denied, mkdir '/app/var/workspaces'`,行程直接結束 |
| **根因** | Pod 以數字 UID 1000 非 root 執行、根檔案系統唯讀,SQLite 與每次執行的工作區都寫在掛載的 `emptyDir`;而該 volume 預設屬 root。Kubernetes 靠 `securityContext.fsGroup` 才會把 volume 改成該 group 可寫 —— 這個欄位是**功能性依賴,不是裝飾** |
| **修法** | ①`server/db.ts` 改為依序解析可寫目錄(`VAR_DIR` → `/app/var` → 系統暫存),並在退化時輸出一則結構化警告,而不是丟原始 EACCES;②manifest 明確補上 `fsGroupChangePolicy: OnRootMismatch` 並在註解寫明 `fsGroup` 為何是 load-bearing。實測:root 擁有的唯讀環境下可正常開機並跑完整任務(20/20) |
| **版本** | v0.1.1 修復 |
| **教訓** | **通則:容器安全設定(非 root、唯讀根、drop caps)一定要在「和生產一樣的檔案系統姿態」下實測。這類問題在開發機永遠不會出現,只會在第一次上叢集時炸** |

---

## G16 — 示範執行器的敘述只有英文,中文介面下主畫面半英半中 🟡

| | |
| --- | --- |
| **症狀** | 中文介面的即時執行室裡,「Repository analyzed」「Implementation plan drafted」「代理總結」的內容都是英文 |
| **根因** | `L10n = string \| {en, zh-TW}` 允許純字串(給真實代理輸出用,因為那是模型產生的語言),而示範執行器的文案是**我自己寫的**,卻圖方便用了純字串 |
| **修法** | 示範執行器所有撰寫文字改為雙語物件;`AttemptResult.summary` 型別由 `string` 放寬為 `L10n`,讓 PR 產出物的摘要也能雙語。只有真正的程式碼識別符(失敗測試名、檔案路徑)保持不翻譯 |
| **版本** | v0.1.1 修復 |
| **通則** | **「型別允許」不等於「應該這樣用」。當一個聯合型別的其中一支是為了外部資料而存在,自己產生的內容就不該走那一支** |

---

## G17 — 執行中按「重設示範資料」會讓整個伺服器死亡 🔴

| | |
| --- | --- |
| **症狀** | 真實 LLM 執行進行中呼叫 `POST /api/demo/reset`,回應 `{"ok":true}` 之後**伺服器行程結束**:`TypeError: Cannot read properties of undefined (reading 'computeGoal') at recomputeProgress` |
| **根因** | `demo/reset` 只呼叫 `engine.cancel()`(發出 abort 訊號)就立刻 `wipeAll()` 清空所有資料表;但執行迴圈是 fire-and-forget 的 async,abort 之後還會走完清理路徑,其中 `store.getMission(missionId)!` 對已被刪除的列回傳 `undefined`,非空斷言讓 `TypeError` 在 async 堆疊裡拋出 → 未處理的 rejection → 行程結束。**而這顆按鈕正是 README 寫的示範救命方案** |
| **當時修法** | 三層:①熱路徑不再用非空斷言,改拋具名的 `MissionGoneError`,執行迴圈視為「中止」處理並安靜收尾;②`demo/reset` 改為 `await engine.cancelAllAndSettle()`;③`server/index.ts` 加 `unhandledRejection` / `uncaughtException` 守門。回歸測試證明常見 reset 路徑不會殺死行程；但目前 settlement 最多等 8 秒後仍會繼續 reseed,CLI 也會繞過它,所以不能再寫成「一定等迴圈真正結束才清表」。 |
| **版本** | v0.1.2 修復;由對抗式稽核發現 |
| **教訓** | **通則:「清空所有狀態」的操作必須先讓所有讀寫者停下來,再動資料 —— 而且要 await,不是發訊號就走。另外:非空斷言(`!`)在 async 迴圈裡等於一顆定時炸彈,因為它爆炸的地方離呼叫者已經很遠了** |

---

## G18 — 錯誤處理器本身也會拋錯,同樣讓行程死亡 🔴

| | |
| --- | --- |
| **症狀** | 與 G17 同源的第二條路徑:`runLoop` 的 `catch` 區塊呼叫 `finishRun()`,而後者會發事件、寫資料庫 —— 在資料表已被清空的情況下同樣拋錯,且**沒有任何人接** |
| **根因** | `void this.runLoop(...).finally(...)` 只掛了 `finally`,沒有 `catch`。catch 區塊內的錯誤直接變成未處理的 rejection |
| **修法** | ①`finishRun()` 的呼叫包在自己的 try/catch,失敗只記錄;②fire-and-forget 啟動點補上終端 `.catch`;③加上行程層級守門(同 G17) |
| **版本** | v0.1.2 修復 |
| **通則** | **錯誤處理路徑也是程式碼,也會失敗。任何「在 catch 裡做清理」的設計都要問:清理自己失敗會怎樣** |

---

## G19 — 我自己補的預載執行歷史,戴著「引擎驗證」徽章 🔴

| | |
| --- | --- |
| **症狀** | 「建置中」「驗證中」兩個貨架上的預載執行,顯示 84/84、41/41、44/44 等測試數字與完整 diff,而且掛著綠色的 **Engine-verified**(引擎驗證)徽章。這些數字全是我寫在 `seed.ts` 裡的,從未執行過 |
| **根因** | 修 G12 時新增的 `seedRun()` 把事件的 `source` 設為 `"engine"`,而事件的 `verified` 欄位計算式正是 `verified: e.source === "engine"`。於是**憑空編寫的證據自動取得了產品最強的信任標記**,還出現在評審最先點開的兩個畫面上;`docs/ARCHITECTURE.md` 當時也寫著「即使 demo 模式,測試結果永遠是真實觀測」,這句話因此變成假的 |
| **修法** | ①21 個預載事件全部改為 `source: "demo"` → `verified` 自動變 false → UI 顯示「示範腳本」;②`Review.tsx` 的測試證據面板不再硬寫 `source="engine"`,改為跟隨 `artifact.mode`;③修正 ARCHITECTURE 的過度宣稱,改為「引擎實際執行的每一次執行」;④示範模式的提示文案同步修正。加回歸測試 `seeded execution history never claims engine verification`(掃描所有預載事件,斷言無一為 engine/verified) |
| **版本** | v0.1.2 修復;由對抗式稽核發現 |
| **教訓** | **通則:信任標記的產生規則要有測試把關,因為違反它的人往往是「為了讓畫面好看」的自己。我建了整套信任邊界,然後在補示範資料時親手繞過它 —— 誠實性不能靠自律,要靠斷言** |

---

## G20 — 「要求修改」把唯一可審查的預載任務變成永久死局 🟠

| | |
| --- | --- |
| **症狀** | 在預載的 `fetchling` 任務按「要求修改」,任務進入 `changes_requested` 後**永遠停在那裡**,審查頁的兩個按鈕全灰(`canAct` 只允許 `needs_review`) |
| **根因** | 要求修改後引擎會排一次後續執行來處理回饋,但該專案沒有可執行工作區(同 G13),`executeMission` 拋錯 —— 而那個錯誤只被 `logger.error` 記錄,**沒有任何狀態補償** |
| **修法** | 後續執行啟動失敗時,引擎把任務退回 `needs_review` 並發出一則說明事件(engine-verified),維護者的決定仍然有效。線上驗證:狀態回到 `needs_review`、按鈕可用 |
| **版本** | v0.1.2 修復;由對抗式稽核發現 |
| **通則** | **fire-and-forget 的狀態轉換必須有補償路徑。「發起一個非同步動作然後轉換狀態」的設計,要問「動作沒起來的話,誰把狀態轉回去」** |

---

## G21 — 退款只是帳本上的一行宣稱,錢包從來沒有真的入帳 🔴

| | |
| --- | --- |
| **症狀** | 任務發布後帳本出現 `refund_unused 2383`、個人頁的「退還點數」也顯示數字,但**貢獻者的錢包餘額完全沒變** |
| **根因** | 發布路徑只 `addLedger({type:"refund_unused"})`,沒有任何 `saveContributor` 把餘額加回去。帳本是敘事,錢包才是狀態 —— 兩者從未對帳 |
| **修法** | 發布時依各支持者的認捐比例加值錢包,再寫帳本。線上驗證:錢包 5000 →(認捐 360)4640 →(發布退款)**4999**。加回歸測試 `released missions actually return unused credits to backer wallets`。目前各 share 獨立四捨五入,尚未保證 wallet 增量總和與 ledger 的 `unused` 完全守恆。 |
| **版本** | v0.1.2 修復;由對抗式稽核發現 |
| **教訓** | **通則:凡是「帳本 + 餘額」並存的設計,一定要有一個測試從餘額端驗證,而不是從帳本端。帳本很容易寫得漂亮又完全不影響現實** |

---

## G22 — 發布事件宣稱打了標籤、更新了變更日誌、產生了發行說明 —— 全都不存在 🟠

| | |
| --- | --- |
| **症狀** | 發布事件的內文寫「Tagged v1.5.0, changelog updated, release notes generated」,而這三件事的程式碼一行也沒有 |
| **根因** | 文案是照著「理想的發布流程」寫的,不是照著實作寫的 |
| **修法** | 改為敘述實際發生的事(標記為已發布、退還未使用額度),並明說打標籤/變更日誌/發行說明仍屬維護者自己的發布流程,因為 CommonCommit **不會推送程式庫** |
| **版本** | v0.1.2 修復;由對抗式稽核發現 |
| **通則** | **使用者可見的文案是產品聲明的一部分。寫「系統做了什麼」的句子時,要當成寫測試斷言那樣檢查它是否為真** |

---

## G23 — 驗收條件被整批標成「由測試驗證」,連沒執行過的預載任務也是 🟠

| | |
| --- | --- |
| **症狀** | 「perf delta < 1μs」「無 API 變更」這類無法自動檢核的條件,都掛著綠色驗證徽章;預載任務甚至一次執行都沒有 |
| **根因** | 驗證通過後迴圈把每條條件都設成 `verifiedBy: "tests"`,暗示逐條證據;而引擎其實只把關**整個測試套件** |
| **修法** | 引擎改為記錄真正的把關依據 `suite:18/18`(UI 顯示在徽章旁);預載任務記為 `seeded-demo` 並顯示「示範腳本」;條件區的副標改為「以代理無法干預的完整引擎測試把關」 |
| **版本** | v0.1.2 修復;由對抗式稽核發現 |
| **通則** | **不要用比證據更強的措辭。「由測試驗證」與「整套測試通過」是兩件事,差別在評審問第二個問題時會顯現** |

---

## G24 — 凍結的預載執行,按「停止執行」會謊報成功 🟠

| | |
| --- | --- |
| **症狀** | 預載的「建置中」執行按下紅色「停止執行」,UI 顯示「執行已停止」,但**什麼都沒發生** —— 該 run 仍是 `running`,下次進來還是一樣 |
| **根因** | `engine.cancel()` 只認得**本行程記憶體裡**的 AbortController;預載的 run(以及重啟前留下的 run)不在其中,回傳 `false`。而前端不看回傳值,一律報成功 |
| **修法** | ①`/cancel` 區分兩種情況:真正在執行 → abort;孤立紀錄 → `settleOrphanedRun()` 誠實標記為已停止,回應 `{cancelled, active, settled}`;②前端只在伺服器說成功時才顯示「已停止」,否則顯示不同文案 |
| **版本** | v0.1.2 修復;由對抗式稽核發現 |
| **通則** | **前端不可以自己決定「操作成功了」。樂觀 UI 只能用在可回滾的事,狀態變更一律以伺服器回應為準** |

---

## G25 — LLM 呼叫沒有 timeout 也忽略 abort 訊號 🟠

| | |
| --- | --- |
| **症狀** | (預防性,由稽核指出)閘道若無回應,`fetch` 會無限等待;取消執行或預算耗盡時,已發出的呼叫仍會跑完 |
| **根因** | `chatComplete` 的 `fetch` 沒有 `signal`、沒有 timeout;`AttemptContext.signal` 只在階段之間被檢查,不會傳進網路層 |
| **修法** | `chatComplete` 接受 `AbortSignal` 與 `timeoutMs`(預設 180 秒),以 `AbortSignal.any([caller, timeout])` 合併;執行器把該次執行的 signal 傳入。呼叫確實會終止,但目前 Node timeout 丟的是 `TimeoutError`、catch 只辨識 `AbortError`,所以「abort 與 timeout 分別給出不同訊息」這一段尚未成立。 |
| **版本** | v0.1.2 修復 |
| **驗證** | 在 G17 的重設測試中實際觸發:日誌出現 `run ended abnormally / LLM request cancelled`,即為此修復生效 |

---

## G26 — 硬編死的測試指令讓「沙箱」名不副實 🟠

| | |
| --- | --- |
| **症狀** | 引擎宣稱在隔離工作區驗證,但驗證指令永遠是 `node --test` —— 換一個有相依套件的程式庫就跑不起來,更別說其他語言 |
| **根因** | `runTests()` 直接寫死 argv,沒有任何環境探測或建置步驟;`execFile` 也直接繼承整個 `process.env`(含所有金鑰) |
| **修法與現況限定** | 新增 `server/engine/sandbox.ts`:①`planEnvironment()` 從**實際檔案**推導工具鏈、安裝指令與測試指令(並記錄 `testSource`,絕不由模型指定);②`runInSandbox()` 強制執行檔白名單、cwd、逐階段 timeout 與輸出上限、清洗後的環境變數;③`provision()` 只在需要時安裝相依;④`toolchainAvailable()` 探測工具鏈。這些是 application-level 能力控制；cwd 不是唯一可寫邊界,proxy/offline flag 也不是 hard network isolation,不得再概括成「驗證階段已關閉網路」。 |
| **版本** | v0.2.0 |
| **通則** | **「沙箱」是能力清單,不是形容詞。要能說出:誰可以執行什麼、寫哪裡、看得到哪些環境變數、連不連得上網、跑多久會被砍** |

---

## G27 — Istio validation webhook 拒收 `timeout: 0s` 🔵

| | |
| --- | --- |
| **症狀** | 推送 GitOps 前的 `kubectl apply --dry-run=server` 回 `admission webhook "validation.istio.io" denied the request: duration must be greater than 1ms` |
| **根因** | SSE 是長連線,預設 timeout 會截斷即時執行串流,於是想用 `timeout: 0s` 表示「不逾時」;但該 webhook 把 `0s` 視為非法 duration |
| **修法** | 改用有限大值 `86400s`。**這個坑是在 dry-run 階段被攔下的,沒有影響共用 gateway 上既有的 29 個 host** |
| **版本** | v0.1.1 |
| **教訓** | **通則:改共用基礎設施前一律先 `kubectl apply --dry-run=server` 對線上叢集驗證。GitOps 的 selfHeal 會忠實地把錯誤設定同步上去** |

---

## G28 — 成就的名稱與說明由伺服器提供純英文,中文頁面顯示英文卡片 🟡

| | |
| --- | --- |
| **症狀** | 線上以中文瀏覽個人頁:成就徽章 chip 是中文(「滄海遺珠」),但同一張卡片的**標題與說明是英文** |
| **根因** | chip 走 `t("ach.<code>")`(前端字典),卡片走 `lt(def.name)`(伺服器提供);而 `store.ts` 的 `ACHIEVEMENTS` 定義表雖然型別是 `L10n`,值卻寫成純英文字串 |
| **修法** | 8 個成就的 `name` / `description` 全部改為雙語物件 |
| **版本** | v0.1.1 修復;**在線上瀏覽時發現** |
| **教訓** | **同一份內容有兩條渲染路徑時,只翻譯其中一條的機率很高。這個坑不是靠讀程式碼找到的 —— 是靠把語言切成中文、真的用一遍找到的** |

## G29 — 工具迴圈的助理訊息形狀:`tool_calls` 必須原樣回貼,`content` 允許 `null` 🟠

| | |
| --- | --- |
| **症狀** | 把工具結果送回閘道時得到 400,或模型忘記自己剛剛呼叫過什麼、重複呼叫同一個工具 |
| **根因** | OpenAI 相容的工具迴圈對訊息序列有嚴格要求:每個 `tool_calls` 都必須有一則 `role:"tool"` 且 `tool_call_id` 完全對上的回覆;而發出工具呼叫的那則助理訊息**必須原樣回貼進歷史**(含 `id`、`type:"function"`、`function.arguments` 原始字串)。推理型模型常常只回工具呼叫、`content` 是空的 —— 這時 `content` 要送 `null`,不是 `""`,型別上也得允許 |
| **修法** | `ChatMessage` 聯集加入 `{role:"assistant", content: string \| null, tool_calls: […]}` 與 `{role:"tool", tool_call_id, content}` 兩種形狀;`llmRunner` 在 dispatch 前先把助理訊息連同工具呼叫推進 `messages`,再逐一補上對應的 `tool` 回覆 |
| **版本** | v0.3.0 |
| **通則:** | **工具迴圈的歷史是協議,不是摘要。** 任何「幫模型整理一下上下文」的念頭都會破壞 `tool_call_id` 的配對。要省 token 就縮短工具*回傳內容*,不要動訊息骨架 |

## G30 — 比實作者弱的審查模型 = 橡皮圖章,而且比沒有審查更糟 🔴

| | |
| --- | --- |
| **症狀** | 新增的送審前自我審查,對一份真實 diff 回 `verdict: "approve"`、`risks: []`、`unverified: []` —— 看起來系統多了一道品管,實際上什麼都沒審 |
| **根因** | 為了省錢把 judge 接到 `campaignModel`(`gpt-4o-mini`)。G10 早就記錄過 `gpt-4o-*` 解不動 tempo 這一題 —— 解不動的模型自然也看不出解法哪裡有問題 |
| **修法** | judge 改用 `executionModel`(`gpt-5.5`)。同一份 diff 立刻得到 2 條具體行為風險與 1 條誠實的未確認項 |
| **版本** | v0.3.0 |
| **通則:** | **審查者的能力必須 ≥ 實作者,否則這道關卡是負價值 —— 它把一句自信的「看起來沒問題」放到維護者面前,消耗的是人類的信任而不是模型的 token。** 想省成本就砍審查的*頻率*(例如只審高風險 diff),不要砍審查的*智力*。判斷這道關卡有沒有在做事的方法:看 `judge_verdicts_total{verdict}` 是不是永遠只有 `approve` |

## G31 — 無法辨識的 `mode` 靜默降級成模擬生成器 🟠

| | |
| --- | --- |
| **症狀** | 呼叫 `POST /api/campaigns/generate` 傳 `mode: "llm"`(不在 `"openai" \| "demo"` 之內),回 200 且內容看似正常,但 `generator` 是 `"demo"` —— 要真實生成卻拿到腳本文字 |
| **根因** | `const effective = mode ?? (openaiConfigured() ? "openai" : "demo")` 只處理 `undefined`,無法辨識的字串會一路傳進 `generateCampaign()` 落到 else 分支 |
| **修法** | 明確驗證 enum,不合法回 400 `invalid_mode`。同時修掉相鄰的 `POST /api/missions`:形狀錯誤的 `acceptanceCriteria`(`{text: L10n}` 而非 `L10n`)原本會被原樣存下,產出驗收條件渲染成空白的任務,現在回 400 `malformed_draft` |
| **版本** | v0.3.0 |
| **通則:** | **「不能把模擬說成真實」的另一半是「不能在對方要真實時偷偷給模擬」。** 這個坑的 `generator` 欄位其實標對了 —— 標示誠實不代表行為誠實。所有 enum 邊界都要在入口驗證,`??` 只擋 `undefined` 不擋垃圾 |

## G32 — 所有非成功路徑都收斂成 `failed`,把刻意的判斷報成故障 🟡

| | |
| --- | --- |
| **症狀** | 代理正確地棄權(「這需要產品決策,程式庫裡沒有依據」),但任務狀態變成 `failed`、UI 歸到「需要救援」的失敗那一側 |
| **根因** | `finishRun()` 對 `failed` / `blocked` / `budget_exhausted` / `cancelled` 四種 run 結局,一律 `transitionMission(mission, "failed")`。run 層級的語意是對的(`blocked`),任務層級卻被壓平了 |
| **修法** | `blocked` → 任務進 `stalled`(等人,不是壞掉);其餘仍進 `failed`。狀態機補 `executing → stalled` 與 `stalled → executing`(人解開阻塞後可直接重啟),並加常駐回歸測試 |
| **版本** | v0.3.0 |
| **通則:** | **狀態的數量要對得上結果的種類。** 把「引擎刻意停下來把決定交回人類」和「引擎試了但做不到」放進同一格,等於在報表上抹掉棄權這個設計 —— 而棄權率正是判斷代理有沒有在自我認知的關鍵訊號 |

## G33 — `sum(increase(never_incremented_counter[24h])) == 0` 求值為空向量,不是 true 🔴

| | |
| --- | --- |
| **症狀** | 新寫的 `CommonCommitAgentNeverAbstains` 告警(「代理反覆失敗卻從未棄權」)在線上 Prometheus 上**永遠不會觸發**。手動查詢 `sum(increase(commoncommit_runs_blocked_total{reason="agent_abstained"}[24h])) == 0` 回傳空結果,而不是 `0` |
| **根因** | Prometheus 的 counter 在**第一次 `inc()` 之前根本沒有 series**。`increase()` 對不存在的 series 回空向量,`sum()` 對空向量(無 `by` 分組時)仍是空向量,而 `空向量 == 0` 的結果是空向量 —— 不是 true。於是這個告警在「從未棄權」也就是它存在的唯一理由的情況下靜默失效。同理,stat 面板會顯示 `No data` 而不是 `0%` |
| **修法** | 所有可能不存在的 counter 都包 `or vector(0)`:`(sum(increase(...)) or vector(0)) == 0`。分子分母都要。已對線上 Prometheus 逐條驗證(29 條運算式:0 語法錯誤、26 條有資料、3 條空的是錯誤率 timeseries 屬語意正確),11 條規則 `health=ok` |
| **版本** | v0.3.1;**寫完告警後實際查詢 Prometheus 才發現,`--dry-run=server` 與 PrometheusRule webhook 都驗不出來** |
| **通則:** | **「告警沒響」有兩種完全不同的意思:一切正常,或告警本身壞了。這兩者在儀表板上長得一模一樣。** 每條新告警都必須證明它在該響的時候會響 —— 對線上資料查一次分子、一次分母、一次完整運算式,不要只看 YAML 有沒有被 admission webhook 收下。特別是**用來偵測「某件事從未發生」的告警,天生就踩在這個坑上**,因為它要偵測的正是「series 不存在」的狀態 |

## G34 — 一個指標承載兩種語意,聚合後就讀不出東西 🟡

| | |
| --- | --- |
| **症狀** | `commoncommit_submission_rejections_total{reason}` 同時被兩處遞增:迴圈內的送出閘門(`checkSubmission()`,reason 如 `no_writes` / `suite_red`)與引擎驗證後的審查閘門(`computeReviewable()`,reason 如 `coverage_reduced` / `no_changes`)。做成面板後無法回答「代理是草率還是在作弊」 |
| **根因** | 兩件事概念相近(都是「你說完成了,但不行」)所以共用了計數器。但成本差三個數量級:迴圈內被拒只花一次額外呼叫,驗證後被拒花掉**一整次嘗試**;而且前者代表代理草率,後者代表代理試圖繞過安全網 |
| **修法** | 加 `stage` 標籤:`stage="loop"`(迴圈內、便宜、草率訊號)與 `stage="verify"`(驗證後、昂貴、作弊訊號)。告警 `CommonCommitAgentCheatingAttempts` 只看 `stage="verify"` |
| **版本** | v0.3.1(做面板時才發現 —— 指標的缺陷往往是在**試著用它回答問題**時才浮現,不是在定義它的時候) |
| **通則:** | **指標的標籤要切在「你會採取不同行動」的界線上,不是在「事情看起來相似」的界線上。** 如果兩個事件會讓你做不同的事,它們就必須能被分開查詢。反過來說:如果你發現自己在解讀面板時得先問「這個數字是哪一種?」,那就是缺一個標籤 |

## G35 — 分析路徑把 22 個欄位的臆測值當成量測結果呈現(其中 5 個是純虛構數字)🔴

| | |
| --- | --- |
| **症狀** | 匯入精靈的「事實網格」顯示 `412 星`、`2.1M 每週下載`、`14.3K 相依專案`、健康分數 62、以及健康註記「Test suite present and green (13 cases via node:test)」—— 全部是 `analyzer.ts` 裡的字面值,而且與**真正數出來的**檔案數／行數並列在同一個網格、**沒有任何 badge**。GitHub 路徑則顯示 `0 files` / `0 lines of code`,因為那兩個值是字面 `0` |
| **根因** | 三層放大:①`analyzeFixture()` 為了讓 demo 好看而寫死五個數字 —— 但 `repoUrl` 同時寫著 `local fixture: fixtures/tempo`,一個本地目錄不可能有 stargazer;②這些值被以 `# Repository analysis (real, observed)` 為標頭餵給募資文案模型;③模型把它們寫成對外文案(「每週約 2.1M 次下載」、「守護 14.3K 個相依專案」),再 persist 到 `Project` 上,於市集卡片與任務詳情長期出現。最尖銳的是那句健康註記:`analyzeFixture` **不執行任何東西**,卻斷言測試全綠 —— 在一個「只有引擎能斷言測試結果」為核心命題的系統裡 |
| **修法** | 所有數值欄位改為 optional,**未量測就是 `undefined`,UI 不渲染**(絕不以 0 代替 —— 顯示 0 本身就是一個量測主張)。fixture 不再有熱門度數字;GitHub 路徑改為真的去抓:npm registry 的真實週下載、`/readme`、`/actions/workflows` 判斷 CI。新增 `measured: {filesystem, popularity, hostMetadata}` 記錄實際做了什麼。健康註記只陳述觀測到的事(「發現 2 個測試檔 — 未執行」)。餵給模型的 prompt 改為只列量測到的事實,並明確指示「未列出的一律不得估計或暗示」 |
| **版本** | v0.3.1;**由誠實性稽核代理發現,不是靠讀程式碼** |
| **通則:** | **`?? 預設值` 是誠實性的頭號殺手。** `analysis.stars ?? 412`、`pkg.license ?? "MIT"`、`files: 0` 全都是同一個模式:讓「沒有資料」偽裝成「有資料」。**缺資料的正確表示法是缺席,不是零、不是預設值、不是佔位符。** 另外:`seed.ts` 曾寫 `analysis.stars ?? 412`,把同一組字面值**經由 analyzer 的回傳值洗回來** —— 示範資料本身可以是假的(只要標示),但一旦它流經量測函式,就會取得量測的權威性 |

## G36 — 「AI 可行性判讀」是一個沒有任何輸入的常數 🔴

| | |
| --- | --- |
| **症狀** | `AnalyzedIssue.feasibility` 對**每一個** GitHub issue 都回 `"medium"`,對 fixture issue 都回 `"high"`。UI 用三色 badge 呈現、型別註解寫「AI feasibility read」、頁面副標題寫「AI reads the repository, understands the issue」—— 而 `analyzer.ts` 裡**一次模型呼叫都沒有** |
| **根因** | 佔位符從未被實作,但周圍的 UI 與文案把它當成已實作的功能來包裝。這是最難自己發現的一類缺陷:程式碼「正常工作」、畫面「看起來合理」,只有把同一支程式對不同輸入跑兩次才會發現輸出不變 |
| **v0.3.1 的初始修法** | 新增 `server/ai/feasibility.ts`:19 條正/負向文字訊號與 maintainer 標籤權重,並標明 `by: "heuristic"`。後續量測顯示 19 條裡只有 1 條帶資訊,目前已改成較少、可追溯量測的 scored signals 加 unpriced observations；held-out 並未證明新版更準（見 G46）。 |
| **版本** | v0.3.1 |
| **通則:** | **能一眼看出常數的地方最不容易被發現,因為它旁邊的 UI 會替它圓謊。** 抓這類缺陷的方法只有一個:**對同一個功能餵兩組不同的輸入,看輸出會不會變**。任何被包裝成「AI／預測／智慧」的欄位都應該有一條「不同輸入必得不同輸出」的測試常駐 —— 否則它可能只是一個字面值 |

## G37 — CI 設定只鎖了入口檔,真正的 pipeline 定義是可寫的 🟠

| | |
| --- | --- |
| **症狀** | 寫入拒絕清單有 `.gitlab-ci.yml`,看起來 CI 設定受保護。但 GitLab 的標準做法是 `include: .gitlab/ci/*.yml` 把 job 定義拆出去(house repo `shopeetw-terraform` 就是這樣寫的)—— 那個目錄**不在**清單裡。薄薄的入口檔鎖著,真正決定 CI 做什麼的檔案卻可寫 |
| **根因** | 拒絕清單是按「我知道的檔名」列的,不是按「CI 會讀取的路徑集合」列的。同一個盲點還漏了決定驗證標準的檔案:`package.json`(`scripts.test`)、`pytest.ini`、`tox.ini`、`go.mod`、`Makefile`、`jest.config.*`、`conftest.py` —— 而 `runTests()` **每次呼叫都重新** `planEnvironment()`,所以 agent 改掉 `scripts.test` 後,連引擎自己最後那次驗證執行都會用新指令,時間軸上卻還顯示舊的計畫 |
| **修法與剩餘邊界** | 改為鎖**目錄**(`.gitlab/`)並補齊其他 CI 系統與 verification definitions；本 repo 的 `.gitlab-ci.yml` 刻意不拆 include。這個 hard denylist 只覆蓋 bounded `LlmRunner`；`CodexRunner` 不走它,且每次測試仍會重新推導 plan,freeze-one-plan 尚未完成。 |
| **版本** | v0.3.2;由 CI/CD 設計代理在讀護欄時發現 |
| **通則:** | **拒絕清單要按「攻擊者能達成什麼」來列,不是按「我想到哪些檔名」來列。** 問法應該是「有哪些路徑一旦可寫,就能改變這次執行的判定標準或執行環境?」而不是「CI 設定檔叫什麼名字?」。一個只鎖入口檔的清單會給出完整防護的錯覺 —— 而錯覺比沒有防護更危險,因為它讓人停止檢查 |

## G38 — 字串前綴不是圍堵:symlink 讓工作區內的路徑解析到任何地方 🔴

| | |
| --- | --- |
| **症狀** | `readWorkspaceFile` / `tools.ts:safeResolve` / `writeWorkspaceFile` 都用 `full.startsWith(ws.dir)` 判斷「在工作區內」。但 `git clone` 會**忠實還原被 commit 的 symlink**,所以一個程式庫可以放 `host -> /`,然後請求讀 `host/etc/passwd` —— 字串上完全在工作區內,實際解析到根目錄 |
| **根因** | 這些讀取發生在**伺服器行程**裡(`fs.readFileSync`),不是在沙箱子行程裡。子行程的環境變數已被清洗,但 `/proc/<server-pid>/environ` 是**父行程的** —— 所以 `read_file host/proc/self/environ` 會把 `OPENAI_API_KEY` 與 Langfuse 金鑰交給模型輸入。安全鐵律 7(「密鑰只在伺服器端讀」)被 symlink 變成「並且交給程式庫要求的任何人」。另外**四個 walker 全都用 `statSync`,而 `statSync` 會跟隨連結** —— 其中 `baselineTestFiles` 最危險:一個讓真實測試檔看起來不存在的連結,會讓 agent 得以改寫評判自己的安全網 |
| **修法與現況** | `containedPath()` 以 `lstat` + 雙邊 `realpath` 保護 bounded tool read/write；`LlmRunner.openingBrief` 走同一條 contained、redacted path，工具列舉、baseline discovery、repository scan、`DemoRunner.listFiles` 與環境規劃計數都跳過 symlink。另有回歸測試保證 linked test directory 不會重複計入證據。這只修正已知路徑與 walker，不提供 OS 隔離。 |
| **版本** | v0.3.3。**新增的回歸測試在第一次跑就抓到我自己漏掉的第四個 walker** —— 測試真的建了 `host -> /` 這個連結,`baselineTestFiles` 於是開始走訪整個檔案系統,在第一個壞連結(`/.VolumeIcon.icns`)上炸掉 |
| **通則:** | **「在目錄內」是檔案系統的問題,不是字串的問題。** 任何用 `startsWith` 判斷圍堵的地方都要假設它是錯的。而且**修一處不算修好** —— 同一個弱檢查通常有好幾份拷貝(這裡有六份:三個路徑解析 + 四個 walker),所以正確做法是收斂成單一實作再讓所有呼叫端走它。**寫一個真的建立攻擊條件的測試**,不要只斷言錯誤字串:那個測試找到的洞比我讀程式碼找到的多。 |

## G39 — `docker build` 打包工作目錄,provenance label 卻取自 `git ls-tree HEAD` 🟠

| | |
| --- | --- |
| **症狀** | v0.3.3 部署上線後,新加的 `commoncommit_build_info` 自我檢查**當場抓到不一致**:線上 `source_tree=ea53105`、`commit=aa58d89`(v0.3.2 的 commit),但 HEAD 是 `0a10cb3`、其 source tree 是 `bdf74c2`。映像**內容**是 v0.3.3 的程式碼,**標籤**卻描述 v0.3.2 的樹 |
| **根因** | 我在 commit v0.3.3 之前就先 `make build`。`docker build` 複製的是**工作目錄**,而 `--build-arg APP_SOURCE_TREE=$(git ls-tree HEAD …)` 取的是**已 commit 的樹** —— 只要有任何 image 相關檔案未 commit,這兩者就不一致,而映像會安靜地聲稱自己是用上一個 commit 的原始碼建的。CI 永遠 build 乾淨 checkout 所以不會撞到,只有本機會 |
| **修法與剩餘缺口** | `make build` 會檢查 `IMAGE_PATHS` 的 dirty state；`make build-dirty` 會標成 `-dirty` / `uncommitted`。但 `.dockerignore` 也會改變 build context,目前卻不在 local/CI 的 path list 與 hash 裡,所以 provenance input set 尚未真正完整。 |
| **版本** | v0.3.4;**由 v0.3.3 新加的那個檢查在它第一次真正上線時抓到 —— 抓到的是我自己** |
| **通則:** | **provenance 的兩端必須來自同一個來源。** 一邊問檔案系統、一邊問 git,就等於在斷言兩件不保證相等的事。更廣義地說:**任何「證明 X 等於 Y」的檢查,第一次跑出不一致時要先懷疑檢查兩端的定義,而不是先懷疑 X 或 Y** —— 這次不一致是真的,而且它證明了這個檢查值得存在(沒有它,一個標籤說謊的映像就這樣上線了,而且沒人會發現)。 |

## G40 — GitLab runner 變殭屍:行程還在,但已停止領取工作,而 liveness probe 看不出來 🔴

| | |
| --- | --- |
| **症狀** | 新 pipeline 的 `test` job 卡在 pending 11 分鐘。GitLab 顯示三個可能原因(沒有 online runner／protected branch 沒有 runner／沒有符合 `docker` `k8s-runner` 標籤的 runner)。但**三個都不是** |
| **實際根因** | `gitlab-runner` namespace 裡**四個 runner 全部在 `2026-08-03T23:25:39–41Z` 同一刻停止輸出日誌**,最後一行都是 `Checking for jobs... failed` + `connection reset by peer` 連向 gitlab.com(`172.65.251.78:443`)。之後 **32 小時完全靜默** —— 沒有再 poll、沒有再領到任何 job。pod 狀態全是 `Running`,`RESTARTS=0` |
| **為什麼 Kubernetes 沒重啟它們** | liveness probe 執行的 `check-live` 腳本只做 `pgrep`:<br>`if pgrep -f .*register-the-runner; then exit 0; elif pgrep gitlab.*runner; then exit 0; fi`<br>行程確實還在,所以探針永遠通過。**它檢查的是「行程存在」,不是「行程還在做事」** |
| **排除過程(值得記,因為 GitLab 的提示會把人帶錯方向)** | ① 四個 pod 都 `Running` → 不是 offline;② 三個 runner 的標籤含 `docker` + `k8s-runner` → 不是標籤不符;③ 從日誌看 `group-lwh` 服務過 `infra/airflow`、`backend/bi-portal-backend`、`frontend/payment-tool-next` → **group scope 涵蓋本專案**,不是範圍問題;④ 最後看**日誌時間戳**才發現全體靜默 32 小時 |
| **影響範圍** | 不只本專案。同一批 group runner 服務 `infra/airflow`、`backend/bi-portal-backend`、`frontend/payment-tool-next` —— **整個團隊的 GitLab CI 停了 32 小時,而且沒有任何告警** |
| **修法** | 立即:`kubectl -n gitlab-runner rollout restart deploy/<每個 runner>`(runner 無狀態,重啟安全;當時沒有 job pod 在跑)。根治:探針要驗證**功能**而非**存在** —— runner 在 `:9252` 曝露 Prometheus 指標,可用最後一次成功 poll 的時間戳判斷;另外對「N 分鐘內沒有成功 poll」設告警 |
| **版本** | 於 v0.3.4 期間發現(**不是本專案的缺陷,是叢集的**) |
| **後續(重要)** | 修好 runner 只是止血。真正的原因是 pipeline **加了 `tags:`**:同 group 裡真的在跑的三個專案(`frontend/shopee-bi-portal-next`、`infra/airflow`、`frontend/payment-tool-next`)**`tags:` 區塊數全部是 0**。house pattern 是不標籤,讓 job 落在當下還活著的任何 runner —— 包含在叢集 runner 全掛期間仍持續服務它們的地端 `.32 IDC` runner。**加標籤「以求明確」把可用池縮到一個已死的子集** |
| **通則:** | **「行程還活著」與「行程還在工作」是兩件事,而 `pgrep` 只能回答前者。** 任何長駐 poller 的健康檢查都必須基於**它最近真的做到了什麼**(最後一次成功呼叫的時間、處理過的工作數),不是基於它的 PID 還在。<br><br>這個坑和 G33 是同一個形狀的兩面:G33 是「告警不會響」,這裡是「探針不會失敗」—— **兩者都讓『沒有壞消息』看起來像『一切正常』**。凡是用來偵測壞事的機制,都要問一次「它壞掉的時候,看起來像什麼?」<br><br>**第二個通則(關於我怎麼選錯標籤的)**:我是從 Kubernetes 讀 runner CR 得出標籤的 —— 那告訴我「有哪些 runner 存在」,不是「哪些 runner 在做事」。**要模仿一個慣例,去看同儕專案實際跑得起來的設定檔,不要從基礎設施反推。** 前者是被現實驗證過的,後者只是我的推論。 |

## G41 — 「兄弟專案都用這個變數且都沒定義它」不等於「它是 group 層級變數」🟡

| | |
| --- | --- |
| **症狀** | 第一次真實 pipeline 的 `build:image` 失敗:`neither GCP_SA_KEY nor GOOGLE_CREDENTIALS is set` |
| **根因** | 我看到 `infra/airflow`、`frontend/shopee-bi-portal-next`、`frontend/payment-tool-next` 三個專案都用 `$GOOGLE_CREDENTIALS` 做 `docker login -u _json_key`,而三個都**沒有在 `.gitlab-ci.yml` 裡定義它**,於是推論它是 group 層級 CI 變數 —— commoncommit 應該自動拿得到。**推論錯了**:它是各專案自己在 Settings → CI/CD → Variables 設的 project 層級變數,三份各自獨立 |
| **當時修法與現況限定** | image job 改以 **Workload Identity Federation** 為首選:OIDC token 向 STS 換短期憑證,再假冒窄權限 SA。現行 pipeline 仍保留 `GCP_SA_KEY` 與 `GOOGLE_CREDENTIALS` fallback,因此「CI variable 裡不存任何東西」只能描述首選路徑,不是整個 job 的絕對保證。 |
| **版本** | v0.3.4 之後 |
| **通則:** | **「多個地方都用了某個變數卻沒人定義它」有兩種同樣合理的解釋:它在更上層被定義了,或者每個地方都各自定義了一份。從檔案內容無法分辨**,而我當成前者。分辨方法只有去看實際的變數設定頁 —— 或者像這次一樣,乾脆選一條不需要那個變數的路。<br><br>**順帶一個更好的結果**:被迫重新想「怎麼認證」之後,拿到的方案比原本的更好(無金鑰 > 窄權限金鑰 > 寬權限金鑰)。**擋住捷徑有時候會逼出正解** —— 如果 `GOOGLE_CREDENTIALS` 當初真的在 group 層級,我大概就直接用了,然後永遠帶著一把寬權限的長期金鑰。 |

## G42 — 失敗的 job 還去上傳只有成功才會產生的 artifact,製造第二個更大聲的錯誤 🟡

| | |
| --- | --- |
| **症狀** | `build:image` 在認證步驟就失敗了,log 最後三行卻是 `WARNING: build.env: no matching files` → `ERROR: No files to upload` → `ERROR: Job failed: exit code 1`。**最醒目的錯誤和真正的原因無關** |
| **根因** | `artifacts.reports.dotenv: build.env` 沒有指定 `when`,而 dotenv report 在 job 失敗時仍會嘗試上傳(`test` job 我有寫 `when: always`,`build:image` 則是漏了想清楚)。`build.env` 是 script 成功執行到一半才產生的,失敗時當然不存在 |
| **我第一次的修法是錯的** | 我加了 `when: on_success`,以為那樣失敗時就不會上傳。**下一次 pipeline 證明沒有** —— log 仍然是 `Uploading artifacts for failed job`,而且成功上傳了。`artifacts:reports:*`(dotenv、junit、coverage…)**不受 `when:` 控制**,GitLab 一律嘗試上傳,因為 report 對「診斷失敗」本身就有價值 |
| **當時後續失敗的雜訊為何消失** | 不是因為 `when`,而是那次失敗點移到 script 較後方:`VERSION` 與 `SOURCE_TREE` 已寫進 `build.env` 才失敗。這只解釋那個較晚的 failure；目前 auth 位於 `before_script`,比建立 `build.env` 更早,所以 auth failure 仍會重現缺檔雜訊。 |
| **正確做法與目前狀態** | 先確認 report 是否真的有 consumer。兩階段交付後，GitHub 透過 API 觀察 job status、Argo 讀 promoted Git revision，已沒有 consumer；因此移除 dotenv report，而不是為不需要的 artifact 增加初始化機制。 |
| **版本** | v0.3.4 之後 |
| **通則:** | **失敗路徑上的雜訊會蓋掉失敗原因** —— 讀 log 的人是從最後一行往上看的。<br><br>但這個坑真正的教訓是**第二層的**:我做了一個修改、症狀消失了,於是以為修對了。實際上是失敗點的位置變了。**「改了 A,症狀不見了」不等於「A 造成症狀」** —— 尤其當你同時改了別的東西。要確認因果,得問「如果我的解釋是對的,還有什麼也必須成立?」(這裡是:失敗時 `build.env` 不該存在 —— 而它存在) |

## G43 — 要求一個憑證之前,先問這個呼叫是不是必要的 🟡

| | |
| --- | --- |
| **情境** | `deploy:nonprod` 需要 `ARGOCD_TOKEN` 去 POST ArgoCD 的 sync API。看起來理所當然:要部署,當然要叫部署器動作 |
| **兩個事實推翻了它** | ① Application 設定是 `automated: {prune, selfHeal}`、reconciliation 180 秒 —— **ArgoCD 本來就會自己收斂,不管 CI 有沒有叫它**。那個呼叫從來不是關鍵路徑;② 當時**根本沒有 commoncommit 的 ArgoCD Application**,所以那個呼叫不管有沒有 token 都會 404。**我為了一個既非必要、且當下必然失敗的呼叫,要求了一個長期憑證** |
| **deploy job 的修法** | 刪掉 sync 呼叫,改成輪詢應用自己的公開 `/metrics`,直到 `commoncommit_build_info` 回報這條 pipeline 建出的版本與 source tree。這個驗證不需 ArgoCD token,而且斷言 serving bytes；但 GitHub→GitLab mirror 仍需要另一顆 project-scoped `GITLAB_PUSH_TOKEN`,不可把「這個 job 不需憑證」寫成全系統不需。 |
| **版本** | v0.3.5 之後 |
| **通則:** | **每次要求一個憑證,先問三個問題**:① 這個呼叫真的必要嗎,還是系統本來就會做這件事?② 我要驗證的是「有人下了指令」還是「結果成立」?後者通常從公開端點就看得到,不需要權限。③ 這個憑證的權限範圍,是否遠大於這一個呼叫所需?<br><br>release-tag job 的專用 push token 改由 runner 注入的 `CI_JOB_TOKEN` 取代；image job 優先走 WIF；deploy verify 移除 `ARGOCD_TOKEN`。但 mirror job 仍有另一個 `GITLAB_PUSH_TOKEN`,image job 也仍保留 key fallback。**能移除一個憑證時,永遠勝過只把它保管得更小心** —— 憑證會洩漏、會過期、會權限過寬、會活得比建立它的人還久。 |

## G44 — 引擎讀不懂測試 reporter,卻把責任算在代理頭上 🔴

| | |
| --- | --- |
| **症狀** | 任何 `npm test` 跑的是 jest / vitest / mocha / AVA 的程式庫,`parseNodeTestOutput` 都回 `pass=0 fail=0 total=0`。審查閘門接著以「suite reported zero tests」拒絕 —— **引擎的盲點被記在代理身上**,而且會重試三次才收場 |
| **根因** | `parseNodeTestOutput` 只認 `node --test` 的兩種格式(`ℹ pass N` 與 `# pass N`)。三個 fixture 全都是 `"test": "node --test"`,所以這條路從來沒被走過。更根本的問題是**回傳型別無法表達「讀不懂」** —— 只能回 `TestSummary`,而 `0/0/0` 在型別上與「真的跑了 0 個測試」完全一樣 |
| **修法與剩餘 parser 缺口** | ①JavaScript output 依形狀分派 jest / vitest / mocha / node-spec / node-TAP;②`ParsedTests.parsed` 明確表達讀不懂;③引擎先檢查 `evidenceReadable`。Jest/Vitest/Mocha 有真實 fixtures,但 pytest/Go 尚無同等 fixture；一般 `go test ./...` 的 package-level `ok` 仍可能被讀成可解析但 0 cases。 |
| **版本** | v0.3.6 |
| **每個 pattern 都來自真實執行** | fixture 檔(`server/engine/__fixtures__/*-output.txt`)是 mocha 10 / vitest 2 / jest 29 對同一組 3 個測試(含一個故意失敗)的**逐字輸出**,只去掉 ANSI。不是憑記憶寫的 —— 憑記憶寫格式正是這個坑的成因 |
| **通則:** | **回傳型別要能表達「我不知道」。** 一個只能回 `{pass, fail, total}` 的函式,被迫把「讀不懂」編碼成 `0/0/0`,而 `0` 是一個關於世界的**主張**。這與 G35 的 `undefined vs 0` 是同一條原則的兩個場合:**缺乏資訊與資訊為零必須型別上可區分**,否則下游一定會把前者當後者處理。<br><br>推論:**歸因錯誤比數字錯誤更貴**。數字錯了會被下一次測試抓到;把引擎的限制記在代理頭上,會讓人花時間去改提示詞、換模型、調參數 —— 全都在錯的地方。 |

## G45 — 在同一份資料上調參再報告改善,量到的是記憶不是預測 🟠

| | |
| --- | --- |
| **情境** | 為了驗證可行性啟發式,收集了 1925 個真實 GitHub issue 並自動標註 ground truth,準備依 per-signal lift 調整權重 |
| **兩個方法論錯誤(都是我自己的)** | ①**ground truth 有 36% 是無效的**:我把 `closed as not_planned` 當成「不可自動化」,但那衡量的是**維護者意圖**(他們選擇不做),不是**可處理性**。一個完全可自動化的 bug 因產品理由被關掉也會落在這裡。移除這 692 筆後,precision 從 **49.7% 跳到 70.9%** —— 也就是說原本有 21 個百分點的「失敗」是我的標註造成的,不是啟發式造成的。②**沒有 train/test 分割**:若直接依全量資料的 lift 調權重再報告改善,量到的是記憶 |
| **設計修法與現行落差** | ①排除 `not_planned` 並明寫 ground truth 是 proxy；②依 **repo** 而非 row 做 deterministic 70/30 分割。兩項都已落到新收集流程：`scripts/eval/label.py` 會在考慮其他 proxy 前先排除所有 `NOT_PLANNED`，collector 也不再把它列為負例。但舊 corpus 與既有 calibration 不會自動修正，仍須重新收集並用未碰過的 repo holdout 評估；evaluator 預設仍是 `all`。 |
| **版本** | v0.3.6 |
| **通則:** | **自動標註的 ground truth 要先問「這個標籤衡量的是我想預測的東西嗎?」** `not_planned` 看起來完美 —— 有結構、量大、來自維護者本人 —— 但它衡量的是意圖。**標籤越容易取得,越該懷疑它衡量的是別的東西。**<br><br>第二條:**依群組分割,不要依樣本分割**。凡是樣本之間有共享來源(同一個 repo、同一個作者、同一個時間窗),依樣本分割就是資料洩漏。 |

## G46 — train 上的 CV 說改善 +0.12 AUC,乾淨 held-out 說「比較好的機率 12.6%」🔴

| | |
| --- | --- |
| **情境** | 依 1233 個真實 issue 的量測結果重寫可行性啟發式:刪掉 19 個 pattern 裡測不到訊號的那些、依 measured lift 重配權重、加入新的結構性特徵(≥3 個項目符號 = −17.7pp、連結其他 issue = −15.8pp)。**train split 的 repo-grouped 5-fold × 20-seed CV:AUC 0.556 → 0.676**。看起來是大勝 |
| **乾淨的 held-out 說反話** | 對 25 個**從未參與特徵挑選**的 repo(433 筆)做 repo-grouped bootstrap:<br>舊版 AUC **0.658** [0.590, 0.720]<br>新版 AUC **0.608** [0.526, 0.680]<br>Δ = **−0.050** [−0.122, +0.020],**P(新版排序更好) = 12.6%** |
| **三個估計量,三個答案** | ①單一 held-out 點估計:新版較差(0.616 vs 0.663);②全語料 bootstrap:新版較好(+0.063,P=97.9%)—— **但它包含了挑特徵用的那些 repo,被汙染了**;③只用 held-out repo 的 bootstrap:新版較差(P=12.6%)—— **這是唯一同時「乾淨」且「有不確定度」的估計量**,所以它才是答案 |
| **部分是假象** | 新版規則較少,所以 10.2% 的跨類配對分數完全相同(舊版 4.1%),而 AUC 對平手只給一半分。這解釋了約 60% 的差距,但不是全部,而且信賴區間跨越 0 |
| **決定** | **照樣上線,但不宣稱更準。** 理由與準確度無關:①每個權重都可追溯到量測 —— 已知 `expected_vs_actual` 在兩類都命中 46.1%,還把它留在權重 18 就是**明知故犯地出貨一個已證明無意義的數字**;②計分與不計分訊號分離,讀者看得出哪些帶數字、哪些只是事實;③校準值隨分數一起送出,UI 無法只顯示「79」而不顯示「vs 基準 65%」 |
| **版本** | v0.3.8 |
| **通則:** | **在 train 上做特徵挑選,再用同一批資料的 CV 評估,量到的仍然是記憶。** CV 分割的是**樣本**,但特徵是看著**整個 train** 挑的 —— 選擇偏誤已經滲進每一折。唯一能反駁它的是完全沒參與挑選的資料。<br><br>而且:**當多個估計量互相矛盾時,先問「哪一個回答了我真正的問題」,不要挑數字好的那個。** 全語料 bootstrap 有更多資料、更窄的區間、更討喜的結論 —— 而它是三者中唯一被汙染的。<br><br>最後:**「更有原則」不等於「更準確」。** 新版在方法論上明顯較佳(每個權重有出處、刪掉噪音、誠實分層),而它預測得並沒有更好。這兩件事必須分開陳述,否則就是拿方法論的乾淨去暗示準確度的提升。 |

---

## G47 — 洗乾淨子行程的環境變數，不等於有邊界 🔴

**症狀。** `sandboxEnv()` 已把所有憑證從子行程環境移除，文件也把 sandbox 描述成「隔離不受信任的 repo 程式碼」。但一個環境完全乾淨的子行程，第一次嘗試就讀到了父行程的合成 canary。

**根因。** 同一個 uid 的行程之間本來就沒有任何隔離。Linux 上 `/proc/<server-pid>/environ` 可讀；darwin 上 `ps -Eww -p <ppid>` 會印出同樣的內容。兩者回報的都是 **exec 當時**的環境，所以啟動後再 `delete process.env.X` 完全沒用，應用層程式碼也不可能補起這個洞。

**現況。** `server/engine/isolation.ts` 讓每個指令在可拋棄的容器內執行，擁有獨立的 PID、mount、network namespace，server 行程在 `/proc` 裡根本不存在。`runInSandbox` 在有邊界時改走容器，沒有時誠實地退回行程路徑。白名單與洗過的環境保留為 defence in depth，但兩者都不是承重結構。殘餘風險寫在 `SECURITY.md`：namespace 是 kernel 邊界，不是 hypervisor 邊界。

**通則。** 要問「這個控制是誰在執行」，而不是「它禁止了什麼」。由持有秘密的那個行程自己執行的規則叫政策，政策不是邊界。

## G48 — 探測必須真的做它所宣稱的那件事 🔴

**症狀。** 隔離探測只確認了 Docker daemon 有回應、sandbox image 存在，就回報 `osIsolated: true`。而在測試環境下每一次執行其實都跑在一個**空目錄**上，引擎記錄成「baseline test run: 0/0 passing」。

**根因。** Docker Desktop 只分享特定的 host 路徑。測試環境把 workspace 放在 `os.tmpdir()`，在 macOS 上是 `/var/folders/…`，不在分享清單內。Docker 不會拒絕這種 mount —— 它會塞一個空目錄進去。接著 `npm test --silent` 找不到 `package.json`、非零離開、什麼都不印（因為 `--silent` 把 npm 自己的錯誤訊息也關掉了）。兩個各自無害的沉默疊起來，變成一個很有自信的錯誤答案。

**現況。** `probeWorkspaceMount()` 會把一個 token 寫進真正的 workspace 根目錄、mount 進容器、再讀回來比對。其他情況一律退回行程路徑，並把原因寫進 status detail。這個情境本身也是 `server/engine/isolation.test.ts` 的回歸測試。

**通則。** 前置條件不等於那個操作本身。當探測結果會用來背書一個安全性宣稱時，就讓它真的做一次並檢查結果 —— 而且本專案已經被「引擎的限制被歸因成 agent 的失敗」咬過一次（G44）。

## G49 — 「沒有發現問題」只有在真的看過時才算證據 🔴

**症狀。** SEC-00 第一次 smoke run 回報六個攻擊向量中有四個「clean」。實際上那些 payload 在做出任何一次嘗試之前就已經崩潰了。

**根因。** payload wrapper 把回報用的 helper 以 `const` 宣告在 body **之後**，所以結尾呼叫 `finish()` 的 body 撞上 temporal dead zone 直接拋錯。harness 沒收到任何回報，就把這份沉默當成通過。

**現況。** helper 移到 body 之前宣告，`uncaughtException` 與 `unhandledRejection` 都仍會送出回報，並新增兩條 threshold：payload 沒有產出可解析的回報、或中途死亡，該次重複即判定失敗。同一次執行還有另一個形狀相同的 false negative：canary 是在執行期才賦值的，而 `/proc/environ` 與 `ps -E` 回報的都是 exec 當時的環境 —— 也就是說不管 sandbox 破成什麼樣，它們都不可能看到那個值。harness 現在會帶著 canary 重新 exec 自己一次。

**通則。** 安全 harness 必須能區分「攻擊了但被擋下」和「根本沒攻擊」。要把「沒量到」判為失敗而不是通過，並且在相信綠燈之前，先確認 harness 真的偵測得到它要測的那個漏洞。

## G50 — `node:sqlite` 不是 `better-sqlite3` 🟡

**症狀。** idempotency helper 用 `db.transaction(() => …)` 包住效果，編譯不過。

**根因。** `node:sqlite` 的 `DatabaseSync` 沒有 `transaction()` helper，那是 better-sqlite3 的 API；因為 `prepare`/`run`/`get` 的介面長得一樣，很容易混淆。

**現況。** helper 明確發出 `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`，順帶讓 rollback 路徑在呼叫點就看得見。

**通則。** 去查那個模組真正的介面，而不是這個寫法出處的模組。

## G51 — 重送一次請求，就把贊助者扣了兩次款 🔴

**症狀。** DATA-01 量到：把 `POST /missions/:id/pledge` 一字不差地重送一次，會產生第二筆 pledge、第二筆 ledger、以及第二次錢包扣款。守恆仍然成立（沒有東西被創造或消滅），所以既有的每一個帳務測試都是綠的。

**根因。** 產品裡完全沒有 idempotency 機制：沒有 header、沒有 request-id 欄位、沒有 dedup 表。計畫書的門檻「one effect per idempotency key」根本沒有對象可以成立。

**現況。** `store.runIdempotent` 在與效果同一個 transaction 內寫入 key，所以重複不可能只做一半；同一個 key 用在不同請求上會被拒絕，而不是拿第一次的回應敷衍過去。前端對話框在每一次「使用者意圖」產生一個 key，並在重試之間沿用。誠實的限制由它自己的測試斷言：沒帶 header 的請求得不到保護，因為 server 無法分辨「不小心重送」和「刻意再贊助同樣金額」—— 只有 client 知道自己是哪一種。

**通則。** 守恆不變式可以全部成立，而使用者仍然被扣了兩次款。要檢查使用者在意的那個性質，不只是帳本在意的那個。

## G52 — 綠燈，但什麼都沒做 🔴

**事故。** `mirror-to-gitlab.yml` 的執行紀錄是一整排 5～16 秒的綠色勾勾。它從來沒有鏡像過任何一個 commit。`gh secret list` 在這個儲存庫回傳空的，也就是 `GITLAB_PUSH_TOKEN` 從未存在，因此上面每一次執行都走了「未設定就略過」那條路徑並以 0 結束。GitHub → GitLab → 建置 → 部署這條鏈，從來沒有因為一次推送而完整跑完；Artifact Registry 裡真的存在的那些映像檔，是有人手動建置推上去的。

**原因。** 那個略過是刻意的，理由也寫在檔案裡：「永遠紅燈的 CI 徽章會教會大家忽略 CI，所以紅色要留給真的壞掉的東西。」對一個即將被補上的缺口來說，這是好規則。當缺口一直沒補，它就變成錯的——因為那個徽章從此在每一次推送都主張一件假的事。`docs/DEPLOYMENT.md` 甚至已經寫著警告：「綠色的略過工作流程並不能證明 GitLab 收到了那個 commit」——這正是當你發現訊號在說謊、卻選擇把謊記錄下來而不是修好它時，會寫出來的那種句子。

**現況。** Project-scoped token 現已設定。最近一次完整驗證的 image rollout 是
GitHub run `31409728473` 與 GitLab pipeline `2748045554`。Workflow 現在會在
checkout 前檢查 credential，任何 event 缺少時都 fail closed；上述 push
warning／skip 已是歷史行為，不是目前契約。

**通則。** 「紅色留給真的壞掉」這條規則需要有效期限。綠燈裡的警告等於看不見；如果一份文件裡的但書是讀者和錯誤結論之間唯一的屏障，那麼有問題的是訊號本身。

## G53 — 存活探測為了一個正確的拒絕而弄垮 Pod 🟡

**事故。** `/healthz`、`/readyz` 和 `/api/bootstrap` 都呼叫 `resolveMode()`，而它在「設定了真實代理、卻沒有量測到逐次執行作業系統邊界」時會拋錯。於是在非正式叢集（依設計就沒有 Docker daemon）設定 `EXECUTION_MODE=llm`，會讓存活探測回傳 500。Kubelet 把它讀成容器已死，Pod 就開始重啟迴圈。唯一說明真正原因的地方，是一個沒有人在讀的回應內容；而 353 個通過的測試，沒有一個問過「狀態端點在被拒絕的狀態下會怎樣」。

**原因。** 一個函式同時扛了兩份對失敗要求完全相反的工作。拒絕執行對 `executeMission` 是正確答案，因為在那裡拋錯就是把執行擋下來。但對一個「存在目的就是描述伺服器」的端點來說，這是錯的答案——在那裡拋錯等於把描述本身摧毀。

**現況。** `safeResolveMode()` 回傳 `{ mode: null, error }`，三個負責描述的端點都改用它；`executeMission` 仍然呼叫會拋錯的那一版。`mode` 是 `null` 而不是 `"demo"`——回報 demo 等於把這道關卡要防的靜默降級搬進狀態端點，而且會讓 `deploy:verify` 在一個根本跑不了任何任務的叢集上亮綠燈。

**通則。** 「快速失敗」和「自我描述」不可能由同一個函式同時做到。健康檢查端點必須能撐過每一種它有能力去反對的設定。

## G54 —「跟開發者在本機跑的同一道關卡」其實不是同一道 🟡

**事故。** 在完全沒有變動的樹上連續跑兩次 `npm run check`，結果不一致：`every seeded repository card explains what would break without it` 每次失敗在不同的專案上——先是 `zxcache`，再是 `sigstore-lite`。而 GitLab 的 `test:` job 從來沒遇過這件事。

**原因。** `explainProject` 用 `openaiConfigured()` 決定產生器。開發機的 `.env` 裡有 `OPENAI_API_KEY`，所以測試會去呼叫真實的 gateway，然後對模型寫出來的雙語文字斷言最小長度。GitLab 是在 `node:22-alpine` 裡跑 `npm ci`，沒有 `.env` 也沒有 secret，因此一律走確定性的內建文案路徑。`.gitlab-ci.yml` 裡那句「跟開發者在本機跑的同一道關卡」，在沒有人會去檢查的那個方向上是假的：本機那道其實**更嚴格而且不確定**，真正的缺陷和「模型今天話比較少」在畫面上長得一模一樣。

**現況。** `server/landing.test.ts` 在模組載入時清掉 `env.openaiApiKey` 與解釋快取，把所有 `explainProject` 斷言固定在內建文案上。那些斷言本來就是在講這個儲存庫自己出貨、自己能修的文字。模型輸出有它自己的不變式——來源標籤，以及禁止產生任何數字——那些在該斷言的地方另外斷言。

**通則。** 會打到真實模型的測試，斷言的是任何審閱者都修不了的東西。在信任一道關卡之前，先確認它在兩邊是用同樣的方式跑——包括「本機那道才是比較嚴格的那一道」這種情況。

## G55 — 受保護端點讓成功交付看起來像失敗 🟠

**事故。** GitLab 已測試並發布不可變 image、Argo CD 也已部署，GitHub mirror workflow 卻顯示紅燈。失敗行指向 GitLab 的部署後 verifier，不是實際失敗的交付步驟。

**原因。** Workflow 把 shared runner 的 HTTP observation 當成權威證據，但 Cloud Armor 本來就會以 `403 Forbidden` 拒絕該 runner。Build delivery 與 public endpoint authorization 的負責人和 trust boundary 不同。

**現況。** GitHub 會等待 candidate 的 GitLab `test` 與 `build:image`，成功後才
晉級 GitLab main。舊 GitLab endpoint verifier 與 release jobs 已移除。Argo 的
叢集內 PostSync hook 負責 readiness 與 exact-build verification；public metric
則獨立證明 route 實際提供的 bytes。不會只為 CI 綠燈就削弱 policy。

**通則。** Verifier 只有在「有權觀察目標」且「被指派負責該結果」時才有權威。應拆開交付與部署證據，不可讓一個無法存取的探針把成功工作變紅。

## G56 — Runner 接受 job，不代表它的 pod 已開始 🟠

**事故。** `build:image` 一直 pending，並回報 `0/8 nodes are available: Insufficient cpu`。之後 `test` 整段 20 分鐘 observer window 都顯示 running，`build:image` 維持 created，但真正有用的 trace 尚未開始。

**原因。** GitLab Kubernetes executor 在 runner 接受 job 時就會標 running，此時 job pod 不一定已排程。Build、helper、Docker-in-Docker service 的預設 CPU request 大於 shared node 可用容量；相同差異也會影響較輕的 test pod。

**現況。** Test pod request `250m` 加 `50m` helper。Pipeline `2747980634`
證明 build pod 原本合計 `800m`，即使 test 於 4分06秒完成，仍在完整 18 分鐘
邊界內無法放進八個節點中的任何一個。Build／helper／dind requests 已改為
`100m`／`25m`／`125m`（合計 250m），且不設 CPU limit，Docker 仍可 burst。
之後 pipeline `2748199303` 更證明 shared capacity 可能低到連已受限的 300m test
pod 都無法排進八個節點。Observer timeout 會同時印 test 與 build trace；
repository YAML 無法憑空製造 cluster capacity。

**通則。** Queued、runner accepted、pod scheduled、script started 是不同狀態。只有 scheduler 證據指出受限資源後才調 request，而且只調到 workload 所需的窄範圍。

## G57 — Desired state 不可引用仍在建置中的 artifact 🟠

**事故。** 每次 push 都讓 Argo CD 在 GitLab pipeline 的 7～9 分鐘內看起來像
卡住。GitLab `main` 已包含新的 overlay tag，但不可變 image 尚不存在。PreSync
雖保住舊 Pod，Argo 仍必須等待；image 發布後，kubelet pull backoff 還可能增加
額外延遲。

**原因。** 鏡像與晉級是同一次寫入。GitHub 在 CI 證明 artifact prerequisite
之前，就直接推到 Argo 觀察的 branch。CI、registry 與 GitOps 各自都正常，錯誤
的發布順序卻讓正常建置看起來和 rollout 卡死一樣。

**現況。** GitHub 先 fast-forward `delivery-candidate`。GitLab 在該分支測試並
發布不可變 image，之後 GitHub 才以非 force 方式 fast-forward GitLab `main`，
並略過重複 CI。新 revision 會取消已被取代的 candidate。Argo 保留 PreSync
作為 defense in depth；叢集內 PostSync hook 不穿過 Cloud Armor，也能驗證
readiness 與正確 version／source-tree identity。

**通則。** 先發布 prerequisites，再發布 desired state。Controller 應只看見
可以立刻執行的 revision；staging 與 promotion 必須是分開、原子且帶證據的步驟。

## G58 — 遲到的 delivery observer 可能只是揭露較早的 source failure 🟠

**事故。** Source commit `99f2205` 等 GitHub hosted runner 將近兩小時；取得
runner 後 workflow 很快失敗，看起來又像 runner 或部署事故。但 GitLab pipeline
`2749163703` 早已執行 test，並在四個 I18N-01 gate 失敗：繁中漏掉 seeded-data
限定詞、三個 component 新增 inline locale branches 與 11 段 inline translation，
另有五個 dictionary key 失去 call site。

**原因。** 首頁改版的新文案繞過 locale dictionaries，移除舊 call site 時也沒有
同步移除 keys。GitHub observer 與 GitLab candidate pipeline 使用不同 scheduler；
observer 延遲不會造成 candidate 的 deterministic source failure。

**現況。** `99f2205` 保留為失敗事故樣本。本次修正把 `Hero.tsx`、
`Marketplace.tsx`、`MissionDetail.tsx` 的 campaign-D 文案移回兩份 dictionaries、
補回 seeded 限定詞並移除五個 dead keys。目前 source 為 21/21、每語系 634 keys、
121 個 security-marked keys。這只證明 source gate；delivery、Argo 與 serving
identity 仍須分別取得證據。

**通則。** 雙語文案是受測試的行為與真實性邊界。新可見文字必須進兩份
dictionaries，語系選擇應走 `t(...)`；changelog version 也只代表 source candidate，
要等 test、不可變 image、promotion、Argo 與 serving identity 各自提供證據後，
才能稱為已部署。


## G59 — 自我更新驗證需要独立保留 image 與暫存快取

首次候選已通過請求／server 檢查，但 Vite 嘗試寫入唯讀依賴。只給 config 快取有界 tmpfs，不開放原始碼／測試寫入。共用 E2E tag 後來被替換，舊 digest 消失；應保留獨立 verifier tag 並固定 digest。驗證基礎設施缺失必須讓候選失敗，不能套用。明確更新 verifier 時也撤銷待處理 epoch。見 [自我更新手冊](SELF-UPDATE.zh-TW.md)。

## G60 — Langfuse 接受 ingestion 不等於已查驗入庫

Langfuse v4 接受 OTLP spans，但已移除舊 `/api/public/traces` 讀取 API；此端點回傳 404 不代表資料遺失。應透過 Observations API v2，以 trace ID 與有限時間範圍查詢；明確要求 `model,usage` 欄位，因為預設不回傳。本機真實雙角色探針已查回八筆觀察與供應商用量。固定監控映像，未知用量維持缺省。詳見 [Agent 操作手冊](AGENT-OPERATIONS.zh-TW.md)。

## G61 — 回收 Worker 鎖不等於復原啟用

目錄鎖可能殘留於 SIGKILL 之後；檢查 PID 再刪除也可能與另一 worker 競爭。本機 agents 改用作業系統釋放的 SQLite 寫入鎖。啟用可能在指標切換後、煙霧測試完成前死亡，所以下次控制操作前須檢查 journal 與收據。沒有完成收據時會先回滾，再確認 Demo 凍結。不要刪除作用中的 SQLite 鎖檔，否則會產生不同鎖識別。實際子程序終止測試涵蓋鎖回收與中斷啟用復原。

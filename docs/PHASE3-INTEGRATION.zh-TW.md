# 電腦 A / Phase 3 整合證據

[English](PHASE3-INTEGRATION.md)

日期：2026-09-12。整合分支：`codex/dev-spec-integration`。
Source version：`0.7.12`。本次只做本機原始碼整合；沒有 push、部署、上游 PR、
合併、套件發布或 live provider 驗證。

上述記錄指原始整合 commit `08bead6`。使用者後續要求 push 並合併 main；以下補充
該次工作，保留原有測試證據。

## Main 合併後續 — source 0.7.17

- 已將 `codex/dev-spec-integration` 的 `08bead6` 推送，再與 delivery main
  `7d9fbba` 合併。保留 Cloudflare gateway、限定 egress、Responses probe、監控、
  兩小時 idle 與強制 cutoff。
- 解決共享 environment、README、development、version、changelog 衝突。保留
  最佳化 CI build 與所有產品測試 projects，Docker image 補入 root fixtures，保存
  interactive reports。
- Production 原本缺少兩個 fixture 目錄與 Git，已補齊，deployment receipt/smoke
  改為 `phase3-integrated` 與明確 `bundled-fixtures-only` 邊界。Container 產品建議
  保持已標示 fallback，不將 Responses credential 重用於 Chat Completions；既有
  cloud egress 仍不包含 GitHub metadata 匯入。
- 驗證：Docker CI typecheck/build/version、**99/99 server tests**、**38/38
  互動 journeys**（56.8 秒）；125-spec lint、4 linter tests、8 gateway tests。
  Production image smoke 使用實際 entrypoint 且無外部網路：duration 5/5 →
  approved、retry 3/3 → needs_review，reset 移除新任務。見
  `scripts/verify-production-runtime.mjs`。
- 原有 40 張視覺差異仍待審核。Live CI、deployment 與 serving SHA 證據獨立於本機
  merge checks。

```bash
E2E_CHECK_APPLICATION=1 bash scripts/playwright-docker.sh
BUILDX_CONFIG=/tmp/nxtcommit-buildx docker build --load -f deploy/node/Dockerfile -t nxtcommit-main-merge:0.7.17 .
docker run --rm --init --network=none --cap-drop=ALL -i nxtcommit-main-merge:0.7.17 node --input-type=module < scripts/verify-production-runtime.mjs
```

## 合併記錄

從共同 main 祖先 `d376137` 建立整合分支，透過 A 納入共享基礎，依要求採用
A → B → C 順序。

| 切片 | 來源分支與 tip | Merge commit | 整合責任 |
| --- | --- | --- | --- |
| A | `dev/computer-a` / `24b211f` | `9325ee1` | Home、社群、shell、全域 snapshots、中央 registry |
| B | `origin/dev/computer-b` / `e6057bd` | `9954d8a` | Lifecycle、募資、ledger、fixture engine、queue 與 recovery |
| C | `origin/dev/computer-c` / `ec95912` | `8b15b99` | Authoring capabilities、輔助建議、evidence 與本機審核 |

合併 C 前已通過 B targeted tests、typecheck 與 YAML lint。各切片 handoff
保留為歷史記錄；其中尚未整合的描述以本文件目前 wiring 與結果為準。

## Runtime authority 與修復的邊界

- `server/services/slice-integration.ts` 將 C 的 typed repository port 接到 B
  lifecycle。建立任務只寫一份 mission；C 不直接查 B tables。A 的 Home tables
  是該 mission 與 pledges 的可重建 projection；歷史 Home seeds 保留 demo
  provenance，沒有可執行 workspace。
- 由 server analysis capability 決定 fixture 資格。只有內附 `duration-demo`
  與 `retry-queue` 可執行；client 修改與 GitHub metadata 不授予執行權。Engine
  複製固定本機輸入，掌管 test commands、protected-file checks、diff 與 reviewability。
- 新的 duration 任務實測 baseline 2/2、final 5/5 tests，保存 `parser.js` /
  `compound.test.mjs` diff。Retry-queue fixture 則為 baseline 2/2、final 3/3。
  腳本推理仍標為 `demo`，測試與 diff 觀測標為 `engine`；這不代表具備任意程式隔離。
- C 讀取 B 當前 run evidence 與 deterministic gate。核准與要求修改綁定該 run；
  retry 產生新 run、記錄已遮罩的 review comment，舊 run 不再接受決策。
  `review-demo` seed 仍是明確標示的 authored demo 例外。
- 全域 SSE 更新 marketplace、profile 與 wallet。Queue worker 寫入 heartbeat，
  web process 將持久化的 worker 狀態送到 SSE；readiness 回報實際 inline/worker
  可用性。Reset 排空工作、清除所有切片與 capability epoch、還原 fixtures 後恢復服務。
- Maintainer 與 provider guide 跟隨可見產品控制項抵達 terminal review；provider
  review 保持唯讀。換頁會取消過期 dispatch response；首次 bootstrap 失敗保留提示，
  等待使用者 retry。
  專案說明以雙語內容、來源標示、影響與時間軸呈現，不再直接顯示 transport JSON。

## 跨切片 outcome ledger

以下 browser mutation 全由 Docker 中真實 build 的可見控制項觸發；HTTP reads
補充 UI assertions 的持久化證據。Fault fixtures 與外部 model/GitHub transport
使用 deterministic 輸入，不代表 live 外部服務驗證。

| Scenario / specs | Owner | Runtime authority 與 wiring | Contract / outcome tests | 時間界限 | Browser 證據 | 狀態 |
| --- | --- | --- | --- | --- | --- | --- |
| `mission-creation-trusts-server-snapshots`；`api.mission-create`、`page.new-mission`、`page.marketplace` | A+C | Capability → C port → B mission → A read model | `server/phase3-integration.test.ts`：建立冪等、拒絕 client 偽造、market 數值有效、不重複建立 C mission | HTTP terminal 5 秒 | `e2e/integration.e2e.spec.ts`：maintainer 建立與另一分頁 marketplace | browser-verified |
| `execute-success-produces-reviewable-evidence`；`api.mission-execute`、`page.mission-detail`、`page.execution-room` | A+B+C | UI pledge → ledger → fixture engine → persisted dossier → C review | Integration test 實測 2 → 5 tests、有界 diff、engine provenance 與 `endedAt`；B engine/gate tests | UI terminal 20 秒 | Maintainer/provider 募資 → terminal engine evidence → review | browser-verified |
| `review-keeps-human-boundary`；`api.run-review`、`page.review` | B+C | 當前 run gate → atomic local decision → B status 與 A receipt | Integration test 拒絕舊 run 核准；review gate 與 advisory tests | Playwright 30 秒 | 要求修改 → 新 owned run → 核准 → reload | browser-verified |
| `page.contributor-profile`、`persistence.compute-ledger` | A+B | Persisted pledges/settlements → profile 與 wallet snapshots | 重新開啟 SQLite 保留核准、零 reservation、兩次 run 恰有兩筆 consumption | HTTP terminal 5 秒 | Maintainer profile 顯示新 pledge 與本機核准 receipt | browser-verified |
| `api.demo-reset`、`page.guided-demo` | A+B+C | 共用 reset harness → 所有 slice graph 與 capability epoch | Integration tests 使舊 capability 失效、移除新任務、還原 B/C seeds | Playwright 30 秒 | Guide reset/start、跨分頁移除任務、provider exit 與完成狀態 | browser-verified |
| `execute-dispatch-union`；recovery 與 run-request policies | B+A | Dispatch → persistent queue → worker → fenced settlement | `server/mission-queue-outcome.test.ts` 驗證獨立 processes；`server/rec01-recovery.test.ts`、`server/pd02-concurrency.test.ts`、engine tests | B recovery bounds；UI 20 秒 | `e2e/mission-execution.e2e.spec.ts`：同 process queue worker terminal、failure/retry、reconnect、stale SSE/navigation | browser-verified |
| `api.repository-analysis`；metadata 執行邊界 | C+B | 受控 public metadata → capability → 不可執行的 B mission | 偽造 fixture 欄位不能改變 authority；執行拒絕且沒有 run | HTTP 5 秒 | `e2e/computer-c.e2e.spec.ts`：public metadata retry、scope advice、不可執行的 publication | browser-verified |

公開匯入 probe 固定為 `https://github.com/PrimeIntellect-ai/prime-agent`；本次新增
integration tests 使用它的受控回應，不 clone 或執行該 repository。

## Page coverage 與重現方式

| Pages | Docker test file | 覆蓋 outcomes |
| --- | --- | --- |
| Home、marketplace、contributor profile、guided demo、route fallbacks | `e2e/product.e2e.spec.ts`、`e2e/foundation.spec.ts` | Discovery、filters、map、wall/vote persistence、reset/retry、empty/error/loading、reconnect、重複換頁、mobile 與 locale |
| Mission detail、execution room | `e2e/mission-execution.e2e.spec.ts` | 募資、lost-response 冪等 retry、inline/queue terminal evidence、refusal、失敗重試、stale frame/navigation 拒絕 |
| New mission、review、design concepts | `e2e/computer-c.e2e.spec.ts` | Authoring、advisory 邊界、capability reset、seeded review 標示、persisted decisions、跨分頁 SSE、error recovery、無 API 寫入的 concept 互動 |
| 整合 maintainer 與 provider 流程 | `e2e/integration.e2e.spec.ts` | 三條使用 fresh engine evidence 的完整 journey，包含 request-changes/retry 與 reset |

```bash
UV_CACHE_DIR=/tmp/commoncommit-uv-cache bash scripts/phase4-gate.sh
# 僅功能 browser suite（foundation + 全部 product journeys）：
npm run test:e2e
# 全部 A/B/C approved 截圖比較：
npm run test:visual
```

Docker wrapper 固定 Playwright `1.56.1` / Ubuntu Noble Chromium、單一 worker、
locale `en`、timezone `Asia/Taipei` 與 reduced motion。C fault fixtures 使用4201，
避開 B 的4191–4194。報告是本機產物，位於 `test-results/docker/interactive/`
與 `test-results/docker/visual-all/`。

## 驗證與剩餘邊界

| 檢查 | 結果 |
| --- | --- |
| YAML lint | PASS：125 specs，零 contract error 與缺少的 test file |
| Spec linter unit tests | PASS：4 tests |
| `npm run check` | PASS：前後端 typecheck、96 tests，零 TODO/skipped、production build，包含 i18n parity |
| Built-server C smoke | PASS：整合後 authoring contract、authored-seed review persistence 與 reset |
| Offline authoring evaluation | PASS：五筆 dry-run，沒有 model promotion 或 live call |
| Docker functional E2E | PASS：38/38 journeys，58.5 秒，零 skipped 或 flaky tests |
| Docker approved visual comparisons | FAIL：40/40 已比較且有差異（A 13、B 13、C 14），106.6 秒；皆有 actual/expected/diff PNG，沒有前置失敗 |
| `bash scripts/phase4-gate.sh` | 僅 visual gate 失敗，之前的功能檢查皆通過 |
| `make check-version`、`git diff --check` | PASS |

三個切片原本就已記錄 approved PNG mismatch，本次保留全部原圖。功能完成不等於
視覺核准或 Phase 4 完成。目前 review YAML 要求 measured evidence 與 diff 在 AI
advice 前，舊 review PNG 的順序不同；C handoff 已記錄此衝突。任何 approved
reference 變更都需要先由人工審核 candidate screenshot。
Spec/fixture ID、approved 原圖與本機比較產物見 [40 張 baseline 審核表](PHASE3-VISUAL-REVIEW.zh-TW.md)。
與共同祖先的 diff 確認 `e2e/golden/` 沒有任何變更。

Optional assistance 與 trace export 已有受控 transport tests；本次沒有 live
provider/Langfuse 驗證。這些 journeys 不包含已認證 maintainer、付款、上游 GitHub
寫入或部署。未使用的 Phase 1 `FoundationPage` 無法從整合 router 抵達，不列入產品頁。

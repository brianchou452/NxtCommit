# 電腦 C／Phase 2 交接

[English](PHASE2-C.md)

分支：`dev/computer-c`。起點：`32f8b28`。Source version：`0.7.11`。
狀態：**原始碼已接線、12 條 Docker journey 與非瀏覽器檢查通過；尚未 Phase 2 verified**。

使用者已授權 C 必要的中央接線，也選擇依現行 YAML 排列 review，保留舊
approved golden，待新截圖完成後人工審核。沒有修改任何 approved 圖片。
Docker Desktop 需要公司組織登入；依使用者要求，已安裝並啟動獨立 Colima Docker，引擎為 ARM64、Docker 29.5.2，未修改 Desktop 管理設定。所有瀏覽器測試均在 Docker 內執行，沒有使用 host Playwright。

## 實作與 ownership

- `server/authoring/services.ts` 組裝 capability、本機 persistence、選用
  model／observation transport 與 evidence reader。Reset epoch 拒絕舊請求
  的延遲結果、清除 capability 並恢復 seed。
- `server/routes/authoring.ts` 接上分析、建議、生成、評論、建立、回饋、
  credential validation 與 project explanation。Capability 最多 30 分鐘
  到期，只信任 server snapshot，重複建立回傳同一 persisted mission。
  GitHub 只讀 metadata，每次讀五筆 issue／PR 再排除 PR。
- `server/persistence/authoring-review.ts` 管理 C 的 authored mission、review
  record 與獨立標示的 demo reader；C service assembly 安裝 migration 30。
  不直接 query B 的 SQLite tables。
- `server/domain/reviewability.ts` 以量測過的 tests、diff、integrity 判定
  reviewability。`AuthoringOptions.evidence` 與 `integrityForRun` 接收 B
  trusted adapter，缺值或失敗皆拒絕。預設 `review-demo` 是 authored-seed
  本機決策例外，不能證明新的 engine success。Comment 有長度限制並先遮罩。
- `server/routes/review.ts` 提供 C mission／evidence fallback、有限 SSE、
  選用 explanation／shadow 與 atomic local decisions；B route module 仍在
  registry 前方。
- `server/routes/operations.ts` 提供 liveness、DB／worker readiness、有限
  metrics；`AppOptions.operations` 接收 B heartbeat／count probe。沒有
  實際 worker 時，startup 仍拒絕 queue dispatch。
- New Mission、Review、DesignConcepts 與 C components 已接線。
  `AuthoredMission.tsx` 是本機建立收據，不是 B 的 funding／execution 頁面。
  Concepts 用独立 shell、不呼叫 product API；locale fragment 已引入兩份
  central dictionary。

`server/authoring/fixture` 是新編寫並從檔案量測的 fixture，不是從舊 PNG
數字反推。預設 review seed 沒有 experiments／gates，量測值保持 unknown；
其 diff 與 criterion 文字不能作為引擎已執行的證明。

## 規格與測試對應

| Spec 群 | Runtime authority | 證據 |
| --- | --- | --- |
| `domain.model-assistance`、`policy.model-assistance` | assistance／campaign | Controlled model transport、invalid output fallback、遮罩與 deterministic estimate |
| `domain.execution-evidence`、`domain.review-decision`、reviewability／provenance policies | domain gate、service、repository | 拒絕 gate、trusted reader contract、seed labels、本機決策 persistence |
| `persistence.capability-store` | capability repository | Expiry、eviction、reset、snapshot isolation、writer retry、idempotency |
| `persistence.llm-observability`、`policy.observability` | observations／assistance／evaluations | 有限 trace／score、feature-bound feedback、export failure、offline evaluation |
| repository-analysis／issue-assistant API | authoring routes | `analysis-preserves-observation-boundary`、`assistant-stays-issue-bound` |
| campaign-generation／campaign-critique／mission-create API | routes 與 capability | generator label、advisory nonmutation、server snapshot 與重複建立 |
| ai-feedback／llm-validation／project-explanation API | assistance 與 routes | Bounded feedback、nonsecret validation、provenance fallback |
| run-review／shadow-review／run-evidence-explanation API | review routes | Local human boundary、advisory 無權限、evidence 不改寫 |
| health／readiness／metrics API、delivery policy | operations 與版本 registry | Liveness、DB／heartbeat、有限 labels、版本一致性 |
| repository-analyzer／campaign-authoring、`page.new-mission` | New Mission 與 CampaignAuthoring | 4 條 Docker journey 已定義，**Docker 通過** |
| dossier／diff／review-controls、`page.review` | Review 與 components | SSR 通過；3 條 Docker journey 已定義，**Docker 通過** |
| design-concept-shell、`page.design-concepts` | 獨立 DesignConcepts | 導覽／語言／mock backing／無 API journey 已定義，**Docker 通過** |

API scenario 位於 `server/spec-tests/{authoring,review,operations}.scenarios.ts`
與 `server/test-support/authoring.ts`。C page／component 註解指向
`e2e/computer-c.e2e.spec.ts`；註解、SSR 或 API 測試都不代表 browser 完成。

## 已檢視的 visual reference

下列 baseline 保持 `approved`，capture／comparison 定義位於
`e2e/computer-c.visual.spec.ts`，已產生全部 14 張候選截圖，14 個比較均與保留的 approved PNG 不同；這些是視覺差異，並非瀏覽器啟動失敗。見[候選圖審核](PHASE2-C-VISUAL-REVIEW.zh-TW.md)。

| Baseline ID | 實際檢視的 composition／geometry／anchors |
| --- | --- |
| `new-mission-source-step` | 置中窄 wizard、四步驟列、雙 source card、右側主操作 |
| `new-mission-draft-step` | 長白色草稿卡、上方 critic、密集 story／criteria／estimate、下方建立操作 |
| `repository-analyzer-results` | 寬 repository panel、量測數字、一張密集 issue card 與 next action |
| `campaign-authoring-draft` | 獨立 critic、generator badge、雙欄 story、密集 compute breakdown |
| `review-dossier-ready` | 左主 evidence stack、右 decision sidebar；舊 AI panel 在 diff 前，與 YAML 衝突 |
| `verification-dossier-ready` | 小型 tinted summary、demo badge、六個數字 tile；authored 空實驗不能當 fresh observation |
| `diff-viewer-ready` | 寬 disclosure、首檔展開、增刪行背景、次檔收合 |
| `review-controls-maintainer` | 窄決策卡、amber boundary、comment 與堆疊操作 |
| `review-controls-provider-read-only` | 小型唯讀 boundary，沒有決策操作 |
| `design-concept-editorial` | 獨立黑色概念列、大雙欄 hero、lime poster 與硬陰影、三張卡及 flow |
| `design-concept-kickstarter` | Serif hero、暖色 canvas、mint feature 與三張圓角卡 |
| `design-concept-network` | 大 sans hero、深色點狀 network panel、mint 數據列、卡片與 flow |
| `design-concept-hybrid` | 粗體 hero、點狀 network、pill 操作、卡片與 disclosure footer |
| `design-concept-hybrid-campaign` | 很長的 campaign narrative、右側 backing、evidence／milestone／community；EN capture metadata 下的 PNG 為中文 |

實作依可用 YAML 語意契約，未宣稱與舊 authored layout／content 像素相同；
fixture 資料與 shell identity 也不同。必須先產生候選圖並經使用者審核，
才能更新 approved baseline，不能用 snapshot-update 隱藏差異。

## 驗證與剩餘工作

| 命令 | 結果 |
| --- | --- |
| `uv run python scripts/lint_specs.py` | PASS：125 specs、0 contract errors、0 missing test files |
| `uv run python -m unittest discover -s scripts -p '*_test.py'` | PASS：4 個 linter tests |
| `npm run check` | PASS：前後端 typecheck、46 tests、production build；保留 54 個 A／B TODO |
| `node scripts/verify-computer-c-runtime.mjs` | PASS：build 後 server 完成 analysis → draft → persisted mission；seed review → request_changes；reset 恢復 |
| `node --import tsx scripts/evaluate-authoring.ts` | PASS：5 個 offline cases，沒有 live call／promotion |
| `npm run check-version` | PASS：source `0.7.11`，tooling `0.1.0` |
| `git diff --check` | PASS |
| 公開 `PrimeIntellect-ai/prime-agent` probe | PASS：metadata 與 immutable commit；有限視窗內 0 筆非 PR issue；沒有 clone／tests／execution |
| `bash scripts/playwright-docker.sh --project=computer-c` | PASS：Colima Docker 內 8 條 C journeys 通過 |
| `bash scripts/playwright-docker.sh --project=computer-c-visual` | FAIL：14 個視覺差異；14 張候選 PNG 已產生，等待審核 |

Foundation 回歸 4 條亦通過；合併命令 `DOCKER_CONTEXT=colima BUILDX_CONFIG=/tmp/nxtcommit-colima-buildx bash scripts/playwright-docker.sh --project=foundation --project=computer-c` 共 12 passed。已修正 C 頁面缺少可聚焦 main，以及 loading／reset、mock backing 同時存在多個 status 的測試定位歧義。

本機 log：`test-results/computer-c-nonbrowser/`。Model／trace 使用受控
transport 測試，未宣稱真實 provider 或外部 Langfuse 驗證。
選用 server 設定位於 `.env.example`；evaluation 預設 offline，即使有
credential 也不自動呼叫模型。`--live` 需要明確意圖與 model 設定。

要完成 C verification，需人工審核 14 張候選圖、修正要求的視覺變更，僅更新明確核准的 baseline，再重跑視覺比較。Runtime 操作：`colima start`、`docker context use colima`；停止使用 `colima stop`。

A／B 整合需維持單一 mission authority：將 B lifecycle 接到 C repository
port，或整合時提供共同 repository，不能另建一份 created mission。
B 需提供實際 evidence reader、量測 integrity 與 worker probe。
C synthetic adapter test 不能取代 B fresh engine-run → review outcome。

```yaml
slice: authoring-ai-review-operations
base_commit: 32f8b28
owner: C
state: functional-e2e-passed-visual-review-pending
central_integration_required:
  - B mission lifecycle/evidence/integrity/worker adapters for fresh execution outcomes
known_incomplete_behavior:
  - 14 approved visual comparisons fail; candidate review is outstanding
  - The current checkout has no B runner or funding lifecycle
  - Live provider and external observability validation have not been performed
```

# 電腦 A／Phase 1 共用骨架

[English](PHASE1-FOUNDATION.md)

起點為 `origin/main` 的 `c21d4ed`，拉取時保留所有本機修改。這是從規格重建的
checkpoint，不是完整產品或部署。匯入的架構、功能與維運文件也包含先前完整應用
的能力；此 checkpoint 實際完成範圍以下列清單為準。

## 共用型別與 ownership

前後端皆為 TypeScript，先建立 browser-safe 的 `shared/types.ts`：localized text、
API error、provenance、bootstrap／capability／HTTP response，以及 `RunSummary`、
`ExecutionEvidence`、`RunArtifact`、`ReviewabilityResult`、`ReviewDecision`、`EventEnvelope`。

Terminal run 必須有 `endedAt`，running 不得有此欄位。`stalled` 僅屬 mission。
Linter 防止 domain 與 API run 狀態漂移；未知 test measurement 保持 optional，
非 engine event 不可 verified。

B 提供同步 SQLite `ExecutionEvidenceReader`，C 只使用此 port，不讀 B 的 tables。
共用 event payload 維持 bounded JSON，具體 variant 與 runtime redaction 由 B 負責。
若改變同步介面，須作為共用契約變更處理。

A 擁有 package／lock、TypeScript／Vite config、shared exports、中央 router、
migration registry、React router、i18n、BDD 入口與 Playwright config。
B/C 新增自己的模組，中央接線交由 A。

## 實際 runtime

| 責任 | 入口 | 狀態 |
| --- | --- | --- |
| HTTP lifecycle 與安全 JSON error | `server/app.ts`、`server/index.ts` | 已實作 |
| Bootstrap | `server/routes/home.ts` | 真正 local persona snapshot，execution 明確拒絕 |
| Health／SQLite readiness | `server/routes/operations.ts` | 僅基礎，未安裝 queue／missions |
| SQLite migration／nested transaction | `server/persistence/database.ts` | 支援 file reopen 與 memory 隔離 |
| Reset coordination | `server/persistence/reset.ts` | 先停止工作、反向清除、正向 seed、原子回滾 |
| Seed | `server/persistence/seed.ts` | 只有 foundation persona，非完整 Home graph |
| Shell | `src/components/ApplicationShell.tsx` | locale、導覽、refusal、retry、wallet、persona、reset |
| Routes | `src/router.tsx` | 所有規格路徑皆為明示 Phase 1 placeholder |
| Evidence services | `server/services/context.ts` | 僅擴充 port，未安裝 runner |

只註冊 `/api/bootstrap`、`/api/demo/reset`、`/healthz`、`/readyz`，其他 API 回 404。
尚無 runner、model call、queue worker、外部 repository execution、SSE 或產品 mission lifecycle。
包含 demo 在內，任何 mode 都不會在 B 安裝 runner 前宣稱可執行，也不消耗 model secret。

Reset participant 必須先 abort／drain，parent 先註冊，clear 反向、seed 正向，
全程在同一同步 SQLite transaction。Phase 2 須整合完整 fixture graph，並阻止 reset
期間新增 mutation／worker。不可使用 async clear／seed callback。

## 開發與驗證

使用 Node 24.x、npm、uv 與 Docker。Python 僅供 YAML 工具，前後端都不是 Python。

```bash
npm ci
uv sync --locked
npm run dev
```

可選 `.env` 不覆蓋既有 environment。骨架支援 `HOST`、`PORT`、`VAR_DIR`、
`EXECUTION_MODE` 與 inline `RUN_DISPATCH_MODE`；queue 設定會拒絕啟動。
本機 build 啟動使用 `npm run build && npm start`。

```bash
npm run check
npm run lint:spec
npm run test:spec-tools
make check-version
npm run test:e2e
npm run test:visual
git diff --check
```

Playwright 只使用 Docker。wrapper 固定 image，使用隔離 state directory 與 server-owned
error／reset fixture，輸出在 `test-results/docker/`。visual 指令僅比較 Phase 1 shell，
後續分工必須擴充各自頁面的測試。

Makefile、nonprod image tag 與雙語 changelog 版本為 `0.7.10`；private npm／Python
版本獨立為 `0.1.0`。nonprod kustomization 沒有 resources，只記錄版本，不能部署。
未 push image 或進行 deployment。

## 證據與交付

| Spec／責任 | 測試結果範圍 |
| --- | --- |
| `api.bootstrap`／`bootstrap-reports-server-resolved-execution-state` | `server/api-bootstrap.bdd.test.ts`：所有 configured mode 都呈現真實拒絕、local persona、無 credential 欄位 |
| lifecycle／evidence／provenance 共用契約 | `server/foundation.test.ts`：terminal timestamp、budget 與 engine-only verification |
| Persistence 基礎 | durability、migration failure、nested rollback、FK reset 順序、合併重複請求與 retry |
| localization policies | parity／fallback test；Docker 實際切換與 reload 保留 |
| `component.application-shell`／`shell-preserves-local-demo-and-locale-boundaries` | Docker 操作 profile、refusal、skip link、error／retry、reset 後 persisted state |
| `design-system.nxtcommit` | tokens 與 global accessibility styles；visual 比較獨立報告 |

四個中央 BDD 入口已建立，product cases 分 community（A）、mission（B）、
authoring／review／operations（C）。未完成 scenario 保留明確 TODO／skip，不充當通過測試。
Schema lint 只驗證規格、引用與檔案存在，不代表所有 scenario 已實作。

Shell 開發前已查看 approved `application-shell-desktop`：1440×103 單列 header，
左 identity、中間導覽且 Demo active、右 mode／locale／wallet／persona，密度較高。
PNG 使用舊版無底色鏈狀 logo、resolved demo、100,000 點 persona；目前 YAML 明確指定
深色底 canonical SVG。使用者已授權依 YAML 實作並保留原 golden。骨架目前是 runner
unavailable、10,000 點 persona，這些也屬 fixture 差異。truth strip 位於 header 下方，
不在 header-only capture 內。沒有更新 PNG，也不宣稱像素相符。

交付驗證：125 份 YAML lint、14 個 server/shared/i18n 測試、4 個 linter regression
測試與 4 條 Docker foundation journey 通過；另有 77 個 server TODO 與 2 個 product
browser skip 留待後續 phase。前後端 typecheck、production build 與版本檢查通過。
Shell 比較有 13,673 pixels 差異（回報 ratio 0.10），golden 未修改；報告分別保存在
`test-results/docker/foundation/` 與 `test-results/docker/visual/`。

Phase 2 尚需 Home/community graph、mission/funding/execution、authoring/model assistance、
review/operations、SSE、完整產品 journey 與各自 visual baselines。匯入後 root maintainer
`SKILL.md` 仍不存在；本次依 AGENTS.md 與 yaml-spec-to-code skill，並參考已匯入的維護者
繁中說明及各主題 canonical 文件。

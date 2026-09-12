# 電腦 A / Phase 2：Home 與社群

[English](PHASE2-COMPUTER-A.md)

分支：`dev/computer-a`。責任範圍依
`skills/yaml-spec-to-code/references/three-computer-phases.md`。
本次是本機實作，不代表部署或完整 Phase 2 verified。Phase 1 文件是歷史 checkpoint，
不是目前功能清單。

## Runtime 與 provenance

- `server/persistence/home.ts` 負責 migration、16 個 campaign／20 個城市的固定 seed
  及 transaction projection。`home_*` tables 持久化 projects、missions、contributors、
  pledges、achievements、comments 與 category votes。
- `server/routes/home.ts` 提供 bootstrap、impact、marketplace、stream、reset；
  `server/routes/community.ts` 提供 contributor profile、MVP list/vote 與 wall。
- `server/services/global-stream.ts` 廣播資料失效訊號。瀏覽器共用一條 EventSource，忽略
  heartbeat，在 mission update／open 時重抓 REST，失敗後 1.5 秒重連。卸載取消 request，
  過期回應不會覆蓋新快照。
- `server/app.ts` 註冊 Home reset participant；先清除子資料，再清除 persona，重建時先父後子。
  Drain 期間非 reset mutation 回傳 503；重設失敗 rollback，成功後才廣播 invalidation。
- 留言限制 280 個 Unicode code points，React escape，且在**儲存前**遮罩秘密。
  Author、role、time 由伺服器指定。Pattern redaction 支援常見明文 key／token／password，
  不保證處理任意編碼或所有秘密格式。SQLite 限制目前 persona 每類別只能投一次。
- 數量由本機 pledges 與 mission projection 推導。Seed 歷史、城市、文案、進度與成就均
  標示 demo。未知 provider consumption、refunds、外部 adoption 保持缺值；不捏造
  fixture engine run 或上游效果，bootstrap 繼續誠實回報 execution unavailable。

## Spec 與結果追蹤

| Specs | Runtime authority | 可執行證據 |
| --- | --- | --- |
| `domain.home-impact`、`marketplace`、`provenance`；`persistence.home-demo-seed`、`home-read-model`、`community-store` | `shared/home*.ts`、`server/persistence/home.ts` | `home-behavior.ts` 驗證資料變更影響聚合、去重／排序／funding gate、14 天 trend、20 個正數合法 beacon、transaction reset；`community-behavior.ts` 驗證 durable reopen、收據及投票 |
| `api.bootstrap`、`impact`、`marketplace`、`global-stream`、`demo-reset` | Home routes、reset、GlobalStream | HTTP tests；跨分頁 reset 觸發 REST refresh；強制 SSE 斷線後恢復；heartbeat 不 refetch |
| `api.contributor-profile`、`mvp-list`、`mvp-vote`、`wall-list`、`wall-post` | Community routes、HomeStore | HTTP 偽造身分拒絕、Unicode 上限、儲存前遮罩、並行投票鎖定、SQLite reopen；UI 送出／投票／reload／reset |
| `component.application-shell`、`hero`、`commitment-flow`、`donor-world-map`、`campaign-browser`、`campaign-card`、`release-update`；`page.home`、`marketplace` | `HomeComponents.tsx`、`HomePages.tsx`、snapshot hook | 錨點、單一 h1、地圖選擇、重複導覽、overflow、unknown／loading／error／empty／retry、release link、手機操作 |
| `component.contributor-impact`、`comment-wall`；`page.contributor-profile` | Profile、Community | 可追溯收據／pledge link、empty／missing／retry、失敗後保留草稿、使用遮罩後的完整 thread |
| `component.guided-demo-controller`；`page.guided-demo` | Launcher 負責 reset，頁面負責真實動作 | Reset 失敗留在 Demo，provider 成功後標示真正 campaign link；exit 不宣稱回滾。**C 尚未提供 maintainer analysis target** |
| `component.route-recovery`；`page.route-fallbacks` | Error boundary／recovery page | Unknown route 返回 Home；server fixture 的異常 payload 觸發真正 React render error，generic reload 可恢復且不顯示 exception |
| `policy.home-localization`、`home-presentation`、`home-provenance`、`home-refresh`、`localization` | Dictionaries、snapshots、UI、routes | Key parity、語系重載／導覽、demo labels、unknown、閱讀順序、heartbeat／reconnect browser tests |

原 BDD entrypoint 保留完整 scenario 註解，連到實際 server module 或
`e2e/product.e2e.spec.ts`。不把 UI scenario 算成 server pass；其他 owner 的 TODO 仍明列。

## 視覺檢查與 logo 順序

實作前已開啟 13 個相關 approved page/component 參考。Home 保留 editorial hero、
流程面板、主要地圖、三類 campaign 與 release card；Marketplace 使用 lifecycle shelves，
profile 保留 identity／accounting／achievements／receipts，Demo 提供 perspective launch cards，
recovery 提供置中操作。Card 維持 identity、status、benefit、funding、backer 的閱讀順序。
Canonical 地圖及 token-stream PNG 原樣匯入，地圖標籤避免碰撞。

舊參考包含可用 runner、不同 persona／數量與舊 UI；使用者已授權依現行 YAML 實作。
先完成 **13/13 Docker product journeys**，再依要求移除 SVG 背景矩形，保留漸層線條與
節點圖形。修改前報告保存在 `test-results/docker/product-before-svg/results.json`。

`e2e/visual.spec.ts` 比對 A 的五個頁面與八個 component baselines。十二項與保留的
approved PNG 不符；maintainer guide 缺少真正 analysis target，無法滿足該 baseline 前置條件。
目前截圖、expected、diff、trace 位於 `test-results/docker/visual/`；未更新 approved golden，
也未將 visual mismatch 報成驗證成功。

## 重現

```bash
UV_CACHE_DIR=/tmp/commoncommit-uv-cache uv run python scripts/lint_specs.py
npm run check
npm run test:spec-tools
make check-version
npm run test:e2e
npm run test:visual
git diff --check
```

預設 Docker E2E 同時跑 foundation 與 product 互動測試。每個 product journey 經由
4179 的**測試專用** server 建立獨立 SQLite fixture，只有 fixture 會注入 error、empty 或
stream disconnect。Production 無 fixture-control endpoint。Browser test 透過可見控制項
改變產品資料，evidence endpoint 僅讀取狀態。

## 驗證結果（2026-09-12）

| Gate | 結果 |
| --- | --- |
| YAML lint | 125 specs、0 contract errors、0 missing test files |
| `npm run check` | 前後端 typecheck／build 通過；22 個 server tests 通過，53 個 B/C TODO scenarios 明列保留 |
| Spec tooling | 4 個回歸測試通過 |
| `npm run test:e2e` | SVG 修改後 17/17 Docker 互動測試通過（4 foundation + 13 product） |
| 版本／空白 | `0.7.11` 一致；`git diff --check` 通過 |
| Approved visual gate | 未通過：12 項 mismatch、1 項缺少 maintainer target |

互動報告：`test-results/docker/interactive/results.json`。
視覺報告：`test-results/docker/visual/results.json`。

## 中央整合與未完成門檻

- B 負責 mission detail、funding、execution、queue、terminal engine evidence。
  `MissionCommunityPage` 明確只提供社群功能；Phase 3 換成 B 頁面並掛上 `CommentWall`。
- C 負責 `/new` 與真正的 analysis control，需在該 control 註冊
  `data-guide-target="analyze"`。後續頁面必須在實際 workflow 成功後才發布進度及下一個 target。
  目前選完 campaign 或到 maintainer route 後，guide 會顯示可恢復的 missing-target，
  不會完成任一完整 mission workflow。
- B/C migration 應由中央在 ID 1、2 之後註冊；reset participant 依父子順序加入，
  並提供相應 quiesce／drain。
- Home 使用 A 的 seeded read model。Phase 3 必須將 B 的 authoritative mission／pledge／
  accounting projection 接入 Home/profile，不能把此平行 seed graph 當成新執行證據。
  只廣播 event 不會同步儲存中的 projection。
- 在導覽結果與 approved visual comparisons 解決前，**完整 Phase 2 verified 尚未完成**。
  未 push、merge 或部署。

import { test } from 'node:test';

/**
 * Spec: api.demo-reset
 * Scenario: reset-restores-home-demo-fixture-only
 * Given local demo store 可能已因首頁互動而改變
 * When shell 請求 POST /api/demo/reset
 * Then server 重建 deterministic Home demo fixture 並只回傳 acknowledgement，不宣稱任何 external side effect
 */
test.todo("api.demo-reset / reset-restores-home-demo-fixture-only — Phase 2 implementation pending");

/**
 * Spec: api.global-stream
 * Scenario: global-stream-revalidates-after-mission-update-and-reconnect
 * Given 首頁或 campaign browser 已訂閱 global stream
 * When 收到 mission_update 或 SSE 重新連線成功
 * Then consumer 重新取得所需 REST snapshot，而不是以遺失可能的 event 增量重建狀態
 */
test.todo("api.global-stream / global-stream-revalidates-after-mission-update-and-reconnect — Phase 2 implementation pending");

/**
 * Spec: api.impact
 * Scenario: impact-snapshot-keeps-counts-and-map-provenance-together
 * Given local demo store 已有 mission 與 contributor 資料
 * When 首頁請求 GET /api/impact
 * Then stats 與 beacons 同時回傳，stats.dataMode 為 demo，且 aggregate 會隨資料變動
 */
test.todo("api.impact / impact-snapshot-keeps-counts-and-map-provenance-together — Phase 2 implementation pending");

/**
 * Spec: api.marketplace
 * Scenario: marketplace-provides-deduplicable-shelves-and-provenance
 * Given local demo store 已 seed missions 與 contributors
 * When campaign browser 請求 GET /api/marketplace
 * Then 回應有 demo dataMode、aggregate 和有內容的 shelves，且每個 mission 可由 id 去重
 */
test.todo("api.marketplace / marketplace-provides-deduplicable-shelves-and-provenance — Phase 2 implementation pending");

/**
 * Spec: component.application-shell
 * Scenario: shell-preserves-local-demo-and-locale-boundaries
 * Given Home 使用 bootstrap 的 local persona 與 measured execution evidence
 * When application shell render 或使用者切換 locale、route、reset
 * Then 導覽與 accessibility controls 保持可用，demo/isolation/wallet provenance 不被誤稱為 authentication、currency 或 completed execution，locale preference 可重建
 */
// Browser behavior verified in e2e/foundation.spec.ts; no duplicate server-only UI assertion.

/**
 * Spec: component.campaign-browser
 * Scenario: embedded-browser-groups-deduplicated-campaigns-without-a-second-h1
 * Given 首頁將 campaign browser 以 embedded mode render
 * When marketplace snapshot ready
 * Then 它以三個 editorial category 顯示去重 campaign，不渲染第二個 h1，並在 mission update 後 refresh
 */
test.todo("component.campaign-browser / embedded-browser-groups-deduplicated-campaigns-without-a-second-h1 — Phase 2 implementation pending");

/**
 * Spec: component.campaign-card
 * Scenario: campaign-card-preserves-data-and-action-boundaries
 * Given campaign browser 提供一筆明確的 mission_with_project record
 * When featured 或 compact campaign card render
 * Then card 依序顯示 identity、status、title、benefit、funding 與 backers，unknown 不變成零，只有 fundable mission 邀請 commitment
 */
test.todo("component.campaign-card / campaign-card-preserves-data-and-action-boundaries — Phase 2 implementation pending");

/**
 * Spec: component.commitment-flow
 * Scenario: flow-explains-the-four-human-accountable-stages
 * Given 訪客在首頁 hero 後閱讀平台如何運作
 * When commitment flow render
 * Then 依序說明 discover、back、build、merge，且 merge 明確保留 maintainer 的 review decision
 */
test.todo("component.commitment-flow / flow-explains-the-four-human-accountable-stages — Phase 2 implementation pending");

/**
 * Spec: component.donor-world-map
 * Scenario: map-renders-shared-demo-snapshot-with-honest-fallbacks
 * Given 首頁提供 shared impact snapshot
 * When donor world map render
 * Then loading、error、empty 與 ready 都有明確狀態，ready 地圖保留 demo label 且不推論真實位置
 */
test.todo("component.donor-world-map / map-renders-shared-demo-snapshot-with-honest-fallbacks — Phase 2 implementation pending");

/**
 * Spec: component.release-update
 * Scenario: release-update-links-only-a-real-local-release-and-keeps-provenance
 * Given marketplace 有或沒有 released mission
 * When release update render
 * Then 有 released mission 才可連到 campaign，且完成紀錄始終標示為 local demo 而非 upstream release claim
 */
test.todo("component.release-update / release-update-links-only-a-real-local-release-and-keeps-provenance — Phase 2 implementation pending");

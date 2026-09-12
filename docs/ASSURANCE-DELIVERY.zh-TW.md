# 品質驗證交付證據 — 2026-09-12

## 規格與執行責任

規格為 api.assurance、api.assurance-run、page.assurance。App 接上 AssuranceController；Cloudflare 入口明確啟用，gateway cron 等待 POST /api/assurance/run 終態。ExperimentAgent 負責固定完整案例測量與判定，Assistance 提供標示來源的模型建議，React 頁面讀取持久化快照。沒有尚待接線項目。

## 部署前驗證

- npm run check：型別檢查、159 個測試與正式建置通過。
- 130 份規格：零 contract 錯誤、零缺失測試檔。
- Worker：10 個測試及 dry-run 打包通過。
- 瀏覽器：40 個互動流程通過，包含新增雙語／手機版實驗室終態；另完成實際畫面檢視。
- 完整 phase4 gate 在既有 40 項 golden 圖片比對失敗。main 的 AGENT-MAIN-INTEGRATION.md 已記錄 40/40 差異；本次導覽也有預期變更。未重寫或自動核准 golden，不宣稱完整視覺關卡通過。
- 本機實測 75a787bf-6ddf-48a7-9204-9268c632afc0：38/38 檢查通過，四次 provider 嘗試、兩次模型回應、兩次明確逾時備援，已知 1,494 tokens。本機結果不代表雲端模型已成功。
- 部署前已保存共用展示資料庫的私有備份。

## 能力限制

流程持續迭代模型假設並量測退步；雲端自動改碼、任意 repository 執行、自動發布仍停用。容器更換可能清空歷程。不將原始碼、prompt 或內部思考當成活動公開。部署後須補上真正排程 run ID 與線上 commit，不能將設定完成當成 agent 運轉。

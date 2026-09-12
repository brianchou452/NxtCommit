# 雲端品質驗證流程

[English](ASSURANCE.md)

/assurance 的 Agent 實驗室顯示六個持久化階段：規劃、安全、Chaos、驗證、實驗解讀、迭代。Cloudflare Worker 每五分鐘以操作員專用端點啟動一輪，等到終態才結束排程。既有黑客松關閉時間仍生效。

沿用 ExperimentAgent、ChaosAgent 及 SQLite checkpoint 的 LangGraph 架構。四次有上限的 Assistance 呼叫分別產出規劃、剩餘風險、結果解讀、下一輪假設。畫面保留模型、response ID、耗時、用量與明確備援標示，只顯示摘要，不索取或公開模型內部思考。上一輪迭代建議交給下一轮規劃，但固定 19 個案例仍各執行兩次。相容基準提供退步／恢復比較。結果由測試判定；模型不能省略案例、選指令、改程式或核准發布。原始碼修復仍屬獨立控制的本機 self-update 流程。

故障使用合成 transport 與私有記憶體資料庫，不碰網站展示資料。這是真實模組的受控故障測試，不是任意 repository 測試或安全認證。任務引擎仍為腳本式 fixture 執行，驗證檔案保留實測測試與差異。實驗室綠燈不能核准任務。

GET /api/assurance 公開唯讀。POST /api/assurance/run 必須持有既有 OPENAI_CHECK_TOKEN bearer capability，沒有訪客付費觸發按鈕。同時請求合併為一輪，五分鐘冷卻阻止重複呼叫。每輪 120 秒取消訊號，最多四次模型呼叫；已知輸入／輸出用量與用量未知呼叫分開記錄。不自動重試模型或發布程式。排程失敗會回報錯誤，而非把接受請求當成完成。

獨立 SQLite 公開最近 40 輪；程序重新開啟時，未完成紀錄標為中斷。容器更換可能清空暫存歷程。Checkpoint 與測量保留於 assurance 目錄；這不是外部持久稽核服務。頁面每兩秒更新，斷線停止動畫，支援減少動態效果與英／繁中。查看歷史不會啟動工作。

本機可透過忽略的環境檔設定 AGENT_ASSURANCE_ENABLED=1 與操作員 token。雲端入口明確啟用；Chaos 私有測試應用不繼承。以 /__deployment 核對線上版本，以 /api/assurance 查終態；設定完成或有 cron 不等於已實際執行。

server/agents/assurance.test.ts 驗證真實終態、併發合併、冷卻、未授權拒絕、秘密隔離、展示資料不變、重新開啟、停用及安全失敗。e2e/assurance.e2e.spec.ts 驗證雙語、手機與桌面終態。gateway.test.mjs 驗證排程轉送與失敗傳播。真正的部署及 provider 證據另記於有日期的交付報告。

[Cloudflare 排程處理器](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)

# 本機與 Cloudflare 的 OpenAI 設定

兩個 Node 環境共用 `server/services/openai.ts`，呼叫官方 Responses API；45 秒 timeout、不自動重試、最多 1,024 output tokens、`store:false`。成功結果帶真實 model、response ID、prompt version、延遲與實測 tokens；沒有 usage 就是 null。錯誤不洩漏 provider body 或 key。這不代表 execution runner 或 Phase 2 authoring routes 已完成。

本機：在 root 已忽略的 `.env` 填入 `OPENAI_API_KEY`，可選填 `OPENAI_MODEL`（預設 `gpt-5-mini`）。執行 `node --import tsx scripts/check-openai.mjs` 做一次小額、會計費的真實 API 驗證，只輸出 provenance。

Cloudflare：將相同 key 存為 `nxtcommit-delivery` Worker 的 `OPENAI_API_KEY` secret。Container class 只在 runtime 傳入，不進 Docker build argument 或前端變數。容器只允許連往 api.openai.com；secret 修改後需新啟動的容器才會生效。OPENAI_MODEL 可存為非秘密 Worker variable。本機可用不等於雲端可用，兩側真實驗證應分別留證。

活動額度兌換碼不是 API key；先在 OpenAI project 兌換，再透過 provider UI 建立專案 key。秘密不得寫入 checkpoint。目前不宣稱 API/project budget alert 已設定。雲端展示於台灣時間 2026-09-13 01:00 阻擋流量並停止容器，本機程式也應在展示結束時停止。

[Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) · [模型](https://developers.openai.com/api/docs/models/gpt-5-mini)

## 部署連線證據

容器 adapter 的 POST `/__openai-check` 必須提供獨立 `OPENAI_CHECK_TOKEN` bearer secret，未提供則回傳 404。不接受使用者 prompt，每個程序最多執行一次固定 prompt provider 呼叫，僅回傳 provenance／usage；使用與本機相同的編譯後 server client。一般健康檢查不呼叫 OpenAI。此為維運檢查，不是文案產生功能。

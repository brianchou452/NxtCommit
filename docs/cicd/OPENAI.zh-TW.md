# 本機與 Cloudflare 的 OpenAI 設定

## 產品接線更新 — 0.7.18

正式入口現在載入與本機 Node 相同的 authoring 設定。官方 OpenAI 端點使用 Responses，符合既有受限金鑰；明確配置的相容 gateway 保留 Chat Completions。產品建議採嚴格雙語 JSON、12 秒逾時、最多 1,024 output tokens，gpt-5-mini 使用 minimal reasoning。Fixture 執行仍是 scripted demo；建議不能改變 deterministic evidence 或批准 run。

成功的產品 evidence 包含 provider response ID、模型、耗時與實測 token usage。Langfuse 僅匯出 metadata，包含真實 span 起訖、模型、token、prompt version 與 release SHA；不匯出原始 prompt、repo 文字、輸出文案或秘密。匯出最多等待 1.5 秒，失敗不影響產品結果。備援 observation 為 span，不冒充模型 generation。

Langfuse Cloud 設定：登入帳號、建立或選取 NxtCommit 專案，設定 GitHub secrets `LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`，以及 EU／US／JP 端點變數 `LANGFUSE_BASE_URL`。部署 workflow 透過 stdin 同步至 Worker secrets，再部署。金鑰不可貼到聊天。Gateway 僅允許 OpenAI 與這些 Langfuse Cloud hosts；金鑰只在 runtime 注入。部署後須以產品 trace ID 查驗 Langfuse 入庫，不能只靠 `langfuseEnabled` 宣稱成功。Cloud 帳號有獨立資料保留與生命週期；應用截止不會刪除託管 traces 或關閉帳號。

兩個 Node 環境共用 `server/services/openai.ts`，呼叫官方 Responses API；45 秒 timeout、不自動重試、最多 1,024 output tokens、`store:false`。成功結果帶真實 model、response ID、prompt version、延遲與實測 tokens；沒有 usage 就是 null。錯誤不洩漏 provider body 或 key。這不代表 execution runner 或 Phase 2 authoring routes 已完成。

本機：在 root 已忽略的 `.env` 填入 `OPENAI_API_KEY`，可選填 `OPENAI_MODEL`（預設 `gpt-5-mini`）。執行 `node --import tsx scripts/check-openai.mjs` 做一次小額、會計費的真實 API 驗證，只輸出 provenance。

Cloudflare：將相同 key 存為 `nxtcommit-delivery` Worker 的 `OPENAI_API_KEY` secret。Container class 只在 runtime 傳入，不進 Docker build argument 或前端變數。容器只允許連往 api.openai.com；secret 修改後需新啟動的容器才會生效。OPENAI_MODEL 可存為非秘密 Worker variable。本機可用不等於雲端可用，兩側真實驗證應分別留證。

活動額度兌換碼不是 API key；先在正確的 OpenAI organization 確認額度，再透過 provider UI 建立專案 key。秘密不得寫入 checkpoint。組織用量告警已設定於 US$80、90、95，寄至 ianjuantw@gmail.com，並保留 US$100 owner 告警（CP-016）。雲端展示於台灣時間 2026-09-13 01:00 阻擋流量並停止容器，本機程式也應在展示結束時停止。

[Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) · [模型](https://developers.openai.com/api/docs/models/gpt-5-mini)

## 部署連線證據

容器 adapter 的 POST `/__openai-check` 必須提供獨立 `OPENAI_CHECK_TOKEN` bearer secret，未提供則回傳 404。不接受使用者 prompt，每個程序最多執行一次固定 prompt provider 呼叫，僅回傳 provenance／usage；使用與本機相同的編譯後 server client。一般健康檢查不呼叫 OpenAI。此為維運檢查，不是文案產生功能。

## 金鑰設定與更換操作手冊

| 項目 | 本次黑客松設定 |
| --- | --- |
| Organization／project | Personal Organization／Default project |
| Project ID | `proj_1BGh59tTmK8tJBTCxbxfjlIN` |
| 金鑰名稱 | `NxtCommit Hackathon Local and Cloudflare` |
| 權限 | Restricted：僅 Responses（`/v1/responses`）Write |
| 建立時選擇的期限 | 1 天；實際到期時間以 OpenAI Platform 該金鑰為準 |
| 本機秘密 | root `.env` 的 `OPENAI_API_KEY`，權限 0600、Git 忽略 |
| 雲端秘密 | Worker `nxtcommit-delivery` 的 `OPENAI_API_KEY` |
| 模型 | `OPENAI_MODEL=gpt-5-mini` |

**金鑰到期與 credits 用完是兩件事。** 換 key 不會增加 organization 的 credits。額度耗盡需處理組織帳務／額度；key 到期或撤銷則建立替代 key。活動兌換碼不能填入 `OPENAI_API_KEY`。

1. 開啟 [OpenAI API keys](https://platform.openai.com/settings/organization/api-keys)，確認 Personal Organization 與 Default project。建立替代 key，沿用上表名稱（可加日期），選 Restricted → Model capabilities → Responses → Write，設定需要的到期時間，其餘權限維持 None。記錄實際到期時間，不記錄秘密值。
2. 更新每個使用中的本機 checkout root `.env`，只替換 `OPENAI_API_KEY`。本次已設定 `/Users/ian_juan/Documents/GitHub/NxtCommit/.env` 與 `/Users/ian_juan/Documents/GitHub/NxtCommit-delivery/.env`。保留其他環境變數，檔案權限維持 0600。不能放進 `VITE_*`、GitHub 原始碼、Docker build arguments 或命令列參數。
3. 重啟本機 server，讓程序載入新環境。於 delivery worktree 使用 Node 24、安裝 dependencies 後，執行 `node --import tsx scripts/check-openai.mjs`。確認 `ok:true`、`generator:openai`、`fallback:false` 與真實 usage。已執行中的程序不會自動重讀 `.env`。
4. 在 Cloudflare 所屬帳戶開啟 Workers & Pages → `nxtcommit-delivery` → Settings → Variables and Secrets，將 `OPENAI_API_KEY` 以 **Secret** 類型替換並儲存／套用；再停止／重啟既有容器，使 runtime `envVars` 取得新值。只更新 Worker secret 不代表正在執行的 Node 已換 key。重啟可能清除暫存 SQLite 展示資料。
5. 核對線上 `/__deployment` 收據與 health／readiness。使用獨立的 `OPENAI_CHECK_TOKEN` 作為 Bearer 憑證，POST `/__openai-check`，不要以 OpenAI key 作為此入口憑證。此維運 token 存於 delivery worktree 已忽略的 `.env`。必須確認新啟動容器回傳成功；入口每個程序快取一次 provider 結果，舊程序快取的成功不能證明金鑰更換成功。
6. 兩側通過後，到 OpenAI Platform 撤銷被替換的舊 key。雙語 checkpoint 記錄時間、key 名稱／期限、環境、release SHA、模型、response ID 與 token 用量，永不記錄秘密值。若 key 已遭盜用，應優先撤銷並接受更換期間的服務中斷。

本次授權的展示截止仍為 **台灣時間 2026-09-13 01:00**。不得為了測試新 key 而重啟／重新部署已關閉的雲端展示；超過期限繼續 hosting 需使用者另行指示。更換憑證不會延長部署期限。

## 產品呼叫保護 — v0.7.19

兩個 runtime 入口使用已整合的 Responses adapter。同 prompt 共用進行中的請求及五分鐘 process cache（最多 64 筆）；失敗冷卻十秒。同時最多兩個 provider 呼叫，每個 process 的一小時視窗最多 120 次嘗試。重啟會清除計數，這不是組織帳單硬上限；超限回傳明確 fallback。快取回應保留原 responseId／usage 並標記 `cached: true`，不重複增加 provider token counter 或 Langfuse generation trace。既有花費 email 告警持續啟用。

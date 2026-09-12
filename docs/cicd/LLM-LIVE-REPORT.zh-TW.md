# Cloudflare LLM 與 Langfuse 實測報告 — 2026-09-12

產品 LLM 已接通，Langfuse Cloud US／Hobby 的 NxtCommit 專案已上線，五筆真實 generation 均已查回。測試部署為 `47c564d03cc5d58f97ccdd59fd0c63ced9d294f2`（0.7.19），測試時間 13:53–13:54 Asia/Taipei。[Langfuse 儀表板](https://us.cloud.langfuse.com/project/cmtxyhuhu068yad0cclmultr7/traces) · [成功部署](https://github.com/brianchou452/NxtCommit/actions/runs/34676486249)。

原先 `f4f1c13` 的維運 Responses 探針成功（模型 2.331 秒），但產品 `/api/llm/validate` 回報未配置。原因是正式入口沒有載入 authoring 設定，且產品使用 Chat Completions、既有 key 僅授權 Responses。`b27a764` 修正入口與 API 接線，新增真實起訖、usage、model、response ID 與 release metadata；`47c564d` 的隊友整合保留快取、同時最多兩個模型請求、每個 process 每小時 120 次與受保護 reset。原先沒有模型執行的回應不能拿來宣稱模型加速幅度。

| 功能 | HTTP 秒 | 模型／服務處理秒 | 新增 tokens | Langfuse |
|---|---:|---:|---:|---|
| 議題建議（首次） | 4.591 | 3.338 | 380 | verified |
| 相同建議（快取 1） | 0.831 | 0.000 | 0 | cache; no new generation |
| 相同建議（快取 2） | 0.977 | 0.000 | 0 | cache; no new generation |
| 草稿生成 | 4.260 | 3.457 | 371 | verified |
| 草稿評估 | 3.370 | 2.770 | 362 | verified |
| 執行證據說明 | 4.119 | 3.393 | 1306 | verified |
| Shadow review | 3.850 | 3.179 | 1305 | verified |

五次新模型呼叫全部 `generator=openai`，模型 `gpt-5-mini-2025-08-07`；共 2,852 input + 872 output = 3,724 tokens。兩次快取沿用相同 response ID，表中新增 tokens 為 0，不重複計費或匯出 generation。Cloudflare metrics 回報 calls=5、cached=2、fallback=0、exports success=5／failure=0。首次議題建議 4.591 秒，快取 0.831／0.977 秒；此特定重複請求約快 79–82%，不是所有使用者流程都加速相同比例。

實際線上流程：fixture 分析 → LLM 草稿 → 建立新任務 → demo 出資 → engine 執行 → `needs_review`。從出資開始至查到 terminal 共 3.289 秒，實測 5/5 測試通過；run `257b0435-e6c3-49cb-8e7b-12538415083c`。沒有 reset 共用資料或代替使用者批准；fixture 改碼仍為 scripted demo，測試／diff 為 engine evidence，LLM 建議不具有批准或合併權限。

Langfuse 查驗不是只看 HTTP 200：以 v2 observations API 查回五個 trace ID，逐筆核對 GENERATION、模型、usage、非零起訖與 release；瀏覽器表格也已確認可見。另有一筆 `transport-check` SPAN 僅驗證傳输，未計入模型呼叫。只匯出 metadata，不匯出原始 prompt、repo 文字、生成文案或金鑰。快取命中目前不產生新 trace，請搭配 Cloudflare cached counter；TTFT 未量測（目前非 streaming）。

加速判斷：五次未快取請求平均 HTTP 4.038 秒，模型／服務處理平均 3.227 秒，占約 80%。剩餘時間包含用戶端網路、應用處理與同步 trace 匯出，不能全歸因 Langfuse。維持現有 Cloudflare basic，沒有提高 CPU／記憶體或部署自架 Langfuse。現有 minimal reasoning、短雙語輸出、五分鐘快取已啟用。下一步優先用同一測試資料比較更短輸出，再評估 streaming 的首字體驗；若量到 trace 匯出占比明顯，再改為有界非同步匯出。這些後續方案尚未實作或量測。

測試限制：單一台灣用戶端、小樣本、HTTP 產品 API 實測；不是 LLM 併發壓測、長時間 soak 或語意品質評比。本次程式變更本機 101 server tests、38 Docker journeys、8 delivery tests 與正式容器 smoke 通過；目前整合版 CI 另外驗證 106 server tests、39 journeys。既有視覺差異未變更。第一次 rollout 切換時觀測一次 HTTP 500，之後 HTTPS identity／readiness 通過；不宣稱零中斷部署。Langfuse Cloud 帳號與資料保留獨立於應用的 2026-09-13 01:00 截止，不會隨應用關閉自動刪除。

```bash
python3 scripts/ci/probe_llm_product.py --expected-sha 47c564d03cc5d58f97ccdd59fd0c63ced9d294f2 --output artifacts/llm-product-traced.json
python3 scripts/ci/verify_langfuse_product.py
```

重現會產生付費模型呼叫及一個 demo 任務；金鑰使用 ignored、0600 的 `.env.langfuse`。

[Langfuse OTLP mapping](https://langfuse.com/integrations/native/opentelemetry) · [Observations API](https://langfuse.com/docs/api-and-data-platform/features/observations-api)

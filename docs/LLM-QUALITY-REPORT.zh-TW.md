# LLM 速度與正確性檢查 — 2026-09-12

[English](LLM-QUALITY-REPORT.md)

v3 使用各功能專用的精簡雙語提示，保留有效 JSON 並優先保留證據來源／狀態，回答通過驗證才寫入成功快取，快取命中連回原始 Langfuse trace。提案評論新增所選議題。保留既有模型、逾時、併發／呼叫上限與不影響決策權限的備援。

## 有界真實比較

六組人工編寫的 CSV 情境，每版每功能兩次全新呼叫，使用 `gpt-5-mini-2025-08-07` Responses；獨立比較不使用快取或 Langfuse 匯出。舊版 image 為 `nxtcommit-llm-live:0.7.18`，候選版為專屬 image `nxtcommit-llm-quality:0.7.23`，含最新 main 整合。順序執行、未隨機交錯；網路／供應商波動及一次舊版慢回應影響平均數。這是小樣本 smoke 比較，不是信賴區間或正式環境 p95。

| 指標 | 舊版（12 次） | 最終候選版（12 次） |
|---|---:|---:|
| 平均請求延遲 | 2,977 ms | 2,233 ms |
| 中位數 | 2,408 ms | 2,252 ms |
| 樣本最大值 | 6,896 ms | 2,704 ms |
| 輸入 token 合計 | 1,950 | 2,888 |
| 輸出 token 合計 | 1,620 | 1,252 |
| 備援次數 | 0 | 0 |

平均延遲降低 25.0%、中位數降低 6.5%、輸出 token 減少 22.7%。輸入 token 增加 48.1%，因此**不宣稱總 token 或成本下降**。個別功能速度仍有波動，不能保證每次呼叫都更快。

## 正確性與限制

首版候選回答錯誤推測 JavaScript `trim()` 會移除引號，因此未採用。最終 diff 提示要求依實際操作語意提出具體測試輸入；回答改為比較含引號逗號或整列前後空白，不直接宣告缺陷。評論要求缺漏的測試案例，區分標頭與資料值。證據解釋保留作者示範來源與未知驗收狀態，專案解釋不再重複無關的系統指示。

最終 12 筆皆有雙語內容及真實 provider usage。這是代理檢閱的人工情境，並非盲測人工評分，不能證明幻覺已消失。精簡長度與繁體中文是目標而非硬性保證；少數生成字元仍混用簡體，生成範例中的引號仍可能需要編修。模型文案不能改變執行或審核閘門。

另以四次真實呼叫涵蓋 chaos 規劃、實驗評論、安全評論與下一輪規劃，皆回傳可量測的雙語建議，未授權正式環境注入故障。這只能驗證可用性，不能證明相對品質提升；安全建議仍可能不夠具體。實驗 runner 仍為受控／腳本式執行。

回歸測試涵蓋無效雙語回答、10 秒負快取後恢復、來源／未知狀態保留、併發去重、單次 trace 匯出及快取結果回饋。Trace 僅含 metadata。提示退化時可回復原始碼版本，不依赖遠端 prompt。

## 重現方式

從已 build 的應用根目錄執行 `scripts/ci/probe_llm_quality.mjs`，透過環境變數提供 `OPENAI_API_KEY`，固定進行 12 次付費呼叫。輸出僅含人工情境的回答及量測來源，不含憑證。原始結果保留於忽略版控的 artifacts：`llm-quality-before.jsonl`、`llm-quality-after-pinned.jsonl`、`llm-quality-agents.jsonl`；未採用的初版另存 `llm-quality-after.jsonl`。

## 正式站驗證

[GitHub 部署 34678108394](https://github.com/brianchou452/NxtCommit/actions/runs/34678108394) 全部 CI／部署檢查通過。HTTPS `/__deployment` 確認提供 `ad026e1d6b5370763887cb207346cab6ba1b46ee`（原始碼版本 0.7.23）。CI Assurance 探針另外要求四種真實 provider 建議角色及 38 項受控檢查通過。

六種產品功能皆回傳 OpenAI v3 證據，沒有備援。全新 HTTP 回應介於 2,365–3,291 ms（平均 2,910 ms），模型請求平均 2,065 ms。兩次重複議題請求為 751／511 ms，標示 cached=true、沒有額外模型延遲，且保留相同 response ID 與 trace ID。六次獨立呼叫合計 4,067 個量測 token；快取上的 usage 描述原始回答，不能重複加總。

Langfuse 六筆 GENERATION 均已回讀，模型、usage、正值耗時與部署版本一致。Fixture 任務在 3,533 ms 產生全新 engine 證據，5 通過／0 失敗，維持 needs_review。隨後八次 readiness 皆 HTTP 200，LLM 與 Langfuse 啟用；這是有限次 smoke 檢查，不是負載容量或 uptime 保證。

Metadata artifacts：`llm-product-v3.json`、`langfuse-product-verified.json`、`llm-v3-readiness.json`。[Langfuse 專案](https://us.cloud.langfuse.com/project/cmtxyhuhu068yad0cclmultr7/traces)。

本機驗證：162 項程式測試、42 項 Docker 瀏覽器 E2E 通過。測試新增可指定 E2E_IMAGE，避免不同工作目錄覆蓋共用 image 標籤。另修正 Assurance GET 探針的 User-Agent；實測預設 Python UA 回 403，應用程式 UA 回 200。

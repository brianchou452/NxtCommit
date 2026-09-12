# 本機 Chaos Agent 與實驗 Agent

> **2026-09-12 LangGraph / Langfuse 更新：** 本機 agents 已使用持久化階段流程與 metadata-only 監控；續跑、防重播、操作指令及限制請見 [Agent 操作手冊](AGENT-OPERATIONS.zh-TW.md)。既有 Demo 鎖與網站版本維持獨立。

可選的程式自我更新與 Demo 凍結是獨立流程，請見 [自我更新手冊](SELF-UPDATE.zh-TW.md)。

[English](CHAOS-AGENTS.md)

此分支在電腦 C 實作上新增由操作者啟動的穩定度迭代流程。
`NxtCommit` 與 `NxtCommit-delivery` 是同一 repository 的 worktree；本次從
`dev/computer-c`（`ec95912`）開始，未合併 delivery `main` 或發布雲端。

## 啟動與檢視

於 repository 根目錄使用 Node 24 與 lockfile 對應依賴：

```bash
npm run agents:experiment
npm run agents:experiment -- --live
npm run agents:experiment -- --cycles 100 --interval 300
npm run agents:experiment -- --live --cycles 10 --interval 300
```

預設每個情境重複兩次、seed 42、一輪、不呼叫 provider。
`--live` 讀取 Git 忽略的本機 `.env`，需要 `OPENAI_API_KEY` 與 `OPENAI_MODEL`。
每輪最多兩次建議呼叫，各有 12 秒期限與輸出上限；GPT-5 completion 上限為
2400 tokens（含 reasoning），其他相容模型為 800。保留已設定的模型。
憑證不進故障 fixture 或報告；不估算 provider 帳單，缺少 usage 保持未知。

JSON 報告以原子寫入保存在 `var/chaos-agents/`，含每筆結果、失敗斷言、待辦、
模型來源與前一份相容報告比較。情境版本或重複次數不同時不做比較。
任一輪失敗 exit 1，中斷 exit 130，全部執行輪次通過 exit 0。
SIGINT／SIGTERM 會取消模型與私有 HTTP 工作，保留已完成案例。
單獨使用 `--resume <run-id>` 續跑原設定與案例。SQLite 鎖防止重疊執行，
程序死亡時由作業系統釋放；不要刪除鎖資料庫，升級前先停止舊 worker。
歷史報告保留供檢視，由操作者管理歸檔與磁碟保留期限。

## 角色與權限

1. Chaos Agent 可請模型依固定目錄提出風險假設。
2. 無論模型建議如何，每個情境都會對真正的 `Assistance`、Express、readiness
   與 SQLite 模組執行；使用受控 transport 與可拋棄的記憶體資料庫。
3. 實驗 Agent 檢查確定性不變條件、比較失敗、保存修復待辦，再選擇性請模型
   解讀結果與前一個 Chaos Agent 假設。
4. 維護者修改原始碼、補回歸測試並重跑相同情境。迴圈不自行改程式、不執行
   模型命令、不升級 prompt、不改 credits、不核准任務、不 merge 或 deploy。

這是具有報告交接的循序雙角色建議流程，不是協作 mission-runner 叢集或自主
寫碼系統。只有接受的真實模型結果才標示 `roles: model-assisted`；無法取得或
驗證失敗時維持 `deterministic`。測試中的假模型回應屬合成資料，即使 adapter
在成功 transport 路徑回傳 openai 標記，也不能視為外部呼叫；整份量測以
`controlled-faults-real-modules` 明示此範圍。

## v2 情境（19 個）

- 正常模型、429、503、合成 timeout、無效 JSON、過大回應、缺語言、純空白建議、
  機密格式輸出、不受證據支持的宣稱、trace sink 失敗、trace containment、截斷回覆與無效用量。
- 私有應用实例的無效／過大 API 請求、reset 撤銷 capability、DB readiness
  失敗與 worker heartbeat 恢復。

不能對任意 URL 注入故障，也沒有公開故障路由。不終止 OS process、不破壞真實
DB、不執行外部 repository。合成 timeout 驗證 fallback，並非實測網路中斷或
deadline。通過不代表 production 穩定、雙語語意正確、模型較好或 B runner 就緒。

每輪完整執行情境，不因成功而縮減覆蓋。延遲只供診斷，不作統計升級宣稱。
即使模型建議放行，失敗仍阻擋該輪；`promotionApproved` 永遠是 false。

## 本機應用部署

建置後使用獨立 port 與資料庫：

```bash
npm run check
npm run check-version
HOST=127.0.0.1 PORT=4188 VAR_DIR=./var/chaos-local EXECUTION_MODE=demo npm start
```

驗證 `/healthz`、`/readyz`、`/metrics`、`/api/bootstrap` 與 HTML 首頁。
Agent CLI 是獨立本機 process；應用 readiness 不能證明迴圈存活，需查 process
與最新 JSON 報告。對記錄的 PID 發送 SIGTERM 即可停止應用與迴圈。
未設定開機自動啟動；每輪不重新建置應用，修改程式後需 build／restart。

## 驗證與交接

- 入口：`server/resilience/cli.ts`、`chaos.ts`、`experiment.ts`。
- 終態測試：`server/resilience/chaos.test.ts`，每案都有斷言，故意失敗會阻擋，
  模型無法推翻結果。
- 新規則：`spec/policies/chaos-experiments.yaml`。
- 沒有 UI 行為或核准圖片變更，無新增 browser journey。
- 中央接線：package script 與既有 assistance adapter，不需註冊任務／公開路由。
- 剩餘邊界：B 執行／募資整合、C 既有視覺核准仍待原有流程，此迴圈不使其完成。
- 執行結果與部署證據：[實驗紀錄](experiment-report.zh-TW.md)。

API 相容性參考：[OpenAI Chat Completions](https://developers.openai.com/api/reference/python/resources/chat/subresources/completions/methods/create)。

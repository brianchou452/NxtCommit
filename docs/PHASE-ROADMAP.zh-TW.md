# NxtCommit 階段 Roadmap

[English canonical](PHASE-ROADMAP.md)

## v0.6.0 狀態

| Phase | 狀態 | 已交付邊界 |
| --- | --- | --- |
| 0 — 可觀測模型邊界 | 已實作 | Langfuse v5 tracing、build／prompt identity、遮蔽 capture contract、統一 metrics、export health dashboard 與 alerts。 |
| 1 — 建議型 LLM 產品功能 | 已實作 | Issue triage／criteria、campaign critic、evidence explainer、shadow reviewer；都有明確 fallback，且沒有 gate 權限。 |
| 2 — 評估與 rollout 迴圈 | 已實作 | 五組版本化 curated datasets、experiment CLI、確定性 evaluators、穩定 cohorts、feedback scores 與晉級紀錄。 |
| 3 — 隔離真實 coding worker | **進行中——僅完成基礎** | 原始碼已有 transactional run-request queue、lease／heartbeat／retry／cancel／orphan recovery protocol、獨立 worker entrypoint、queue telemetry、UI polling fallback，以及 GitHub default branch 的 commit capture。Shared nonprod 仍使用 inline demo execution，沒有 disposable workload 或通過 SEC-00 的部署邊界。 |

「Phase 2 已實作」代表評估機制已存在且可測試，不代表憑空產生統計證據。
每個要晉級的功能仍未收齊 50 筆 blinded human annotations，因此任何候選
prompt 都不能宣稱已證明優於現行版本。

## Phase 3 — 隔離 coding worker（進行中，尚未通過 exit gate）

目標：公開 repo 只在單次可拋棄 job／VM 中以固定 commit clone；worker 不持有
service credentials、egress 預設拒絕、CPU／memory／disk／time 有硬限制，事件
需簽章，結束後確定性清理。

交付狀態：

1. **原始碼已實作：** SQLite-backed run-request queue，包含 atomic lease、
   heartbeat、bounded retry、cooperative cancel、每個 mission 只允許一個 active
   owner，以及 expired-lease recovery。只有 `VAR_DIR` 位於 durable shared storage
   時才能宣稱持久；nonprod `emptyDir` 不符合此條件。
2. **原始碼已實作：** 獨立 `server/worker.ts` entrypoint、health／Prometheus、
   Langfuse `queue-worker-run` trace，以及 API／UI queue status。
   `RUN_DISPATCH_MODE=queue` 必須明確啟用；nonprod 仍維持 `inline`。
3. **部分實作：** GitHub analysis 會保存觀測到的 default branch 與 immutable
   40 字元 commit SHA。匯入 repo 仍會被 execution gate 拒絕；clone 與 toolchain
   lock 尚未實作。
4. **尚未實作：** 每次 run 一個 disposable Kubernetes Job／VM、per-run workload
   identity、預設拒絕且限目的地的 egress、artifact object storage、事件／artifact
   簽章，以及 workload 的確定性刪除。
5. **尚未通過：** 在實際部署 worker 邊界內的 SEC-00、SEC-01、AG-02、AG-04
   與 held-out AG-01 證據。完成量測以前，必須維持 `EXECUTION_MODE=demo`，且禁止
   匯入 repo 執行。

Exit gate：隔離／圍堵證據完整、cancel／cleanup durable、憑證外洩為零、無界
egress 為零、P0 false-reviewable 為零。

## Phase 4 — 經驗證的上游交付

Phase 3 通過後才新增最小權限 GitHub App。安裝同意、repo allowlist 與人工授權
不可省略。Worker 只輸出簽章 artifact，由另一個 delivery service 建立 branch
與 draft PR。Merge、tag、release、package publication 維持獨立權限且預設關閉；
補齊 idempotency、撤銷、audit 與 rollback。

## Phase 5 — 多使用者治理與真實計帳

以登入組織、角色審查、正式持久儲存與可稽核 ledger 取代本機 demo 身分與
wallet。只有 provider metering 與帳務對帳完成後，介面才能把 credits 稱為
「付費算力」。加入濫用防護、quotas、爭議／退款、privacy retention 與 tenant
isolation。

## Phase 6 — 可量測的 agent 優化網路

把 Phase 2 迴圈擴至不同語言與任務：human annotation queues、評分者一致性、
因果 prompt/model experiments、每個 accepted artifact 成本、drift detection 與
自動 rollback。只有 P0 安全分數不退步才可自動分配流量；永遠不能自動取代
人工 merge 權限。

## Phase 7 — 生態系互通

發布可攜、具簽章的 evidence bundle 與 worker protocol，讓外部專案不必信任
NxtCommit UI，也能驗證測試、provenance、資源使用與審查狀態。加入可重現
公開 benchmark 與 dataset 變更治理。Federated workers 維持 opt-in，且必須
證明同一套隔離契約。

## 排序規則

各 Phase 是能力 gate，不是行銷里程碑。Phase 4 不得繞過 Phase 3；真實計帳
不能早於身分與 metering；模型分數不能取代引擎證據或人工上游授權。

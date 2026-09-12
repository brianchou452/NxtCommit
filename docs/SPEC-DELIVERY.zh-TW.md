# Executable spec 交付證據

平行實作與整合期間使用這份 ledger。Spec lint 只證明 schema 合法，不證明 runtime 行為。

## 完成狀態

- `unassigned`：尚無 owner。
- `foundation`：已有型別、儲存、route 或 UI，但尚未證明 terminal outcome。
- `integrated`：runtime wiring 已接通且 contract tests 通過。
- `verified`：outcome test 在有界時間內抵達文件化 terminal state。
- `browser-verified`：已對整合後 app 實際操作 user-facing journey。

只有 `verified` 或 `browser-verified` scenario 可以回報為已實作。

## Ledger 必填欄位

| Scenario ID | Owner | Runtime authority | Wiring | Contract test | Outcome test | Timeout | Browser evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `execute-dispatch-union` | B | `ExecutionEngine` 與單一 runner | API → dispatcher → engine → store | response union 與拒絕條件 | funded fixture 抵達 terminal evidence | 30 秒 | mission → run → review | `verified` |

整合者每次合併 slice 後更新此表或等價的 generated artifact。只檢查 route 的測試只能放在
`Contract test`，不得當作 `Outcome test`。

## 必跑的跨切片 journeys

1. Reset 恢復所有切片需要的 graph，包括 executable fixtures。
2. 本機 fixture 可完成 funding、dispatch、verification、accounting 與 review。
3. Metadata-only GitHub project 不得顯示或繞過 execution authority。
4. Authoring 資料經 marketplace 與 detail contract render 時不得產生非法數字或缺少 localized fields。
5. Recovery 不得留下 running orphan、重複結算或捏造 verification。

宣告 Phase 4 完成前執行 `bash scripts/phase4-gate.sh`。Docker visual 只屬於呈現證據，
不能取代上述 outcome journeys。

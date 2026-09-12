# 可執行規格

每份 YAML 對應一個 design system、API、頁面或可重用 component。spec 描述可觀察的產品行為與
資料契約；不得抄寫 source path、函式名稱、JSX、CSS selector 或其他實作答案。

每份檔案都有 `kind`，並且只會使用 `spec/schemas/` 中的一種 schema 驗證。執行：

```bash
uv run python scripts/lint_specs.py
```

重建時必須從 page dependency graph 展開，而不是從 screenshot 猜答案。Page
以 `shell_spec_id` 指定 persistent shell；component 以
`component_dependencies` 指定可重用的下層元件；API spec 必須展開元件需要的
每個 object field，不可留下由舊實作決定的不透明 record。Approved golden 仍是
結果 oracle；真正讓系統能在沒有 frontend 或 shared type source 時重建的資訊，
必須存在 design system、component hierarchy、payload fields、fixture identities、
states、interactions、copy 與 policies 中。

可檢查 YAML 語法、schema、唯一 ID，以及 BDD scenario 指定的測試檔。測試仍維持
獨立：它們用 BDD 註解連回 spec，但絕不解析 YAML。

Page 與 component 可指定 `runtime_authority`、可觀察的 `terminal_outcomes`
及 `test_constraints`。當外部 test runner、seed、動畫或中途 API response
可能被誤認為產品自身已完成流程時，必須使用這些欄位。Page scenario 可連到
server 行為測試，或 `e2e/` 下的 Docker Playwright 測試。

- `design-system`：共用設計原則、foundation token、desktop layout 與 accessibility invariant。
- `api`：request/response 格式、錯誤、truth boundary 與 BDD。
- `component`：輸入、資料依賴、狀態、互動、可見文字，以及連到 design system 的 visual contract。
- `page`：route、API 依賴、section 組成關係、頁面獨有行為、layout anchor 與 BDD。
- `domain`：entity、relation、invariant 與推導規則。
- `persistence`：store、read projection、固定 seed fixture 與 reset 規則。
- `policy`：跨層產品規則與 enforcement owner。
- `visual`：固定 page 或 component screenshot golden baseline 的定義。

API spec 通常使用 `/api/` path。同一個 contract kind 也涵蓋三個可觀察的
service endpoint：`/healthz`、`/readyz` 與 `/metrics`；schema 不接受其他
root-level HTTP path。

所有 YAML key 使用英文；敘述值與 BDD 內容可用最能清楚表達產品需求的語言。

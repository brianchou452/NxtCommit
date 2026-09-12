# 垂直切片交付模板

將此模板複製到 task handoff。只要 `known_incomplete_behavior` 或
`central_integration_required` 還包含 owned terminal outcome 所需工作，就不可把
切片標為完成。

```yaml
slice: <名稱>
base_commit: <sha>
owner: <A|B|C>
implemented_specs:
  - id: <spec id>
    scenarios: [<scenario id>]
    state: <foundation|integrated|verified|browser-verified>
runtime_entrypoints:
  - <路徑與 exported authority>
contract_tests:
  - <路徑與 assertion boundary>
outcome_tests:
  - <路徑、terminal state 與 timeout>
browser_journeys:
  - <route、actions 與 observed result>
central_integration_required:
  - <router、migration、reset、shared type、dispatcher 或 none>
known_incomplete_behavior:
  - <具體行為與受影響 specs，或 none>
verification:
  - command: <精確指令>
    result: <pass|fail|not-run>
```

接收者必須檢查列出的檔案與 outcome，不可只相信 branch 名稱、commit message、
測試數量或 visual 外觀。

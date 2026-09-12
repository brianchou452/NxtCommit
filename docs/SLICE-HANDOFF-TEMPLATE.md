# Vertical slice handoff

Copy this template into the task handoff. Do not mark the slice complete while
`Known incomplete behavior` or `Central integration required` contains work
needed for an owned terminal outcome.

```yaml
slice: <name>
base_commit: <sha>
source_branch: <branch>
source_commit: <sha>
target_branch: <branch>
worktree: <local directory; no credentials>
next_owner: <person or workstream>
deployment_state: <not-deployed|candidate|verified-serving>
serving_commit: <sha or unknown>
rollback: <procedure or not-applicable>
owner: <A|B|C>
implemented_specs:
  - id: <spec id>
    scenarios: [<scenario id>]
    state: <foundation|integrated|verified|browser-verified>
runtime_entrypoints:
  - <path and exported authority>
contract_tests:
  - <path and assertion boundary>
outcome_tests:
  - <path, terminal state, and timeout>
browser_journeys:
  - <route, actions, and observed result>
central_integration_required:
  - <router, migration, reset, shared type, dispatcher, or none>
known_incomplete_behavior:
  - <specific behavior and affected specs, or none>
verification:
  - command: <exact command>
    result: <pass|fail|not-run>
```

The receiver checks the listed files and outcomes rather than trusting the
branch name, commit message, test count, or visual appearance.

# Executable spec delivery evidence

Use this ledger during parallel implementation and integration. Spec lint proves
schema validity; it does not prove runtime behavior.

## Completion states

- `unassigned`: no owner.
- `foundation`: types, storage, routes, or UI exist but the terminal outcome is not proven.
- `integrated`: runtime wiring exists and contract tests pass.
- `verified`: an outcome test reaches the documented terminal state with bounded timing.
- `browser-verified`: the user-facing journey was exercised against the integrated app.

Only `verified` or `browser-verified` scenarios may be reported as implemented.

## Required ledger columns

| Scenario ID | Owner | Runtime authority | Wiring | Contract test | Outcome test | Timeout | Browser evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `execute-dispatch-union` | B | `ExecutionEngine` plus one runner | API → dispatcher → engine → store | response union and refusal | funded fixture reaches terminal evidence | 30 s | mission → run → review | `verified` |

The integrator updates this table or an equivalent generated artifact after each
slice merge. A route-only test belongs in `Contract test`, never `Outcome test`.

## Mandatory cross-slice journeys

1. Reset restores every slice's required graph, including executable fixtures.
2. A local fixture can be funded, dispatched, verified, accounted, and reviewed.
3. A metadata-only GitHub project cannot expose or bypass execution authority.
4. Authored data renders through marketplace and detail contracts without invalid numbers or missing localized fields.
5. Recovery leaves no running orphan, duplicate settlement, or manufactured verification.

Run `bash scripts/phase4-gate.sh` before declaring Phase 4 complete. Docker visual
results remain presentation evidence and cannot replace these outcome journeys.

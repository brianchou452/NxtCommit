# Executable specifications

One YAML file describes one design system, API, page, or reusable component. Specifications
describe observable product behaviour and data contracts; they must not copy
source paths, function names, JSX, CSS selectors, or other implementation
answers.

Every file declares `kind` and is validated against exactly one schema in
`spec/schemas/`. Run `uv run python scripts/lint_specs.py` to validate syntax,
schema conformance, unique IDs, and
the test files named by each BDD scenario. Tests remain independent: they link
back to a spec with a BDD comment and never parse YAML.

Pages and components may name a `runtime_authority`, observable
`terminal_outcomes`, and `test_constraints`. Use these fields when an external
test runner, seed, animation, or intermediate API response could otherwise be
mistaken for product-owned completion. Page scenarios may link either server
behaviour tests or Docker Playwright tests under `e2e/`.

The schemas cover:

- `design-system`: shared principles, foundation tokens, desktop layout rules,
  and accessibility invariants.
- `api`: request and response data shapes, errors, trust boundary, and BDD cases.
- `component`: inputs, data dependencies, states, interactions, visible copy,
  and a visual contract linked to a design system.
- `page`: route, API dependencies, composition relationships, page-owned
  behaviour, layout anchors, and BDD cases.
- `domain`: entities, relations, invariants, and derivation rules.
- `persistence`: stores, read projections, deterministic seed fixtures, and reset rules.
- `policy`: cross-layer product rules and their enforcement owner.
- `visual`: deterministic page or component screenshot golden baseline definitions.

API specifications normally use `/api/` paths. The same contract kind also
covers the three observable service endpoints `/healthz`, `/readyz`, and
`/metrics`; no other root-level HTTP path is accepted by the schema.

Reconstruction must start from the page dependency graph rather than from a
screenshot. A page names its persistent `shell_spec_id`; components name reusable
`component_dependencies`; API specs expand every object needed by those
components instead of leaving an opaque implementation-defined record. The
approved golden remains a result oracle, while the design system, component
hierarchy, payload fields, fixture identities, states, interactions, copy, and
policies contain the information needed to rebuild that result without existing
frontend or shared-type source files.

Fields and YAML keys are English. Narrative values and BDD prose may use the
language that best conveys the product requirement.

The shared run contract uses `endedAt` for terminal timestamps. `stalled` is a
mission state; run states are `running`, `succeeded`, `failed`, `budget_exhausted`,
`blocked`, and `cancelled`. The linter rejects drift between the domain and the
expanded latest-run API shape. Scenario files with explicit TODO/skip declarations
provide Phase 1 handoff traceability, not implemented behavior coverage.

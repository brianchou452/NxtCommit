# Product and website direction

[繁體中文](PRODUCT-DIRECTION.zh-TW.md)

> Status: product strategy, not implemented behaviour. For current capabilities,
> read [README](../README.md), [Architecture](ARCHITECTURE.md), and
> [Security](SECURITY.md).

## Product position

NxtCommit should be presented as an **auditable AI maintenance workflow
prototype**, not yet as a live marketplace:

> Turn a bounded maintenance request into engine-observed evidence that a human
> can review.

The differentiator is the evidence chain:

```text
compute pledge → runner attempt → engine-run verification
→ change-evidence package → NxtCommit demo decision
```

The marketplace metaphor explains prioritisation and shared compute, but it must
not outrun the product's trust boundary. Today, NxtCommit proves a workflow
over bundled fixtures. It does not yet prove identity, payment, arbitrary
repository isolation, upstream delivery, or real-world adoption.

## Primary audience

The first audience is people evaluating the workflow:

- open-source maintainers exploring bounded AI contributions;
- engineers designing agent verification and human review;
- potential contributors learning what evidence their compute produced;
- operators evaluating the safety and deployment shape.

Real maintainers accepting upstream pull requests and contributors spending
valuable credits become primary users only after identity, isolation, durable
execution, and GitHub delivery exist.

## Product principles

1. **Show provenance before polish.** Distinguish runner claims, engine
   observations, model review, static review, and seeded demo data.
2. **Make the next action obvious.** A mission page should answer what this is,
   whether it can execute, its state, and what the visitor can do.
3. **Separate executable and analytical paths.** Bundled fixtures can execute;
   public GitHub imports are metadata-only.
4. **Earn stronger language.** Use “change-evidence package” until a real pull
   request exists, and “recorded demo release” until an upstream release exists.
5. **Gate expansion on prerequisites.** Do not build marketplace promises on
   missing isolation, identity, or durable state.
6. **Keep the complete path demonstrable.** One guided fixture journey is more
   valuable than many shallow shelves.

## What to converge

### Product claims and vocabulary

Audit UI and documentation for terms that imply unavailable capabilities:

| Avoid implying | Use now |
| --- | --- |
| verified progress | reviewable progress |
| isolated repository | bundled fixture with application-level controls |
| pull request | change-evidence package |
| shipped or published release | locally recorded demo release |
| verified maintainer | demo maintainer persona |
| real adoption or impact | labelled seeded demonstration data |

Use the same definitions in package metadata, README copy, UI translations, API
labels, and screenshots.

### Marketplace home

The `v0.5.5` source candidate has replaced the repeated shelves with the chosen D
campaign direction: a motion-led impact hero, one fixed-proportion feature, four
compact campaigns, overflow in a continuation grid, and a separate demo route.
This is a source-state description, not deployment proof. The I18N-01 regression
in `99f2205` is fixed in the current source; rollout still needs its own evidence.
Continue convergence toward:

- one main mission list;
- lifecycle filters: Funding, Running, Review, Completed, Needs attention;
- one featured guided-demo mission;
- explicit source and capability badges on every mission;
- adoption or personal-impact modules only when provenance is known.

### Mission detail

The `v0.5.5` source candidate now prioritizes a unified campaign/funding hero,
plain-language story, disappearance scenario, scope, milestones, and a sticky
backing action. Its secondary sections still carry maintainer data, criteria,
milestones, risks, activity, adoption, backers, ledger entries, and every action.
The first screen should prioritise:

1. mission outcome and source;
2. executable versus metadata-only capability;
3. current state and next action;
4. acceptance criteria and evidence status.

Move ledger, backers, seeded adoption, and long activity history into secondary
sections or tabs.

### Mission creation

Split the entry point into two clearly named paths:

- **Run a bundled demo** — create an executable fixture mission;
- **Analyse a public repository** — read public metadata and issues, then create
  a candidate campaign draft.

The second path must not imply that the imported repository can be cloned,
executed, or submitted upstream.

### Gamification

Reputation, achievements, impact receipts, and rankings can remain as labelled
demonstrations. Do not make them the main navigation or growth loop until
identity, real pledges, and traceable adoption exist.

## What can be extended now

The read-only model-assisted extensions and their required observability gate
are sequenced in [Measured LLM expansion and Langfuse optimization](LLM-OBSERVABILITY-PLAN.md).
They remain secondary evidence layers and do not broaden repository execution.

These additions can use existing evidence and routes without claiming a new trust
boundary:

- a **How it works** page showing pledge, run, evidence, review, and local release;
- a **Trust and limitations** page distinguishing each provenance source;
- a guided `tempo-duration` demo with a visible start and completion checklist;
- a shareable run or case-study view;
- mission run history and baseline-versus-final test evidence;
- clearer runner-mode comparison, including Codex packaging limitations;
- an FAQ covering credits, local releases, GitHub metadata import, persistence,
  and sandbox boundaries;
- mobile navigation, a real not-found route, keyboard checks, and accessibility
  coverage.

## Extensions that require prerequisites

| Extension | Required first | Why |
| --- | --- | --- |
| Execute arbitrary repositories | per-run container or VM isolation, network policy, resource limits | Application-level controls are not a tenant boundary. |
| Real maintainer review | authentication, ownership verification, RBAC | A local button does not prove authority. |
| Open upstream pull requests | GitHub App, scoped tokens, branch policy, idempotency | Current artifacts never leave local state. |
| Durable concurrent missions | persistent database, durable queue, worker leases, recovery | Current state and workspaces are pod-local. |
| Real compute funding | metering, abuse controls, billing or credit policy | Current credits are demonstration accounting. |
| Adoption and impact ranking | versioned external sources and provenance | Seeded numbers cannot support real rankings. |

## Proposed information architecture

| Route | Purpose |
| --- | --- |
| `/` | Positioning, limitations, featured demo, short workflow |
| `/missions` | One filterable mission list |
| `/missions/:id` | Overview, capability, criteria, state, next action |
| `/missions/:id/runs` | Run history |
| `/runs/:runId` | Timeline, environment, tests, diff, budget, provenance |
| `/missions/:id/review` | Evidence and local-only human decision |
| `/analyze` | Public GitHub metadata-only analysis |
| `/new` | Choice between demo execution and repository analysis |
| `/how-it-works` | Workflow and evidence model |
| `/trust` | Trust boundary and limitations |
| `/contributors/:id` | Secondary demo profile |

This route list is a proposal. Only routes documented in
[Architecture](ARCHITECTURE.md) should be described as implemented.

## Delivery sequence

### P0 — Truth and information architecture

- audit product claims and use one vocabulary;
- label fixture, metadata-only, runner mode, and demo data at decision points;
- converge the home page and creation flow;
- add limitations, provenance, mobile navigation, and not-found handling;
- keep package, README, UI, and API wording aligned.

Success means a new visitor can correctly explain what is real, what is simulated,
and what happens after approval without reading source code.

### P1 — Core evidence experience

- separate Mission Overview, Runs, and Review;
- make run history directly addressable;
- group baseline, final tests, diff, budget, and provenance;
- add a guided demo and one honest case study;
- add bilingual browser journeys, keyboard checks, and accessibility coverage.

Success means a reviewer can reach one run's evidence without reconstructing it
from several pages.

### P2 — Platform foundations

Implement the isolation, identity, GitHub delivery, verification, and durable
execution work in [Roadmap](ROADMAP.md). Each foundation needs deterministic tests
and an updated threat model before it unlocks a product promise.

### P3 — Real marketplace

Only after P2 should the product add real pledges, maintainer onboarding, upstream
pull requests and CI, traceable impact, reputation, or discovery ranking.

## Deliberate non-goals

- payments, tradable tokens, blockchain, or a secondary credit market;
- arbitrary repository execution before per-run isolation;
- automatic merge, direct default-branch writes, tags, or package publishing;
- presenting local artifacts, local releases, or seeded adoption as external
  outcomes;
- allowing advisory model review to approve or reject a run;
- treating the current unversioned API as a public platform contract;
- claiming deployed Codex or broad framework support before packaging and
  verification exist;
- expanding social feeds, rankings, achievements, or marketplace shelves before
  the evidence workflow is clear.

## Decisions to validate

Before implementation, test these decisions with users:

1. Is the primary entry point “run the guided demo” or “analyse a repository”?
2. Do maintainers understand “change-evidence package” without a tooltip?
3. Which evidence—tests, diff, provenance, budget, or review—builds trust first?
4. Is compute pledging essential, or mainly a prioritisation metaphor?
5. What minimum external action makes the prototype useful: a draft PR, a patch
   download, or a verified report?

Record the answers as product evidence. Do not convert assumptions directly into
roadmap commitments.

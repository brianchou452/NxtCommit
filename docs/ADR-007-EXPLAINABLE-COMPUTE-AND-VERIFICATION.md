# ADR-007: Server-owned compute estimates and verification dossiers

**Status:** Accepted  
**Date:** 2026-08-13  
**Deciders:** CommonCommit maintainers

## Context

Campaign generation previously accepted a model-authored `computeGoal` and only clamped it to 2,400–50,000 credits. The deterministic demo used `LOC × 6 + issue characters ÷ 3`; GitHub metadata-only imports used issue length. None of these estimates exposed components, uncertainty, or calibration. Review artifacts showed a final suite summary and diff, but not every experiment and deterministic gate that admitted the change.

## Decision

1. `server-heuristic-v2` owns `computeGoal`. Model output may describe scope and risk, but its numeric goal is discarded.
2. The estimate stores observed inputs, five components (base, repository, issue, verification, risk), a low/high interval, confidence, caveats, and calibration metadata.
3. Repository scale uses measured LOC or file count when available. GitHub metadata-only imports receive a wider, low-confidence interval and explicitly say the tree and test runtime were not measured.
4. After at least three comparable successful runs, the estimator applies the median actual/estimated ratio, bounded to 0.75–1.5. Before that, the multiplier remains 1.
5. Review artifacts store a verification dossier: baseline plus every post-change suite execution, exit codes, test counts, deterministic gates, acceptance-criterion evidence, and provenance.
6. The UI calls this evidence, not a quality score or guarantee. It always surfaces residual uncertainty.

## Options considered

| Option | Assessment |
|---|---|
| Let the campaign LLM price itself | Flexible but uncalibrated, non-reproducible, and incentive-incompatible |
| One fixed credit floor | Predictable but ignores repository, issue, verification, and risk scope |
| Server-owned explainable estimate with bounded calibration | Reproducible, inspectable, and improves from actual runs without surrendering policy to the model |

## Consequences

- Backers can see what they fund and why the interval is wide or narrow.
- Repo owners can compare estimate with actual usage and inspect every experiment behind a proposed change.
- Existing seeded missions have no historical estimate; they remain readable and do not fabricate one.
- The heuristic is still a planning model, not a provider bill. Calibration must later segment by language, runner, test framework, and scope class once sample sizes support it.

## Follow-up

- Evaluate interval coverage, median absolute percentage error, budget-exhaustion rate, and unused-credit rate by release.
- Add criterion-to-test mapping only when the engine can prove it; never infer it from a green aggregate suite.
- Keep provider token usage and prototype credits visibly distinct.

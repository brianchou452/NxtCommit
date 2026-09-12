# Demo readability review — 0.7.36

[繁體中文](DEMO-READABILITY.zh-TW.md)

The user requested larger text throughout the visible demo. This intentionally revises commoncommit's compact typography while retaining its page content, stage model, animations and provenance. The initial audit records 259 undersized explicit declarations in 21 source files (`demo-readability-audit.json`); this is a declaration count, not a count of unique UI defects.

Readable copy now has a 14px floor; body copy and standard controls use 16px. The nine delivery stages expose their names, role tabs and mobile navigation wrap, guide panels scroll, and muted labels use darker colours. Display hierarchy, semantic progress colours, page order, card shapes and motion are retained.

Review scope: homepage, Demo, marketplace, mission authoring, campaign, My Commitment, Agent Lab and GitHub at 1440px and 390px; the complete maintainer path additionally covers execution, review, revision and local release at both widths. Automated checks inspect rendered text sizes and page overflow; screenshots document reflow. Existing keyboard and reduced-motion checks remain in the product suite. Historical approved goldens are retained; the intentional typography differences are governed by the updated design-system contract. Mobile visual baseline not covered: new mobile screenshots are review evidence, not replacement approved goldens.

No production pledges or reset are part of this UI verification. Server behavior, accounting authority and demo provenance remain unchanged.

Verification: 133 contracts valid, typecheck/build/version checks passed, 173 server tests passed. The full browser run passed 48 cases and found one mobile journey overflow; after correcting the analysis summary and review breadcrumb, both complete journeys passed again, covering all 49 cases across the runs. Screenshots are retained under `test-results/docker/interactive/artifacts` (page matrix) and `test-results/docker/product/artifacts` (final journeys).

Cloud CI additionally caught the transient pledge celebration exceeding mobile width before dismissal. Its panel now fits the viewport, including reduced motion. Four targeted regressions passed: desktop/mobile journeys and both mobile celebration modes. The integrated browser suite now contains 51 cases.

# NxtCommit Design System

The user selected commoncommit as the presentation authority for the integrated routes in 0.7.35. The exact source revision, intentional integration differences and verification scope are recorded in [COMMONCOMMIT-PARITY.md](COMMONCOMMIT-PARITY.md); its referenced source contracts supersede earlier NxtCommit-specific compositions for those routes. Historical approved images are retained, not overwritten.

> **Editorial crowdfunding × developer delivery system**
>
> Explain product value through bright narrative pages with generous whitespace; switch to technical interfaces with dotted signals for evidence, funding, and delivery milestones. Help non-engineers understand “what this update changes” first, while showing engineers “how it moves from Issue to Release.”

Synchronization baseline: **the website implementation, machine-readable spec, component/page/visual contracts, and approved goldens as of 2026-09-12**. This document is the English counterpart of the Traditional Chinese human-readable guide and design review checklist, not an executable spec.

## 1. Authoritative sources and conflict resolution

Design decisions follow this authority order:

1. [`spec/design-systems/nxtcommit.yaml`](../spec/design-systems/nxtcommit.yaml): design-system foundations and global invariants.
2. Component, page, and visual contracts: each component and page's structure, states, interactions, and visual contracts.
3. Approved goldens: approved rendering oracles used to determine whether desktop visual results satisfy the contracts.
4. This document: guidance for understanding, designing, and reviewing; it does not override the sources above.

If this document conflicts with the executable spec or contracts, **follow the executable spec/contracts and update this document accordingly**. If a golden conflicts with its upstream contract, do not resolve that conflict using this document alone; clarify and update the canonical artifact first. `src/styles.css` is the current website implementation reference, not a substitute for the spec.

## 2. Design principles

1. **Editorial clarity before decoration.** Each screen has one clear reading order; the concrete change delivered by a Release is the focus, while the repo, Issue, and technical category establish credible identity.
2. **Bright narrative, dark focus.** Keep the canvas and readable content bright; verifiable system states such as GitHub Evidence, pipelines, and delivery milestones may use deep indigo panels.
3. **Stable semantics across four dimensions.** Funding, development, verification, and adoption colours retain their meaning across pages and components; brand gradients cannot replace categorical colours.
4. **Motion explains relationships.** Dots, lines, and number updates must convey the direction of data, compute, or state; information remains complete when static or under reduced motion.
5. **Data has provenance; states have accountable owners.** Demo provenance, unknown measurements, GitHub Evidence, Maintainer Commitment, and Delivery Tracker must remain visible.

## 3. Foundations

### Typography

| Role | Font stack / rules | Usage |
| --- | --- | --- |
| Display sans | `DM Sans`, `Noto Sans TC`, `PingFang TC`, system sans-serif; `600–700` | Hero, section titles, Campaign titles, and primary outcomes; compact tracking is allowed. |
| Body sans | The same sans stack; `400–600` | Explanations, controls, descriptions, and long-form text. |
| Metadata mono | `ui-monospace`, `SF Mono`, Menlo, Consolas, monospace; `600–800` | Provenance, metrics, kickers, statuses, pipelines, and technical metadata; often uppercase with expanded tracking. |

Visible interface copy and pipeline labels use a minimum of `14px`; body text and standard controls use `16px` with comfortable line height. This user-requested readability revision supersedes the source’s compact typography. Preserve larger display headings and reflow layouts instead of shrinking text. Avatar initials and decorative icons are not body copy.

### Core colour tokens

| Token / role | Value | Usage |
| --- | --- | --- |
| Canvas / `bg` | `#fbfbfa` | Default page background; low-contrast violet/mint ambient gradients may be layered over it. |
| Surface | `#ffffff` | Cards, readable panels, and controls. |
| Ink | `#101110` | Primary text and highest-emphasis boundaries. |
| Muted | `#676b65` | Supporting explanations; must remain readable on bright surfaces. |
| Brand / funding | `#6657ff` | Product identity, primary actions, focus, and funding; context must be clear. |
| Gradient mint | `#28ebc7` | Continuous decorative gradients, live accents, and positive movement; not a new category. |
| Deep indigo | `#17152f` | High-contrast narrative, Evidence, and pipeline surfaces. |
| Line | `#e2e4df` | Lightweight separators and container outlines; avoid fragmenting the screen with excessive borders. |

### Four-dimensional semantic palette

This is the categorical progress palette used across the product and its pages. Any mark, track, legend, or status used across Campaigns or pages to identify a progress dimension uses its corresponding colour, not a brand gradient.

| Dimension | Colour | Meaning |
| --- | --- | --- |
| Funding | `#6657ff` | Funding progress, funding stages, and related data. |
| Development | `#0b9d81` | Development execution and agent/maintainer work progress. |
| Verification | `#277fa6` | CI, review, verification, and evidence states. |
| Adoption | `#c26b45` | Adoption, use, and impact after Release. |

Component-scoped exception: the homepage `release-update` component's existing four-stage **Funded / Plan / Maintainer decision / Release** accents are owned by `spec/components/release-update.yaml`. They represent only that component's linear delivery lifecycle, not a second product-wide categorical dimension palette. Outside `release-update`, or when building cross-Campaign or cross-page legends, use the Funding / Development / Verification / Adoption palette.

Functional states such as success, warning, and danger may use their own tokens, but cannot redefine the four dimensions. `#28ebc7` may serve as a continuous gradient or Community/live accent, but Community/live is still not a categorical progress dimension.

### Surfaces, radii, and shadows

- Standard cards use white surfaces, low-contrast borders, and soft neutral/violet shadows; approximately `22px` is the normal radius, within the canonical `18–24px` range.
- Feature panels such as heroes, maps, Campaign features, and release narratives use `28–44px`; `34px` is common, and large widescreen features may reach `44px`.
- Pill buttons, compact filters, statuses, and badges use `999px`.
- Feature depth may use broad, pale violet-tinted shadows with subtle inset highlights; do not make every surface look modal, or use pure black or heavy glass effects.
- Use glass only on surfaces that need spatial layering; preserve a readable fallback without `backdrop-filter`.

### Spacing and layout

- The base spacing step is `4px`; use deliberate multiples for controls, cards, and inline spacing.
- The default rhythm between major desktop sections is `7rem`; compact contexts may use corresponding smaller rhythms, without artificial blank height to prop up the layout.
- Desktop narrative/application content usually stays within `1440–1480px`; give long-form text a narrower readable measure inside the larger composition.
- Desktop gutters are at least `24px`. Full-width canvases may extend further, but text, focus, and primary actions must return to consistent content alignment.
- Content determines column count; resizing changes structure and reading order rather than proportionally shrinking a desktop screen.

## 4. Images, diagrams, and motion

Each Campaign card and its hero share one repo-specific concept, but the hero is a recomposed, expanded narrative rather than an enlarged card. Diagrams should reveal input, transformation, and output at a glance; repo names and technical categories provide identity, not a substitute for the benefit proposition.

```text
Mermaid: WORDS → Mermaid engine → DIAGRAM
WhisperX: raw speech → aligned words → natural subtitles
PDF.js: scanned PDF → readable / searchable document
```

Enter transitions take approximately `350–700ms`. Ambient loops should be low-frequency and never disrupt reading; small signal pulses may take approximately `2.1–2.4s`, while larger background loops may use a slower rhythm. Motion may only support understanding, never become a prerequisite for discovering content, states, or actions; `prefers-reduced-motion` must remove loops/transforms and display the final visible state directly.

## 5. Components and narrative language

### Labels and technical panels

- Eyebrows/system labels may use small mono, uppercase, and expanded tracking to identify `GITHUB EVIDENCE`, `FUNDING`, or a pipeline stage; do not pile up tags.
- Dark panels use deep indigo, low-contrast dotted grids/inner borders, and restrained violet/mint light; categorical signals still use the four-dimensional palette.
- Bright panels use white or very pale gradients, thin borders, and sufficient padding. Choose one primary container logic for adjacent content to avoid a card wall.

### Evidence and delivery

- GitHub Evidence clearly shows sources, counts, provenance, Issue/Discussion identifiers, and plain-language explanations.
- The Evidence decision chain is `AI organizes the scope → Maintainer confirms the scope`; do not imply that AI decides the roadmap, merge, or release on the Maintainer's behalf.
- Funding, Development, Verification, and Adoption use their dimension colours in trackers and show GitHub associations, the last update time, the next accountable role, and demo/real-data labels.
- Community Support communicates collective progress toward Release, not an e-commerce review wall; messages remain scannable, and motion only indicates the direction of convergence.

## 6. Homepage structure

The current homepage section order is:

```text
hero → how → map → projects → mvp
```

- `hero`: platform promise, primary CTA, and live delivery signal.
- `how`: explain the mechanism from support to delivery.
- `map`: show global/community compute convergence.
- `projects`: organize Campaigns/projects around outcomes people care about.
- `mvp`: close with the actionable product workflow and current scope.

When adding, removing, or reordering homepage sections, update the page/visual contract first, then synchronize this section. Do not treat the old “global distribution → delivered Releases → shelves → community voting” list as current reality.

## 7. Desktop and mobile contracts

The current YAML/approved-golden visual baseline contracts cover **desktop only**. Desktop review must check content width and gutters, first-screen reading order, primary actions, keyboard focus, the four-dimensional states, and content availability without hover/motion, using approved goldens as the result oracle.

Mobile responsive CSS is an additional implementation in the existing website: it changes multiple columns to one or fewer columns, removes sticky behaviour unsuitable for small screens, turns horizontal flows vertical, and adjusts gutters. It must still meet content, interaction, contrast, touch-target, and reduced-motion requirements. However, until mobile goldens/visual contracts exist, **do not claim that a mobile visual baseline is covered or accepted by goldens**.

## 8. Accessibility invariants

- Normal text and meaningful controls meet WCAG AA on every declared surface; low-contrast colours are decorative only.
- Keyboard focus uses a clear `2px` violet outline separated from the control edge.
- Actions support keyboard and touch with usable target sizes; information and actions do not depend only on hover, colour, or motion.
- After reduced motion disables loops and transforms, every state, item, and reading order remains completely visible.
- Visual polish does not hide demo provenance or unknown measurements.

## 9. Design review checklist

Perform the review in order and retain evidence such as screenshots, contract checks, or issue links:

- [ ] Check the relevant YAML, component/page/visual contracts, and approved goldens first; do not override the executable spec with this document.
- [ ] Homepage desktop order is `hero → how → map → projects → mvp`, with no leftover old section order.
- [ ] Canvas, surface, ink, muted, brand/funding, gradient mint, and deep indigo use the correct tokens.
- [ ] Funding / Development / Verification / Adoption use only `#6657ff` / `#0b9d81` / `#277fa6` / `#c26b45`, with consistent meanings in legends and components on the same page.
- [ ] Display/body use the DM Sans + Noto Sans TC stack; mono is limited to metadata/pipelines and does not shrink body or button text.
- [ ] Standard cards are approximately `22px`, and feature panels are within `28–44px`; shadows create depth without making every card look modal.
- [ ] Check desktop content width, gutters of at least `24px`, reading order, and consistent semantic gaps defined by the page contract; `7rem` is the design-system major-section default, while Home may use a tighter rhythm according to its contract.
- [ ] Primary content, states, focus, and actions do not depend on hover or motion; keyboard operation and `prefers-reduced-motion` have been exercised.
- [ ] Repo-specific main diagrams explain actual inputs/transformations/outputs rather than generic decoration with a renamed label.
- [ ] GitHub Evidence, demo provenance, unknown measurements, Maintainer accountability, and next-step roles remain clear and visible.
- [ ] Compare desktop results against approved goldens individually; differences have corresponding contract changes or are recorded as defects.
- [ ] Check mobile reflow, touch, readability, and functionality; without mobile visual contracts/goldens, explicitly state “mobile visual baseline not covered” in the review outcome.

## 10. Prohibited patterns

- Do not use the GitHub dark theme as the whole-page background; deep indigo is reserved for credible technical anchors or high-contrast narrative panels.
- Do not promote or copy `release-update`'s Funded / Plan / Maintainer decision / Release component-local stage accents into a product-wide palette; Community/live mint is not a categorical dimension either.
- Do not replace the four-dimensional semantic palette with brand gradients, mint live accents, or functional state colours.
- Do not let Issues, repo names, technical metrics, or an AI black box replace the human benefits of Release or the Maintainer's decision authority.
- Do not use meaningless cursors, floating cards, diagonal comment walls, or purely decorative motion as the main visual.
- Do not squeeze critical information into fixed small text, or claim visual acceptance for a viewport not covered by contracts/goldens.

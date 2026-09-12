import { test } from 'node:test';
import { authoringCases } from '../test-support/authoring.js';

/**
 * Spec: api.ai-feedback
 * Scenario: feedback-is-bounded
 * Given A supported AI feature exposes a valid trace id.
 * When Helpful feedback is submitted.
 * Then Only the named score is attempted and actor remains visibly unauthenticated.
 */
test('api.ai-feedback / feedback-is-bounded', authoringCases['feedback-is-bounded']!);

/**
 * Spec: api.campaign-critique
 * Scenario: critic-is-advisory
 * Given A trusted draft remains bound to its analysis.
 * When Critique runs.
 * Then Advice is returned separately and the draft is not mutated or published.
 */
test('api.campaign-critique / critic-is-advisory', authoringCases['critic-is-advisory']!);

/**
 * Spec: api.campaign-generation
 * Scenario: campaign-mode-is-explicitly-labelled
 * Given A trusted analysis and selected issue exist.
 * When Generation is requested.
 * Then The draft records its actual generator and invalid requested modes fail loudly.
 */
test('api.campaign-generation / campaign-mode-is-explicitly-labelled', authoringCases['campaign-mode-is-explicitly-labelled']!);

/**
 * Spec: api.issue-assistant
 * Scenario: assistant-stays-issue-bound
 * Given A trusted analysis identifies one issue.
 * When Assistance is requested.
 * Then Suggestions remain bounded to that issue and carry generator evidence.
 */
test('api.issue-assistant / assistant-stays-issue-bound', authoringCases['assistant-stays-issue-bound']!);

/**
 * Spec: api.llm-validation
 * Scenario: validation-is-nonsecret-and-nonauthorizing
 * Given Model configuration may or may not be valid.
 * When Fresh validation runs.
 * Then Non-secret evidence is returned and execution mode is not promoted.
 */
test('api.llm-validation / validation-is-nonsecret-and-nonauthorizing', authoringCases['validation-is-nonsecret-and-nonauthorizing']!);

/**
 * Spec: api.mission-create
 * Scenario: mission-creation-trusts-server-snapshots
 * Given Matching live capabilities hold analysis and draft.
 * When Mission creation is requested repeatedly.
 * Then Client edits are ignored and the same bound mission is returned.
 */
test('api.mission-create / mission-creation-trusts-server-snapshots', authoringCases['mission-creation-trusts-server-snapshots']!);

/**
 * Spec: api.project-explanation
 * Scenario: project-explanation-route
 * Given A known project may or may not have a working model credential.
 * When Explanation is requested.
 * Then Real output or labelled demo fallback is returned without inventing missing measurements.
 */
test('api.project-explanation / project-explanation-route', authoringCases['project-explanation-route']!);

/**
 * Spec: api.repository-analysis
 * Scenario: analysis-preserves-observation-boundary
 * Given A fixture or public GitHub URL is supplied.
 * When Analysis runs.
 * Then Only observed fields are present and a server capability binds later operations.
 */
test('api.repository-analysis / analysis-preserves-observation-boundary', authoringCases['analysis-preserves-observation-boundary']!);

/**
 * Spec: component.campaign-authoring
 * Scenario: authoring-separates-model-and-policy
 * Given A trusted issue may use real or demo generation.
 * When Draft and critique render.
 * Then Generator provenance is separate from deterministic estimate and publish remains local.
 */
// Browser outcome coverage: e2e/computer-c.e2e.spec.ts (authoring-separates-model-and-policy).

/**
 * Spec: component.design-concept-shell
 * Scenario: standalone-concept-shell-has-no-product-effects
 * Given Visitor opens a concept home or campaign route
 * When They navigate, switch local language, or adjust mock backing controls
 * Then Only local exploration state changes and the demo disclosure remains present
 */
// Browser outcome coverage: e2e/computer-c.e2e.spec.ts (standalone-concept-shell-has-no-product-effects).

/**
 * Spec: component.repository-analyzer
 * Scenario: github-analysis-stays-metadata-only
 * Given User selects a public GitHub repository.
 * When Analysis completes.
 * Then Coverage identifies metadata observations and UI makes no clone full-tree or execution claim.
 */
// Browser outcome coverage: e2e/computer-c.e2e.spec.ts (github-analysis-stays-metadata-only).

/**
 * Spec: page.design-concepts
 * Scenario: concepts-remain-clearly-nonproduction
 * Given Visitor opens a concept route.
 * When Static mock interactions render.
 * Then No product API effect occurs and the exploration disclosure remains visible.
 */
// Browser outcome coverage: e2e/computer-c.e2e.spec.ts (concepts-remain-clearly-nonproduction).

/**
 * Spec: page.new-mission
 * Scenario: wizard-preserves-trusted-capabilities
 * Given Visitor progresses from analysis to publication.
 * When Each asynchronous step completes or fails.
 * Then The UI preserves server provenance and never treats client edits as trusted repository facts.
 */
// Browser outcome coverage: e2e/computer-c.e2e.spec.ts (wizard-preserves-trusted-capabilities).

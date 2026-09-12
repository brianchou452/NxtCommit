# Cloud assurance lane

[繁體中文](ASSURANCE.zh-TW.md)

The judge-facing view starts with what is tested, this cycle's measured result,
and the next step. Six stages explain model advice versus engine verification;
observed checks are grouped into response quality, provider failures, privacy
and system recovery. IDs, usage and individual assertions remain expandable.
Latest activity is separate from the selected historical record. No data is
shown as unknown, and missing comparable baselines never imply improvement.

The Agent Lab at /assurance exposes six persisted stages: plan, safety, chaos,
assessment, experiment review and iteration. A Cloudflare Worker cron invokes the
operator-only endpoint every five minutes; it awaits the terminal result. The
existing hackathon shutdown cutoff remains authoritative.

The lane reuses ExperimentAgent, ChaosAgent and the SQLite-checkpointed LangGraph
workflow. Four bounded Assistance calls provide planning, residual-risk review,
result interpretation and next-cycle hypotheses. Provider model, response ID,
latency, usage and explicit fallbacks are shown. Only summaries are displayed;
private model reasoning is neither requested nor exposed. Prior iteration advice
feeds the next plan, while all 19 catalog scenarios run twice regardless of advice.
A compatible prior run provides regression/recovery comparison. Tests decide the
outcome; models cannot skip cases, select commands, modify source or approve a
release. Source repair remains the separately controlled local self-update lane.

Faults use synthetic transports and private in-memory application databases.
They do not target the serving demo database. These are real module tests over
controlled faults, not arbitrary-repository tests or a security certification.
The mission engine remains a scripted fixture runner with measured test/diff
evidence in its verification dossier. A lab green result cannot promote a mission.

GET /api/assurance is public read-only. POST /api/assurance/run requires the
existing OPENAI_CHECK_TOKEN bearer capability. No public spending button exists.
Requests coalesce to one active cycle; five-minute cooldown limits repeated calls.
Each cycle has a 120-second abort signal and at most four model calls. Responses
retain known input/output tokens separately from calls whose usage is unknown.
No model retry or source promotion is automatic. A Worker scheduled failure is
reported as a scheduler error rather than an accepted dispatch.

Latest 40 reports are exposed from a separate SQLite database. On process reopen,
unfinished rows become interrupted. Container replacement can lose this ephemeral
history. Checkpoints and measurements remain under the assurance directory;
this is not an external durable audit service. The page polls every two seconds,
stops animation on disconnect, supports reduced motion and English/Traditional
Chinese. Navigation to historical runs never starts work.

For local operation set AGENT_ASSURANCE_ENABLED=1 and an operator token through
an ignored environment file. Cloud entry enables this lane explicitly; private
chaos test applications never inherit it. Use /__deployment to match the serving
commit and /api/assurance to inspect terminal records. Configuration and a cron
expression alone do not prove any scheduled cycle executed.

Validation: server/agents/assurance.test.ts covers real terminal measurements,
concurrent requests, cooldown, unauthenticated denial, public-data containment,
unchanged demo data, reopen, disabled scheduling and safe failures.
e2e/assurance.e2e.spec.ts reaches terminal measurements in both locales on desktop
and mobile. gateway.test.mjs checks scheduled forwarding and failure propagation.
Actual deployment and live provider evidence belong in the dated delivery report.

[Cloudflare scheduled handlers](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)

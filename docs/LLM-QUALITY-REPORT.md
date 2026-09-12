# LLM speed and quality check — 2026-09-12

[繁體中文](LLM-QUALITY-REPORT.zh-TW.md)

The v3 candidate uses feature-specific short bilingual advice, keeps evidence as valid JSON, prioritizes source/status fields, validates output before successful caching, and links cache hits to the original Langfuse trace. Campaign critique receives the selected issue. Existing model, timeout, concurrency/call limits and non-authorizing fallback remain in place.

## Bounded live comparison

Same six authored CSV examples, two fresh calls per feature per version, `gpt-5-mini-2025-08-07`, Responses, no cache or Langfuse export in this isolated comparison. Baseline is image `nxtcommit-llm-live:0.7.18`; candidate is the dedicated image `nxtcommit-llm-quality:0.7.23` including latest main integration. Runs were sequential, not randomized; provider/network variation and one slow baseline call affect the means. This is a smoke comparison, not a confidence interval or production p95 estimate.

| Metric | Before (12 calls) | Final candidate (12 calls) |
|---|---:|---:|
| Mean request latency | 2,977 ms | 2,233 ms |
| Median | 2,408 ms | 2,252 ms |
| Maximum in sample | 6,896 ms | 2,704 ms |
| Input tokens, total | 1,950 | 2,888 |
| Output tokens, total | 1,620 | 1,252 |
| Labelled fallback | 0 | 0 |

Mean latency decreased 25.0%; median decreased 6.5%; output tokens decreased 22.7%. Input tokens increased 48.1%, so total tokens/cost are **not** claimed to decrease. Per-feature timing still varies; faster responses are not guaranteed.

## Correctness checks and limits

The initial candidate was rejected after reviewing a shadow response that incorrectly speculated about JavaScript `trim()` removing quotes. The final shadow task asks for concrete inputs based on exact operation semantics. Final answers proposed comparing quoted-comma inputs or outer whitespace, without asserting a defect. Critique now asks for missing test examples and preserves headers versus data values. Evidence explanation retained authored-demo provenance and unknown criterion status; project explanation stopped repeating irrelevant system instructions.

All final 12 answers had bilingual content and measured provider usage. These are agent-reviewed authored examples, not a blinded human evaluation or proof that hallucination is eliminated. Shortness and Traditional Chinese are targets, not hard guarantees; a few generated characters still used Simplified Chinese, and generated sample quoting may still need editorial cleanup. No model prose can change execution/review gates.

Four additional live calls covered chaos planning, experiment review, safety review and iteration planning. All returned measured bilingual advice without authorizing production fault injection. These calls verify availability, not comparative quality superiority; safety advice remains advisory and can be vague. The production experiment runner remains controlled/scripted.

Regression coverage includes invalid bilingual output, recovery after the 10-second negative cache, source/unknown-status preservation, concurrent request deduplication, one trace export, and feedback on a cached response. Trace export contains metadata only. Use source rollback for a prompt regression; no remote prompt is required.

## Reproduction

`scripts/ci/probe_llm_quality.mjs` performs exactly 12 billable calls on authored examples from the built application root with `OPENAI_API_KEY` supplied in the environment. It prints those authored-case summaries and measured provenance, never credentials. Local raw results are ignored artifacts: `llm-quality-before.jsonl`, `llm-quality-after-pinned.jsonl`, `llm-quality-agents.jsonl`. The first rejected candidate is retained separately as `llm-quality-after.jsonl`.

Cloudflare release, end-to-end and Langfuse readback results are recorded below after deployment verification.

Local verification: 162 code tests and 42 Docker browser E2E tests passed. E2E_IMAGE isolates image tags across simultaneous worktrees. The Assurance GET probe now supplies the application User-Agent: live default Python UA returned 403 while the application UA returned 200.

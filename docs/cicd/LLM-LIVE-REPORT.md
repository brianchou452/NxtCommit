# Cloudflare LLM and Langfuse live report — 2026-09-12

Product LLM calls and the NxtCommit project on Langfuse Cloud US/Hobby are live. Five real generations were read back. Tested source `47c564d03cc5d58f97ccdd59fd0c63ced9d294f2` (0.7.19), at 13:53–13:54 Asia/Taipei. [Langfuse dashboard](https://us.cloud.langfuse.com/project/cmtxyhuhu068yad0cclmultr7/traces) · [Successful deployment](https://github.com/brianchou452/NxtCommit/actions/runs/34676486249).

Baseline `f4f1c13` had a working operational Responses check (2.331 seconds) but product validation said unconfigured. The production entrypoint omitted authoring configuration and its Chat Completions adapter did not match the Responses-only key. `b27a764` connected the entrypoint/API and added measured timing, usage, model, response ID and release metadata. Teammate integration `47c564d` retained caching, two concurrent model calls, 120 calls/process/hour and protected reset. A previously unconfigured response is not a model-speed baseline.

| Feature | HTTP seconds | Model/service seconds | New tokens | Langfuse |
|---|---:|---:|---:|---|
| issue-triage-1 | 4.591 | 3.338 | 380 | verified |
| issue-triage-2 | 0.831 | 0.000 | 0 | cache; no new generation |
| issue-triage-3 | 0.977 | 0.000 | 0 | cache; no new generation |
| campaign-generation | 4.260 | 3.457 | 371 | verified |
| campaign-critic | 3.370 | 2.770 | 362 | verified |
| evidence-explanation | 4.119 | 3.393 | 1306 | verified |
| shadow-review | 3.850 | 3.179 | 1305 | verified |

All five fresh calls used `generator=openai`, model `gpt-5-mini-2025-08-07`, totaling 2,852 input + 872 output = 3,724 tokens. Two cache hits reused the response ID and generated no new provider call or generation export. Cloud counters: calls=5, cached=2, fallback=0, exports success=5/failure=0. Repeating the same issue request reduced HTTP time from 4.591 seconds to 0.831/0.977 seconds (79–82%); this does not generalize to every journey.

The live flow performed fixture analysis → LLM draft → new mission → demo funding → engine execution → needs_review. Funding-to-observed-terminal took 3.289 seconds with 5/5 measured tests passing; run `257b0435-e6c3-49cb-8e7b-12538415083c`. No shared reset or approval was performed. Fixture edits remain scripted demo; tests/diffs are engine evidence and model advice cannot approve or merge.

Verification went beyond ingestion HTTP 200: v2 observations returned all five trace IDs with matching GENERATION type, model, usage, nonzero duration and release; the browser table also displayed them. A separate transport-check SPAN is excluded from model results. Only metadata is exported, without prompts, repository text, generated prose or credentials. Cache hits have no new trace; use the cached counter alongside Langfuse. TTFT is not measured because requests are not streamed.

Acceleration assessment: uncached mean HTTP 4.038 seconds versus mean model/service processing 3.227 seconds (~80%). The remainder includes client networking, application work and synchronous trace export, not solely Langfuse overhead. Keep Cloudflare basic; no CPU/memory upgrade or self-hosted Langfuse server was added. Minimal reasoning, concise bilingual output and five-minute cache are enabled. Next compare shorter output on the same examples, then evaluate streaming for perceived responsiveness; consider bounded asynchronous export if measured export overhead warrants it. Those follow-ups are not implemented or measured here.

Limits: one Taiwan client, small sample, live HTTP product APIs; not a concurrent LLM load test, long soak or semantic-quality benchmark. This change passed 101 local server tests, 38 Docker journeys, eight delivery tests and production-image smoke; current integrated CI additionally checks 106 server tests and 39 journeys. Existing visual differences were untouched. One HTTP 500 was observed during the first rollout switch, followed by successful HTTPS identity/readiness: no zero-downtime claim. Langfuse account/retention is independent of the application cutoff at 2026-09-13 01:00 Taipei and is not automatically deleted with it.

```bash
python3 scripts/ci/probe_llm_product.py --expected-sha 47c564d03cc5d58f97ccdd59fd0c63ced9d294f2 --output artifacts/llm-product-traced.json
python3 scripts/ci/verify_langfuse_product.py
```

Reproduction incurs bounded provider calls and creates one demo mission; verification uses ignored mode-0600 `.env.langfuse`.

[Langfuse OTLP mapping](https://langfuse.com/integrations/native/opentelemetry) · [Observations API](https://langfuse.com/docs/api-and-data-platform/features/observations-api)

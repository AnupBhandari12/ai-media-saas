# Real AI Stage 01 - official model + cost evidence

Model: `gpt-6-luna`, documented on 2026-10-19 at https://developers.openai.com/api/docs/models/gpt-6-luna . Standard text pricing $0.10 input / $0.50 output per 1M tokens. Vision images also consume billable input tokens; do not present text-only estimates as an upper bound. Usage returned by provider is required before cost accounting. Actual billed charges may vary due to cached/long input, region, pricing changes, etc.

Existing `lib/ai/openaiProvider.mjs` is NOT modified; it is disconnected from public paid routes. This kit never touches or sets `OPENAI_API_KEY` and does not authorize provider spending. No package install or environment update at this stage.

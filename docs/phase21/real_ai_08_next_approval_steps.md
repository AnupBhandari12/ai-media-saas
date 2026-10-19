# Stage 08 - safe real-provider *integration preparation* handoff

Important: This master kit is NOT the release of real AI features. It adds actual official provider request shapes for Caption and Vision, offline-mock transport tests, a verified pricing snapshot, isolated-DB inspection, spend/credit gates, and private-result planning. No public paid provider route, DB migration, paid call or storage side effect is enabled. It remains unsafe to enable live operations without audited durable quota + global USD cap, idempotency and output retention.

Next separately ask user for:
1. A concrete per-day and total USD ceiling (0 by default). Avoid claiming ChatGPT Plus includes API credits.
2. Explicit approval to create/use a *new empty* Neon test DB; inspect host IDs before any migration. Separate from existing production DATABASE_URL / DATABASE_URL_POOLED.
3. If approved later, user creates secret `OPENAI_API_KEY` (and remove.bg API key for background) in `.env.local` locally; NEVER paste keys into ChatGPT or set NEXT_PUBLIC_* for secrets.
4. Provider fake tests + real isolated concurrency/ledger verification, then small approved trial calls. Record actual usage and provider charges. No blind retry of UNKNOWN.
5. Private B2 output, owner-only download, full browser/mobile E2E and explicit deployment approval.

No package installation or environment change was required in Stages 01–08. A separate gated activation implementation is still required. Do not enable based on this kit alone.

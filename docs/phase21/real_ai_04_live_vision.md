# Phase 21 — Live AI Vision Alt Text (controlled beta)

- Uses existing authenticated Clerk user, existing shared daily/monthly quota, existing AiGlobalBudget and AiSpendReservation tables. NO new migration.
- Transport remains disabled unless BOTH `AI_REAL_ALT_TEXT_ENABLED=true` and `AI_REAL_SPEND_APPROVED=true` on the server. The API key stays private as `OPENAI_API_KEY`.
- Strict same-origin POST, 2MB transport cap, PNG/JPEG/WebP signature and full server Sharp pixel decode. Server is the authority for dimensions (4MP / 4096px per side).
- A unique UUIDv4 and image SHA256 identify one reservation. Unknown provider/completion outcome must NOT be automatically retried or refunded. Reserved micro-USD are held for reconciliation.
- API sends image data to OpenAI only when the user explicitly clicks Generate real AI Alt Text. Do not test with private third-party photos without consent.
- USD global budget in database is a conservative application reservation ceiling, NOT an OpenAI account billing cap.
- Validate with synthetic sample image first. An HTTP 409 means inspect usage/DB manually; do not blindly retry.
- This stage does not add remove.bg or B2 uploads; those remain separate.

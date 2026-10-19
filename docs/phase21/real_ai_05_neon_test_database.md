# Stage 05 - real DB isolation gate (NO CONNECTION)

Current project uses `DATABASE_URL` for Prisma migrations and `DATABASE_URL_POOLED` for runtime, so be careful: both may target production Neon. The current schema has AiQuotaBucket.limitValue and AiActionRequest, but *no* BgCreditBucket or BgCreditReservation. Do not run `prisma migrate dev`, `prisma db push`, or any write using current `.env.local`.

Next separately obtain a new EMPTY Neon project with no production data, review host/project ID and both new connection strings, and authorize a test-only migration. Do NOT put credentials in chat or commit. This static inspector is not real database introspection.

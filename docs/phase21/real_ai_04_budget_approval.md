# Stage 04 - paid spend safety, review only

Per-user quota is NOT the same as a global USD budget. The current prototype cannot guarantee a fixed spend ceiling during concurrent requests and provider errors. A real live release must reserve both shared per-user AI_ACTION day/month and operator USD spend budget *atomically* on an isolated test DB before sending a request, require explicit user + operator approval, and treat unknown outcomes as held/not retried.

Never use `.env.local` booleans or a client payload as a substitute for a durable reservation. There are no DB writes/migrations in Stage 04.

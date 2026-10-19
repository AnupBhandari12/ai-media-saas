# Stage 02 - real OpenAI Caption transport contract, NOT LIVE

`lib/ai/realAiCaptionTransport.mjs` has a real Responses API payload, a correctly validated `gpt-6-luna` response, actual `usage` requirement, 20-second timeout, stateless `store:false`, and **no retry**. The network function is injected: tests use fake fetch, and the script never calls the network. Runtime requires `enabled===true` and `serverApproval===true`; no page or API route imports this function.

A future approved route also requires Clerk owner authorization, origin/content-length validation, *durable USD pool reservation*, atomic per-owner day/month quota, request idempotency, reconciliation and paid API approval. These are NOT obtained merely by setting environment variables. No OpenAI key yet.

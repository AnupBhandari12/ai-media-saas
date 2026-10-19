# Phase 21 / Commit 10H — Local inspection + schema blocker review

**NO paid background removal. NO database write, migration or storage upload.**

This commit adds an opt-in **local developer-only** `POST /api/ai/background/inspect` endpoint. It is disabled unless the server runs in development with `AI_BG_LOCAL_INSPECT=1`, and the URL hostname is `localhost`, `127.0.0.1` or `[::1]`.

After Clerk authentication and exact `Origin` match, the endpoint reads bounded raw PNG/JPEG/WebP bytes (max 4 MiB). It checks Sharp metadata under 4 megapixels **before** the existing complete RGBA decoder, and uses 10C/10D to verify the full image content. It queries shared AI quota **read-only**, returning only format, dimensions, byte count and actual existing quota. It never returns a background-removed image. The UI Remove button is still disabled.

Example manual developer test (browser signed in; from browser developer console on `http://localhost:3000` only):

```js
const file = /* File chosen using your local developer tools */;
const response = await fetch('/api/ai/background/inspect', {
  method: 'POST',
  headers: { 'Content-Type': file.type },
  body: file,
});
console.log(response.status, await response.json());
```

Do not put image data in JSON and do not set provider flags. This is intentionally **not** connected to the regular Background Remover page.

## Critical blockers before real processing

The 10G review SQL defines `BgCreditBucket` OWNER counters separately from the pre-existing `AiQuotaBucket`. Incrementing the first **does not count against the second**. Before approval of any migration or dispatch, resolve this double-accounting risk, map the actual Prisma models to the live Neon schema, prove multi-instance concurrency and request idempotency, add durable result storage, completion/reconciliation ledgers, operator-only provider credit budget, and obtain explicit approval for vendor spending.

Run `bun scripts/phase21/auditBackgroundSchema.mjs` for a static audit of the local schema. This reports `BLOCKED` by design; it neither alters data nor proves the database matches the schema. Do **not** run review SQL on the production branch.

Do not expose this inspection feature to hosted production or set any paid API enable flags.

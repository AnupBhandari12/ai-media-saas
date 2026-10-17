# Phase 19B1 — Job reservation API (not processing)

This folder contains only NEW files for the existing `D:\ai-media` repository.

## Add locally to `.env.local` (never commit it)

```
WORKER_JOBS_ENABLED=true
```

## New routes

- POST `/api/worker/jobs` creates a metadata-only job reservation. Supported: PDF-20 DOC/DOCX, PDF-21 PPT/PPTX, PDF-22 XLS/XLSX.
- GET `/api/worker/jobs` lists the signed-in user's latest 10 document jobs.
- GET `/api/worker/jobs/:id` reads the signed-in owner's job.
- DELETE `/api/worker/jobs/:id` cancels a PENDING job awaiting upload.

Jobs are not sent to Docker. No document upload, no output, no credits charged. Tool registry remains unchanged (COMING_SOON).

## Local steps

1. Put the `lib`, `app`, `tests`, `docs` files into project root (merge folders without deleting old files).
2. Put `WORKER_JOBS_ENABLED=true` into your local `.env.local`.
3. Run `bun test`, `bun run lint`, `bun run build`, `bun run dev`.
4. Sign in and open `/dashboard` then open browser DevTools Console.
5. Run:

```js
const created = await fetch('/api/worker/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    toolId: 'PDF-20', filename: 'sample.docx', bytes: 1024,
  }),
}).then(async r => ({ status: r.status, body: await r.json() }));
console.log(created);
```

Expected HTTP 201, status PENDING, stage AWAITING_UPLOAD.

6. GET list:

```js
const listing = await fetch('/api/worker/jobs').then(r => r.json());
console.log(listing);
```

7. GET own id / cancel own reservation (using the created variable):

```js
const id = created.body.job.id;
console.log(await fetch(`/api/worker/jobs/${id}`).then(r => r.json()));
console.log(await fetch(`/api/worker/jobs/${id}`, {method:'DELETE'}).then(r => r.json()));
```

8. Verify invalid document type => HTTP 400; signed-out request => HTTP 401; another user's ID => HTTP 404. Avoid making many jobs due to reservation limits.
9. Run tests again and commit.

## Limits and security

- API disabled unless `WORKER_JOBS_ENABLED=true`.
- Clerk userId from auth, never from request.
- 25 MiB expected file limit; client metadata will be checked against REAL uploaded bytes in 19B2.
- Per-owner soft caps: 20 reservations/month, 3 active jobs created during last 30min. These are not atomic under concurrency and not yet a production quota solution.
- Public DTO does not expose storage paths or internal references.
- No database migration or Docker rebuild needed.

## Phase 19B2/B3 still needed

Private object storage, authenticated file upload, content validation, transactional quota reservation, job dispatch, worker auth/isolation, status processing, output links, cleanup and retries.

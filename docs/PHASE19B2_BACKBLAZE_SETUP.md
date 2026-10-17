# Phase 19B2 — Backblaze B2 migration

This small patch replaces ONLY `lib/worker/objectStorage.js`. It preserves all other Phase 19B2 routes, tests, and validation rules. Do not merge it with the old R2 provider settings.

## 1. Local configuration

In `.env.local` (do not commit), set:

```dotenv
WORKER_JOBS_ENABLED=true
WORKER_UPLOADS_ENABLED=true
B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
B2_REGION=us-east-005
B2_BUCKET_NAME=ai-media-temp-documents
B2_KEY_ID=YOUR_BACKBLAZE_KEY_ID
B2_APPLICATION_KEY=YOUR_BACKBLAZE_APPLICATION_KEY
```

The last two must be the Backblaze *application key* pair, not the account/master key. Leave Vercel upload feature disabled for now. Do not share credentials or presigned URLs.

## 2. Backblaze bucket CORS

Backblaze dashboard > Buckets > `ai-media-temp-documents` > `CORS Rules`.

For local testing, allow only the origin `http://localhost:3000`, the S3-compatible PUT operation, and the `content-type` request header. Do **not** make the bucket public. If the interface accepts Backblaze native CORS-rule JSON, this is a narrowly-scoped example:

```json
[
  {
    "corsRuleName": "aiMediaLocalUpload",
    "allowedOrigins": ["http://localhost:3000"],
    "allowedHeaders": ["content-type"],
    "allowedOperations": ["s3_put"],
    "exposeHeaders": ["etag"],
    "maxAgeSeconds": 3600
  }
]
```

If the dashboard presents checkboxes or preset options instead of raw JSON, use the equivalent S3/PUT/origin settings. The S3 API uses a *different* CORS XML/SDK shape; do not paste this JSON into an S3 XML field. If the screen looks different, share a screenshot WITHOUT secrets rather than guessing. Bucket-level settings may require owner/admin permissions beyond an object Read/Write app key.

## 3. Temporary file lifecycle

Backblaze dashboard > Buckets > `ai-media-temp-documents` > `Lifecycle Settings` > custom rules:

- Prefix `uploads/`: hide after 1 day, permanently delete 1 day after hiding.
- Prefix `verified/`: hide after 2 days, permanently delete 1 day after hiding.

IMPORTANT: B2 lifecycle is not a guaranteed exact-time deletion timer. B2 can retain old object versions. Keep job-specific cleanup in the app/worker too. Use only non-sensitive test documents until production retention/security is finished.

## 4. Local tests

After changing `.env.local`, restart `bun run dev`.

```powershell
cd D:\ai-media
bun test
bun run lint
bun run build
bun run dev
```

Sign in at `http://localhost:3000/dashboard`, then use the **unchanged** browser upload test from `docs/PHASE19B2_SETUP.md`.

Expected: `RESERVED` -> `UPLOADED` -> `VERIFIED` with job `PENDING`, stage `READY_FOR_PROCESSING`.

Troubleshooting:

- API 503 `Private file storage is unavailable`: verify endpoint, region, application key ID/secret, and bucket-scoped permissions.
- Browser CORS error: verify dashboard CORS and that browser origin is exactly `http://localhost:3000`.
- Browser PUT 403: ensure correct key permissions and exact `Content-Type` header from `/upload` response. The URL expires after five minutes.
- Confirm 409 or 422: the uploaded object could not be found or does not match expected size, content type, or Office format. Test using a genuine DOCX created by Word/LibreOffice.

No Docker rebuild is required. The job will not execute until Phase 19B3.

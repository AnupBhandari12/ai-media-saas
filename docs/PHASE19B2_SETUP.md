# AI Media — Phase 19B2 Secure Office Upload

## Important scope

- B1 provides `POST /api/worker/jobs` to reserve a metadata-only job.
- B2 adds browser-to-Cloudflare-R2 private uploads, server size/magic-header verification, and immutable verified copies.
- Job is `PENDING` with stage `READY_FOR_PROCESSING` after confirmation. It is **not dispatched** yet.
- B3 adds authenticated worker dispatch, isolated conversion, result storage, and download.
- Never mark PDF-20/21/22 AVAILABLE until B3/B4 functional QA.

## Install

Run in `D:\ai-media`:

```powershell
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Copy the new `lib/worker/*.js`, `app/api/worker/jobs/[id]/{upload,confirm}/route.js`, `tests/tools/workerUpload.test.js`, and docs. **Replace** the existing `app/api/worker/jobs/[id]/route.js` with the supplied cancellation-safe version.

## Private R2 bucket

1. In Cloudflare dashboard: R2 Object Storage > Create bucket (`ai-media-temp-documents` or another globally unique name). Keep the bucket **private**; do not enable an R2.dev public endpoint or custom public domain.
2. Create an R2 S3 API token with **Object Read & Write** permissions scoped to this bucket. Collect Account ID, Access Key ID, and Secret Access Key. Never send keys in chat or commit them.
3. Configure bucket CORS (adjust origins for your own staging site):

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Configure two **delete** lifecycle rules: `uploads/` prefix expires at **1 day**; `verified/` prefix expires at **2 days**. In production B3 must finish earlier or detect expiry and request new input. This prevents orphan uploads from accumulating.
5. Add to `.env.local`:

```env
WORKER_JOBS_ENABLED=true
WORKER_UPLOADS_ENABLED=true
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_private_bucket_name
```

Leave `WORKER_UPLOADS_ENABLED` unset on Vercel staging until the full B3/B4 pipeline is ready.

## Upload test (browser DevTools > Console, while signed in)

Choose one real DOCX file under 25 MiB. Paste the following code directly into browser console:

```js
const picker = document.createElement('input');
picker.type = 'file';
picker.accept = '.doc,.docx,.ppt,.pptx,.xls,.xlsx';
picker.onchange = async () => {
  const file = picker.files?.[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  const toolId = ['doc','docx'].includes(ext) ? 'PDF-20' :
    ['ppt','pptx'].includes(ext) ? 'PDF-21' : 'PDF-22';
  try {
    const reserved = await fetch('/api/worker/jobs', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({toolId,filename:file.name,bytes:file.size})
    });
    const reservation = await reserved.json();
    if (!reserved.ok) throw new Error(reservation.error || `Reservation: ${reserved.status}`);
    const jobId = reservation.job.id;
    console.log('RESERVED', reservation.job);

    const requested = await fetch(`/api/worker/jobs/${jobId}/upload`, {method:'POST'});
    const upload = await requested.json();
    if (!requested.ok) throw new Error(upload.error || `URL: ${requested.status}`);

    const sent = await fetch(upload.uploadUrl, {
      method:'PUT', headers:upload.headers, body:file
    });
    if (!sent.ok) throw new Error(`Direct upload: HTTP ${sent.status}`);
    console.log('UPLOADED',file.name,file.size);

    const confirmed = await fetch(`/api/worker/jobs/${jobId}/confirm`, {method:'POST'});
    const verified = await confirmed.json();
    if (!confirmed.ok) throw new Error(verified.error || `Confirm: ${confirmed.status}`);
    console.log('VERIFIED',verified);
    console.log('STATUS',await fetch(`/api/worker/jobs/${jobId}`).then(r=>r.json()));
  } catch (err) { console.error('B2 test failed:',err.message); }
};
picker.click();
```

Expected: `RESERVED PENDING/AWAITING_UPLOAD` -> `UPLOADED` -> `VERIFIED PENDING/READY_FOR_PROCESSING`.

## Security notes

- The private input object key and R2 credentials never appear in public job responses. The temporary signed PUT URL is a short-lived bearer capability; avoid copying it into logs/chats.
- The signature check validates only the initial bytes of ZIP/OLE. This is **not a full Office parser or malware scanner**. B3 worker isolation and parser limits remain essential.
- B1 reservation limits are soft count limits, **not transactional financial quotas**. Do not open B2 publicly without stronger anti-abuse controls.
- Clients should not upload sensitive real-user documents until production threat model, privacy policy, delete/retention and authorized processing are complete.
- If PUT is rejected 403, check the `Content-Type` header and URL expiry. CORS failures require Cloudflare R2 bucket CORS configuration.

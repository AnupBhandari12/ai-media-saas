# AI Media — Phase 22 / Stage 05: Job / Form Ready (photo beta)

**Reference:** Blueprint v2.0 WF-08. **Prerequisite:** Clean `feat/phase22-workflows` with committed Stage 04 (`7bc439a` or newer reviewed commit). No package, `.env.local`, Prisma, API or paid/provider modification.

## What works, what does not

- WF-08 **photo branch only**: `IMG-10` existing `createPassportPhoto` with user-selected pixels and positioning, then `IMG-02` existing `compressToTargetSize`. Existing registry remains *planned*; the Hub shows a **separate opt-in photo beta**. `/workflows/job-form-ready` is login-protected by existing dashboard layout.
- JPG, PNG, WebP upload, one at a time, up to **10 MB**, input dimensions bounded at 8,000px per side / 20 MP. Browser processing only. Export **JPEG**. Presets: **413×531** (approx. 35×45 mm at 300 DPI), **600×600** (approx. 2×2 in at 300 DPI), **600×800**, or **custom** 100–1600px sides, up to 3 MP. Zoom 1–2, vertical position 0–100. KB goals **100, 200, 500, 1,024**. These are *examples*, not guaranteed standard requirements.
- Unlike web/image flows, user needs **exact requested pixel count**. If existing compression downsizes the output to reach KB, **execution fails closed** and asks the user to choose a larger goal or photo. If it retains dimensions but cannot meet KB, output is downloadable with a clear **NOT REACHED** status, never marked form-compliant.
- **No automatic passport/official approval**, no biometric checks, DPI guarantee, face/background verification, crop correctness guarantee, image quality guarantees or government-specific thresholds. Preview cropping is only approximate; inspect final JPG. PDF variant `PDF-11` remains preview-only.
- No uploading, server save, Cloudinary, AI, analytics, external requests, batch processing, storage write, credits or public rollout in this Stage. A cancelled browser operation can finish the currently executing canvas step before stopping.

## Install

1. From `D:\ai-media` ensure branch is `feat/phase22-workflows` and working tree clean. Review user local branch separately; the ZIP does not modify Git automatically.
2. Extract ZIP into Downloads. Copy **only `stages/05/` contents** after checking all seven destination files **do not exist**. Do not copy `START_HERE.txt` into project.
3. Run `node scripts/phase22/add-stage05-job-form-link.mjs`. It verifies branch, exact Stage 04 Hub anchors, and executor sequences **before writing**. Modifies **only** `components/workflows/WorkflowHub.jsx` and `lib/workflows/runLocalWorkflow.js`. On `STOP`, do not rerun after force edits; report the diff. Does not edit registry.

## Tests & browser QA

```powershell
bun test tests/workflows/phase22Stage05.test.js
bun test
bun run lint
bun run build
bun run dev
```

Browser `http://localhost:3000/workflows/job-form-ready`: JPEG, PNG, WebP upload, presets & custom dimensions, framing and zoom, 100/200/500/1024 KB goals, export JPG, downloaded bytes/pixel dimensions, mobile viewport, invalid/corrupt file, cancelled run, unmet KB warning, and a case where compression cannot retain required dimensions. Verify no network upload/provider request. Recheck WF-06 Website, WF-01 WhatsApp and WF-07 Email links; PDF remains preview.

Commit only **after** all gates pass and review staged diff. Stage expected to add seven files and modify two existing files. No merging to `main`, no paid-production release or provider flags toggled.

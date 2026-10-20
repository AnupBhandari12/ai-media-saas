# Phase 22 — Stage 08: LinkedIn Ready (post image only)

## Scope
- WF-04 `post` variant only, approved steps: `IMG-03 → IMG-05 → IMG-01`.
- Three **maximum bounding boxes**, not exact crop sizes: landscape 1200×627, square-friendly 1080×1080, portrait 1080×1350. Original aspect ratio always retained; never upscales or crops.
- JPG/PNG/WebP inputs up to 10 MiB; decoded dimensions bounded to 8000 side / 20 MP; final output JPEG with white background on formerly transparent pixels.
- Original vs result preview, progress, cancel between local operations, safe download. Compression is best effort, not a guaranteed size.
- LinkedIn account access, publishing, profile photo `IMG-11` variant, PDF/video, paid provider and API calls **are not enabled**.

## Install
1. Work on clean `feat/phase22-workflows`; verify ZIP and copy **only** contents of `stages/08` into project. Collision checks must abort before copying.
2. `node scripts/phase22/add-stage08-linkedin-link.mjs` — checks exact Stage 07 hub and executor anchors and changes **only** two shared files; idempotent on a completed install.
3. `bun test tests/workflows/phase22Stage08.test.js` then `bun test`, `bun run lint`, `bun run build`.
4. Browser test signed-in `/workflows/linkedin-ready`; test PNG with transparent pixels and JPEG; image too large, cancellation, switch settings, mobile 375px, download dimensions. Compare output image visually.
5. `git diff --check`, review staged source and only then commit. No `git add .`, migrations, `.env.local` changes, paid API, main merge or push.

## Acceptance
- The engine approves only the reviewed 3-step order and rejects any custom pipeline.
- It does not stretch, crop or upscale images; preset name does not claim exact aspect ratio.
- Final actual MIME and dimensions are checked; bad adapter responses fail before download.
- All existing workflows retain their sequences and routes; all unimplemented variants remain preview-only.
- Local checks do **not** establish LinkedIn acceptance or production readiness.

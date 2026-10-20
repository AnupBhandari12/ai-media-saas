# Phase 22 · Stage 09 — YouTube Ready (Thumbnail Beta)

## Scope
- The registry defines WF-05 thumbnail `CRT-04 → IMG-02` and a separate video preview.
- Stage 09 implements thumbnail processing only: browser-local, single source image, locally rendered 1280×720 JPG, and best-effort target-size compression.
- Uses existing `createYouTubeThumbnail` and `compressToTargetSize`. Brand Kit is intentionally OFF to avoid remote-logo loading or other network calls.
- A compression result that changes 1280×720 pixel dimensions, MIME, or exceeds safe output limits is rejected; no download is published.
- No AI provider, upload, YouTube account integration, paid quota, migration, API, or new package. YouTube platform acceptance is not automatically verified.

## Install, after Stage 08 commit
1. Confirm `git status -sb` shows `feat/phase22-workflows` and clean status.
2. Extract ZIP; copy ONLY contents of `stages/09/` preserving project paths. Refuse collisions.
3. Run `node scripts/phase22/add-stage09-youtube-link.mjs`. This changes only `WorkflowHub.jsx` and `runLocalWorkflow.js` (idempotent).
4. `bun test tests/workflows/phase22Stage09.test.js`
5. `bun test`, `bun run lint`, `bun run build`
6. `bun run dev`; open `/workflows` and `/workflows/youtube-ready` as an authenticated user. Test title/layout/focus, output preview, download and phone widths.
7. Run `git diff --check`; review scoped changes before staging and committing.

## QA cases
- PNG, JPEG, WebP; corrupt/oversized images; title limits; preset values; focus 0/100.
- Test 512 KB, 1 MB, 2 MB goals; a large image may not reach its target without changing dimensions. Failure must be visible, not silently converted to a smaller resolution.
- Test keyboard labels, mobile layout, cancel and object URLs after image changes.
- Check other workflows and verify video branch remains preview-only.

## Boundaries
This is a local-beta feature, not an official YouTube uploader or a guarantee of upload acceptance. Do not enable paid Phase 21 providers or production B2 storage.

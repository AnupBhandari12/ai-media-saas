# Phase 22 — Stage 06: Instagram Ready (photo beta)

## Purpose and source-of-truth

Blueprint v2.0 Phase 22, canonical `WF-02` (priority P1). **Only** the `image` variant runs locally.
Its exact approved sequence, in registry order: `IMG-08 Crop Image → IMG-03 Resize by Pixels → IMG-01 Compress Image`.
The `video`/Reel variant remains a read-only plan preview. No new providers, routes, API keys, database migrations, paid calls or upload.
This local beta is not an official Instagram uploader, guarantee of publish acceptance or metadata-preservation service.

## Flow

1. User chooses JPG/PNG/WebP (1 byte–10 MB) and preset: square 1080×1080, portrait 1080×1350 or story 1080×1920.
2. Read source pixels locally and enforce max 8000px/side and 20MP; compute aspect-preserving crop.
3. **Do not upscale:** when the available crop is smaller than chosen output pixels, stop with a clear message.
4. Crop input using existing `cropImage`, then resize using `resizeImageByPixels`, then try lossless/quality-based compression via `compressImage`.
5. Verify output bytes, format and dimensions after every step, show trace/status and final crop, allow download.
6. Crop can remove image edges; preview is approximate and final output must be checked. PNG may not compress smaller.

## Installation and QA rhythm

- Branch: `feat/phase22-workflows`, starting from Stage 05 and its standalone ESLint fix commit.
- Extract ZIP; copy **contents** of `stages/06` into repository after collision check.
- Run `node scripts/phase22/add-stage06-instagram-link.mjs`; installer changes only `components/workflows/WorkflowHub.jsx` and `lib/workflows/runLocalWorkflow.js` with guarded checks.
- Run `bun test tests/workflows/phase22Stage06.test.js`, then `bun test`, `bun run lint`, `bun run build`.
- Local browser QA: `bun run dev`; `/workflows/instagram-ready`; try square/portrait/story JPG and PNG, inspect edges, quality, download and actual dimensions. Test too-small input (must refuse), stop button, mobile layout and older workflows.
- Check `git diff --check`, `git diff --stat`, `git status --short` before staging. Do not stage all repository files or merge/push before review.

## Boundaries and next steps

- No video/Reel processing, bulk ZIP, automatic Instagram posting, face detection or generative AI.
- No guaranteed KB reduction or metadata preservation. Image format stays as selected input and output size can be larger if crop/resize demands it.
- No server-side uploads or paid credits in this workflow.
- Additional social workflows must use their own registry steps; do not invent substitute step lists.

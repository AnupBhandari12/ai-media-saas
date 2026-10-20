# Phase 22 — Stage 07: Facebook Ready photo beta

## Scope
- `WF-03` from the Stage 01 registry, **image** branch only.
- Reuses existing `IMG-08 Crop → IMG-03 Resize → IMG-01 Compress` functions. The exact approved sequence was already enabled for Instagram; **no new executor sequences** are added.
- One photo per run; local browser execution. No upload, API call, account connection, AI provider or posting.
- Three illustrative presets: square 1080×1080, landscape 1200×630 and page-cover draft 1640×624 px. Actual Facebook requirements and screen crops can change; these are **not guaranteed acceptance**.
- Focus sliders and preview; source must be large enough, no upscale; final image must be inspected before publishing.

## Installation
1. Clean `feat/phase22-workflows` branch after Stage 06 commit.
2. Unzip the kit outside the repository. Copy the **contents of** `stages/07` to `D:\ai-media` only if none of the seven target file paths already exists.
3. Run `node scripts/phase22/add-stage07-facebook-link.mjs`. The installer checks exact prior Hub anchors and only changes `components/workflows/WorkflowHub.jsx`.
4. `bun test tests/workflows/phase22Stage07.test.js`
5. `bun test`, `bun run lint`, `bun run build`
6. Browser at `/workflows/facebook-ready`: test one sufficiently large real JPG/PNG/WebP source per preset, preview, dimensions, output MIME and download, keyboard/mobile layout and cancellation. Check prior workflow links.
7. `git diff --check`; stage **only seven new paths plus `components/workflows/WorkflowHub.jsx`**. Review staged changes before commit.

## Guardrails and known limits
- 10 MB input, 8000-pixel longest edge, 20MP input, 20 MB processed output.
- Target sizes are examples; native photo dimensions must permit the requested crop with no upscaling.
- Browser image compression can be best-effort, especially PNG.
- Page-cover display is device-dependent; no verification of Facebook account acceptance or automatic posting.
- Paid AI, video, PDF, Cloudinary, Prisma, `.env.local`, and migrations remain unchanged.
- Installer will **stop** if Stage 06 Hub differs from the reviewed anchor. Do not force overwrite.

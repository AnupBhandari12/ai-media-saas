# Phase 22 Stage 10 — WF-09 E-commerce Product Pack

## Safe beta scope
- Browser-local single-image deterministic pack, **not a paid AI product cleanup workflow**.
- Approved registry: `WF-09 image → IMG-08 → IMG-03 → IMG-12`.
- Source JPG/PNG/WebP, max 10 MB, decoded image 1200×1200 minimum, max 8000 per side and 20 MP.
- Produces square **1200×1200 catalog** and **800×800 web** output from a focus-aligned central crop, using the existing crop and resize tools.
- Optional text watermark (same existing watermark tool); marked SKIPPED when empty.
- Download two images with real source MIME extensions plus product SEO metadata `.txt`; downloads are **separate**, not a ZIP.
- Product image MIME format remains source format (JPG/PNG/WebP) without an extra conversion step.
- No AI background clearing, no provider calls/credits/Cloudinary, no ZIP creation, no marketplace publishing, no batch support.

## Commands after safe copy
```powershell
node scripts/phase22/add-stage10-ecommerce-link.mjs
bun test tests/workflows/phase22Stage10.test.js
bun test
bun run lint
bun run build
bun run dev
```
Open `http://localhost:3000/workflows/ecommerce-product-pack` and check JPG, PNG, WebP, watermark on/off, both image dimensions, metadata download, mobile UI and cancel.

## Safety
- Do not run installer on dirty shared files. Installer checks exact anchors, branch, prior links and approved sequence.
- Never stage or commit before full tests, lint, build and browser QA.
- Keep WF-10 Student Notes Pack as planned for a separate stage.

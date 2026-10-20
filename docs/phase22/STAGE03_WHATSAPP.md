# AI Media — Phase 22 / Stage 03: WhatsApp Ready (photo-only local beta)

**Roadmap:** AI Media v2.0, Section 21 / WF-01 and Phase 22 (PDF pp.60, 79). **Prerequisite:** Stage 02 committed, `feat/phase22-workflows` branch, clean Git working tree.

## Scope and why

The approved WF-01 image plan is `IMG-05` (Convert Image Format) → `IMG-02` (Compress Image to Target Size). Stage 03 adds a responsive `/workflows/whatsapp-ready` page and a browser-local executor using the EXISTING converter and compressor. No new processing algorithm, paid service, external upload, background queue, worker or storage.

One photo at a time: JPG, PNG or WebP up to 10 MB; decoded width/height each no more than 8,000 pixels and 20 megapixels total. Output always JPG for messaging compatibility. Transparent pixels in PNG/WebP become **white** in the existing converter. Videos remain PREVIEW-ONLY: video is NOT silently enabled. Size presets map to 150 KB (smaller), 350 KB (balanced) or 700 KB (clearer). Targets are best effort: output may exceed the goal, and actual bytes and pixel dimensions must be displayed.

## Install safety

1. `git status -sb` should be clean on `feat/phase22-workflows` **before** copying the kit.
2. Extract ZIP into Downloads, then copy **only** `stages/03` CONTENTS to `D:\ai-media` after collision check. There are 7 NEW files; none should replace an existing file.
3. Run `node scripts/phase22/add-stage03-whatsapp-link.mjs`. The guarded installer checks the existing Stage 02 link and updates ONLY `components/workflows/WorkflowHub.jsx` (link and truthful local-beta labels) and `lib/workflows/runLocalWorkflow.js`.
4. The executor now explicitly allows exactly **two complete sequences**, WF-06 `[IMG-03, IMG-05, IMG-14, IMG-02]` and WF-01 `[IMG-05, IMG-02]`. Everything else, including arbitrary/reordered tool IDs, is rejected. No edits to Stage 01 registry or Phase 21 AI gates.
5. On STOP/error, **do not retry with forced overwrite**. Send error and diff for inspection.

## Run the test gate

```powershell
bun test tests/workflows/phase22Stage03.test.js
bun test
bun run lint
bun run build
bun run dev
```

Open `http://localhost:3000/workflows`. Click **Try WhatsApp Ready (photo beta)** on WF-01. Open `/workflows/whatsapp-ready`. Try a small JPG (should show skip when steps not needed), a PNG (white matte if transparency), a WebP, a large image and an unreachable target. Download outputs and open them outside the browser. Confirm final JPG MIME, bytes, natural dimensions, trace and target flag; test mobile viewport and invalid/corrupted files. Cancel stops between steps, not during Canvas computation. File/format consistency, browser console and network tab matter.

## Known limits and important behavior

- Native image decoding and canvas memory limits vary by device/browser. No provider fallback.
- `compressToTargetSize` may reduce pixel dimensions, preserving aspect ratio; it is not guaranteed to hit the target exactly.
- A small existing JPG can be returned unmodified: it may retain original embedded metadata. **Do not promise metadata stripping**. WhatsApp itself can further recompress a sent image; we cannot guarantee its final in-app size.
- Compression may increase the size compared with a small source; show the actual before/after difference instead of claiming every photo is smaller.
- No video conversion, saved presets, multi-file batch, share-to-WhatsApp or server persistence in this stage.
- `runLocalWorkflow` whitelist expansion must retain Stage 02 behavior; full regression testing required.
- Browser local beta is **not** production launch approval, paid AI release, or a merge to main.

## Exit criterion

Focused tests, full tests, lint, Next production build, real browser upload→process→preview→download, mobile viewport, errors, network check, review `git diff --check` and explicit local feature branch commit. Wait for user approval before merging or pushing.

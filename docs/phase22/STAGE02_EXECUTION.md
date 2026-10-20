# AI Media — Phase 22 / Stage 02 — Website Ready real local execution

**Roadmap basis:** v2.0, Section 37 (PDF p.79), WF-06 (PDF p.61). **Baseline:** user verified Stage 01 commit `914c77c` on clean branch `feat/phase22-workflows`.

## Scope

- Adds a **new** `/workflows/website-ready` route, responsive client workspace, guarded WorkflowHub link, website-only plan/executor and Bun tests.
- Uses existing IMG-03, IMG-05, IMG-14, IMG-02 helpers without changing them. Runs sequentially in browser, passing each output file as next input.
- Each step reports PROCESSING / COMPLETED / SKIPPED / FAILED; user sees output preview, actual sizes, final dimensions, target status and local download.
- No files uploaded, no background server jobs, database changes, AI calls, tokens/credits, worker, Cloudinary, B2 or new dependencies.
- **Only Website Ready runs.** Other workflows remain preview-only, and WF-06 remains PLANNED in registry until full exit QA; UI labels this **local beta**.

## Preflight and safe copy

Start at `D:\ai-media` on `feat/phase22-workflows`; `git status -sb` clean, HEAD `914c77c` (unless already advanced intentionally). Extract the ZIP to Downloads and copy only `stages/02` contents to `D:\ai-media` after verifying no path collision. Do NOT overwrite Stage 01 files. Stage 02 files are all new.

Run guarded navigation patch **after** safe copy:

```powershell
cd D:\ai-media
node scripts/phase22/add-stage02-website-link.mjs
```

It edits **only** `components/workflows/WorkflowHub.jsx` using a reviewed Stage 01 anchor. If the script says STOP, don't manually force the patch; report the output.

## Test gate

```powershell
bun test tests/workflows/phase22Stage02.test.js
bun test
bun run lint
bun run build
bun run dev
```

Open `http://localhost:3000/workflows`. Click **Try Website Ready (local beta)**, choose a normal JPG/PNG/WebP under 10 MB and 20 megapixels, run, preview and download. Validate on desktop and mobile width. Also test corrupt/unsupported file, tiny photo (skip resize), large photo (resize), JPG vs WebP, target unattainable (explicit warning), repeat run/file replacement, and browser console. Before commit, confirm Git diff only covers this stage's seven new files and one intended WorkflowHub edit. Await explicit review before commit or pushing.

## Limits and constraints

- Browser only; input format JPG/PNG/WebP, up to 10 MB; decoded pixel cap 20 million, max dimension setting 320–2400, target 30–2048 KB.
- JPG removes transparency (white matte); conversion may fail on browsers without working WebP encoder.
- `compressToTargetSize` can shrink final dimensions to try reaching target; always show **actual** size and dimension. A tight target is not guaranteed.
- Common image metadata is stripped by canvas re-encode. This does not certify all possible custom metadata is absent; advanced EXIF QA is future work.
- Cancelling stops **between** steps; the currently running browser Canvas/compression call cannot be interrupted. Output remains local and unsaved by default.
- Avoid large images on resource-constrained mobile devices; device browser memory can fail even when input size is within limits. No auto cloud fallback.
- The engine is currently fixed to exactly four approved IDs; never accept arbitrary step arrays or untrusted provider commands.

## Completion definition

Pass full tests, lint, build, real-browser valid/invalid files, output byte/dimension checks, download, mobile manual QA, security review, `git diff --check` and local commit. Do not merge to main before user approval. Stages 03+ extend reusable orchestrator only after this is stable.

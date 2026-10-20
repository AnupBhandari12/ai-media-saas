# AI Media — Phase 22 / Stage 04: Email Ready (image attachment beta)

**Blueprint:** v2.0 WF-07 (p.61) and Phase 22 (p.79). **Required state:** Stage 03 committed on clean `feat/phase22-workflows` branch.

## Scope

WF-07 has an image branch `["IMG-02"]` and a PDF branch `["PDF-11"]`. Stage 04 enables ONLY one browser-local image branch, at `/workflows/email-ready` using existing `compressToTargetSize` (IMG-02), bounded to JPG/PNG/WebP input ≤10 MB, 8,000 pixels per side and 20 MP. Preset goals are **200 KB, 500 KB, 1,024 KB** and are NOT a guarantee or a hard email provider limit. PDFs stay **preview only**, as do multi-image ZIP batches and sharing directly to email. No new transformations; no API calls, server uploads, saved files, paid AI providers or migrations.

**Behavior:** Existing IMG-02 returns the original file when it already fits. If a large PNG must be compressed, IMG-02 can convert it into **WebP**. This Stage 04 keeps the actual MIME and filename consistent, shows the format, and explicitly warns about recipient WebP compatibility. JPEG and WebP remain in their input format. User can compare file sizes; compression can fail to meet size goal or in rare cases increase output bytes. Image metadata is NOT guaranteed to be stripped (especially when the original fits). Gmail/Outlook attachment limits and recipients are external and not validated here.

## Install

1. Ensure clean `git status -sb` and commit `a7ecd04` or a newer user-reviewed Stage03 commit on `feat/phase22-workflows`.
2. Extract ZIP in Downloads and copy ONLY `stages/04` contents into `D:\ai-media` after non-overwrite check. There are **7 new files**.
3. Run `node scripts/phase22/add-stage04-email-link.mjs`. Guard checks branch, Stage02/03 links, exact hub anchors, and executor allowlist. Modifies ONLY `components/workflows/WorkflowHub.jsx` and `lib/workflows/runLocalWorkflow.js` after preflight. Adds `["IMG-02"]` to the allowlist while preserving previous sequences.
4. STOP on error. Do not force overwrite, remove old files, or toggle paid flags.

## Validation gate

```powershell
bun test tests/workflows/phase22Stage04.test.js
bun test
bun run lint
bun run build
bun run dev
```

Browser: sign in, `/workflows`, click **Try Email Ready (image beta)** (WF-07), or open `/workflows/email-ready`. Test a small JPEG under goal (SKIPPED), a larger JPEG, PNG that converts to WebP (actual extension correct), and WebP. Download and open exported images, inspect format/bytes/dimensions, unreachable target, browser network (no uploads/provider dispatch), mobile viewport, invalid/corrupt file, cancellation between steps, and ensure previous WF-01/WF-06 links still function.

## Limitations and safe operational contract

- This is image beta, **NOT full Email Ready**. PDF `["PDF-11"]` is not approved in the shared executor. No PDF compression, ZIP, multiselect, or email sending.
- Very large images or browser canvas failures must show an error. Abort is cooperative between steps, not an interruption within browser canvas encode.
- Use only the three fixed step sequences: WF-06 4-step, WF-01 2-step, WF-07 1-step. Never accept client-defined steps or dynamic tool/provider dispatch.
- Any GUI or compression regression needs a fix before commit. Full QA, `git diff --check`, and explicit reviewed commit on feature branch. No automatic merge or push to main and **no paid production release**.

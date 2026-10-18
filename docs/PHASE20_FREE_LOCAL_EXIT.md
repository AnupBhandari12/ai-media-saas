# AI Media — Phase 20 Utility + OCR Expansion (Free Local)

Source of truth: **AI Media Complete Product Blueprint & Roadmap v2.0**, section 35 (page 77) and Utility Tools section (pages 50–53).

## Scope

This 9-stage patch implements the first six required utility tools:

- UTL-01 QR — free open-source `qrcode` browser library (run `bun add qrcode` in Stage 02).
- UTL-03 Image OCR — existing `tesseract.js`, selected language downloaded **on demand**. Supports English, Nepali, combined; local image recognition, progress and worker cancellation.
- UTL-04 Scanner — manual four-corner perspective adjustment, grayscale/enhancement, JPG/PDF export, camera-capable file input. Existing `pdf-lib` scanner export reused.
- UTL-05 Palette — local pixel sampling, dominant approximate HEX/RGB values.
- UTL-06 Favicon — existing `jszip` and Canvas; 6 PNG sizes + PNG-backed ICO.
- UTL-08 Inspector — bounded local file header detection, image dimensions, PDF page count, basic EXIF presence indicator. NOT a malware/EXIF GPS detailed parser.

UTL-02 Barcode and UTL-07 Image Base64 remain deferred **within Phase20 backlog** according to the roadmap sequence (add later if UX coherent). No paid provider, Neon/Prisma migration, new cloud bucket, or worker hosting required.

## 9 commit milestones (run one at a time, in order)

Each `stages/NN` folder mirrors the root of `D:\ai-media`. Extract **only that stage** into `D:\ai-media` after earlier stage passed review. Run `bun test`, `bun run lint`, `bun run build`, manual browser and phone QA; `git add` only the current stage paths and commit. Do not use `git add .`. Always start on `feat/phase20-utilities` based on updated `main`, NOT directly on `main`.

Stage 01 — foundation. Stage 02 — QR (+ `bun add qrcode`). Stage 03 — OCR engine. Stage 04 — OCR UI. Stage 05 — scanner. Stage 06 — favicon. Stage 07 — palette. Stage 08 — inspector. Stage 09 — final registry, Tools Hub search, tests and handoff.

**Important:** Stage 09 includes `scripts/phase20/register-utilities.mjs`. It does NOT alter files merely by extracting. After browser QA, run `node scripts/phase20/register-utilities.mjs` once. It checks expected source markers, then updates exactly `lib/tools/registry.js`, `components/tools/ToolsHub.jsx`, `tests/tools/registry.test.js`. Review `git diff` before committing. The script refuses unexpected repo structures or running twice. If it refuses, STOP and request file-specific review; do not bypass safety checks.

## Manual acceptance tests (no sensitive files)

1. QR: scan URL, text, WPA Wi-Fi and vCard with another phone; download both PNG/SVG, verify contrast/quiet zone.
2. OCR: English and Nepali short images, combined-language switching, cancellation while worker loads; copy and UTF-8 text download. First language download may need internet.
3. Scanner: phone camera/file choice, adjust all 4 corners, try grayscale and enhanced, verify image and PDF text stays readable and perspective reasonably corrected.
4. Favicon: check each ZIP PNG dimension (16,32,48,180,192,512); open PNG-backed ICO in a browser; verify transparent/white-space.
5. Palette: tap a pure red/green/blue image, verify exact HEX and RGB, copy HEX on desktop and phone.
6. Inspector: test PNG/JPEG, PDF, unknown binary, invalid/oversized. No file uploads/network calls for content; PDF page count may be unavailable for encrypted/broken PDF.
7. Navigation: Tools Hub search finds six Utility tools; mobile responsive interactions work; old 67 tools unchanged. Test `bun test`, `bun run lint`, `bun run build`.

## Definition-of-Done mapping and limitations

- Searchable Utilities Hub: Stage 09 registry + UI tests.
- No upload unless saved explicitly: all utility file handling is browser-only. OCR language data can download from Tesseract's language host, but user images are not sent there.
- OCR progress, cancel and language select: tested behavior required in a **real browser**; static unit tests alone cannot certify runtime cancellation.
- Mobile camera/phone: real Android/iOS browser test needed; desktop simulation isn't enough.
- Tests + build + PR review: required before merging into `main`.

**Do not claim Phase20 done until all browser/manual acceptance, tests, mobile checks and the PR merge are verified.**

Production warning: enabling utilities in `main` only after verification, especially scanner/camera/origin restrictions. QR library and OCR language packs may increase client bundle or download size; use lazy imports and measure mobile performance.

Tomorrow only: Phase 21, after Phase20 exit.

# AI Media — Phase 22 / Stage 01 — Workflow preview foundation

Basis: *AI Media Complete Product Blueprint & Roadmap v2.0*, Section 37 / PDF page 79.
Source code baseline: `main` at `0d60827` (Phase 21 merged).

## Scope / intentionally not done

- Adds 10 planned workflow definitions and previews of existing tool ID sequences/branches.
- Adds a mobile-friendly `/workflows` hub with search, priority filters, variant selector, and individual tool links.
- Adds Bun unit tests and guarded desktop/mobile sidebar registration.
- **Does NOT** execute any steps, upload files, call providers, change the database, enable paid features or mark workflows available.
- Per-step file compatibility, user settings, job persistence, downloads, retries, quotas and validation come in subsequent stages.
- Stage 01 changes no existing source files **except** the optional exact-match sidebar patch script.

## Prepare

1. Start from a clean `main` at `0d60827`; keep `.phase21-*` outside project (already archived by user).
2. `git switch -c feat/phase22-workflows` (only once; do not branch over uncommitted edits).
3. Extract ZIP to Downloads; copy **only** `stages/01` contents to `D:\ai-media` after a no-collision check.
4. Run `node scripts/phase22/add-stage01-navigation.mjs` to insert a Workflows link in both desktop and mobile navigation. Stop on error; do not force replacement.

## Verify

```powershell
cd D:\ai-media
bun test tests/workflows/phase22Stage01.test.js
bun test
bun run lint
bun run build
bun run dev
```

Sign in, open `http://localhost:3000/workflows`, search Website, inspect image plan, change filters. Also verify desktop/mobile Workflows navigation and the old `/tools` route.

Review before committing:

```powershell
git status --short
git diff --check
git diff -- components/layout/DashboardSidebar.jsx components/layout/DashboardTopbar.jsx
```

When all succeed, stage only Stage 01 source paths:

```powershell
git add 'app/(dashboard)/workflows/page.js' 'components/workflows/WorkflowHub.jsx' 'lib/workflows/registry.js' 'lib/workflows/previewPlan.js' 'tests/workflows/phase22Stage01.test.js' 'scripts/phase22/add-stage01-navigation.mjs' 'docs/phase22/STAGE01_FOUNDATION.md' 'components/layout/DashboardSidebar.jsx' 'components/layout/DashboardTopbar.jsx'
git commit -m "feat(phase22): add workflow registry and preview hub"
```

Do not push or merge until verified and reviewed with the user. Paid Phase 21 production gates remain OFF.

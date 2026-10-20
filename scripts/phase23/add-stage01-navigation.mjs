// Idempotent, guarded two-file navigation patch. Run only on feat/phase23-ai-workspace.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
if (branch !== "feat/phase23-ai-workspace") {
  throw new Error(`STOP: Expected feat/phase23-ai-workspace, found ${branch}.`);
}

const files = [
  {
    path: "components/layout/DashboardSidebar.jsx",
    anchor: '        <Link\n          href="/studio/image"',
    inserted: '        <Link\n          href="/ai-workspace"\n          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-background hover:text-foreground"\n        >\n          <Sparkles size={18} />\n          AI Workspace\n        </Link>\n\n',
  },
  {
    path: "components/layout/DashboardTopbar.jsx",
    anchor: '          <Link\n            href="/studio/image"',
    inserted: '          <Link\n            href="/ai-workspace"\n            onClick={() => setMenuOpen(false)}\n            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted"\n          >\n            <Sparkles size={18} />\n            AI Workspace\n          </Link>\n\n',
  },
];

function once(source, fragment, label) {
  if (source.indexOf(fragment) !== source.lastIndexOf(fragment)) {
    throw new Error(`STOP: Expected one ${label} anchor.`);
  }
  if (!source.includes(fragment)) throw new Error(`STOP: Missing ${label} anchor.`);
}

// Preflight BOTH files and refuse partial installations before any writes.
const updates = files.map(({ path, anchor, inserted }) => {
  const current = readFileSync(path, "utf8");
  const newline = current.includes("\r\n") ? "\r\n" : "\n";
  const normalized = current.replace(/\r\n/g, "\n");
  const alreadyHasLink = normalized.includes('href="/ai-workspace"');
  const alreadyHasIcon = normalized.includes("  Sparkles,");
  if (alreadyHasLink !== alreadyHasIcon) throw new Error(`STOP: Partial navigation installation in ${path}.`);
  if (alreadyHasLink) {
    if (normalized.split('href="/ai-workspace"').length !== 2) throw new Error(`STOP: Duplicate navigation in ${path}.`);
    return { path, current, next: current, updated: false };
  }
  once(normalized, anchor, path);
  const iconAnchor = "  Workflow,\n";
  once(normalized, iconAnchor, `${path} lucide import`);
  const withIcon = normalized.replace(iconAnchor, iconAnchor + "  Sparkles,\n");
  const next = withIcon.replace(anchor, inserted + anchor).replace(/\n/g, newline);
  return { path, current, next, updated: true };
});

const toWrite = updates.filter(({ updated }) => updated);
try {
  for (const file of toWrite) writeFileSync(file.path, file.next, "utf8");
} catch (error) {
  for (const file of toWrite) {
    try { writeFileSync(file.path, file.current, "utf8"); } catch {}
  }
  throw error;
}

console.log(toWrite.length ? "Phase 23 Stage 01 navigation added to sidebar and mobile menu." : "Phase 23 Stage 01 navigation already installed; no changes.");

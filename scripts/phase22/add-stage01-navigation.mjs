// Optional, guarded Stage 01 nav registration. Modifies exactly two checked JSX files.
// It never touches environment, git, Prisma, providers or existing tool APIs.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const targets = [
  {
    path: "components/layout/DashboardSidebar.jsx",
    anchor: '        <Link\n          href="/studio/image"',
    link: `        <Link
          href="/workflows"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-background hover:text-foreground"
        >
          <Workflow size={18} />
          Workflows
        </Link>

`,
  },
  {
    path: "components/layout/DashboardTopbar.jsx",
    anchor: '          <Link\n            href="/studio/image"',
    link: `          <Link
            href="/workflows"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted"
          >
            <Workflow size={18} />
            Workflows
          </Link>

`,
  },
];

function replaceOnce(text, needle, replacement) {
  if (text.split(needle).length !== 2) throw new Error(`Expected exactly one anchor: ${needle}`);
  return text.replace(needle, replacement);
}

// Preflight every file before writing any file.
const updates = targets.map(({ path, anchor, link }) => {
  const absolute = resolve(process.cwd(), path);
  if (!existsSync(absolute)) throw new Error(`Missing expected file: ${path}`);
  const original = readFileSync(absolute, "utf8");
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  let content = original.replace(/\r\n/g, "\n");

  if (content.includes('href="/workflows"')) {
    if (!content.includes('<Workflow size={18} />') || !content.includes('  Workflow,\n')) {
      throw new Error(`Existing Workflows link in ${path} needs manual review`);
    }
    return { path, absolute, original, final: original, unchanged: true };
  }

  content = replaceOnce(content, "  Wrench,\n", "  Wrench,\n  Workflow,\n");
  content = replaceOnce(content, anchor.replaceAll("\\n", "\n"), link + anchor.replaceAll("\\n", "\n"));
  return { path, absolute, original, final: content.replace(/\n/g, eol), unchanged: false };
});

for (const update of updates) {
  if (!update.unchanged) writeFileSync(update.absolute, update.final, "utf8");
  process.stdout.write(`${update.unchanged ? "Already registered" : "Added Workflows nav"}: ${update.path}\n`);
}

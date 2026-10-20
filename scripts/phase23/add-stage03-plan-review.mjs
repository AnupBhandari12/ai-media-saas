// Phase 23 Stage 03 — guarded, repeatable integration.
// Verify BOTH existing files before changing either; Windows CRLF is preserved.
import { readFileSync, writeFileSync } from "node:fs";

const componentFile = "components/ai-workspace/AiWorkspaceUnderstanding.jsx";
const pageFile = "app/(dashboard)/ai-workspace/page.js";
const read = (file) => {
  const text = readFileSync(file, "utf8");
  return { text: text.replace(/\r\n/g, "\n"), crlf: text.includes("\r\n") };
};
const component = read(componentFile);
const page = read(pageFile);

const oldImports = `import Link from "next/link";\nimport { ArrowRight, ClipboardList, ShieldCheck, Sparkles } from "lucide-react";`;
const newImports = `import { ClipboardList, ShieldCheck, Sparkles } from "lucide-react";\nimport WorkspacePlanReview from "@/components/ai-workspace/WorkspacePlanReview";`;
const oldPanel = `          <p className="mt-5 text-sm text-muted">
            Plan preview only. To process a file, open the existing approved workflow and review its options.
          </p>
          <Link href={\`/workflows/\${result.plan.workflowSlug}\`}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5">
            Open existing workflow <ArrowRight size={18} aria-hidden="true" />
          </Link>`;
const newPanel = `          <WorkspacePlanReview plan={result.plan} />`;
const oldBanner = `Prompt understanding · safe beta`;
const newBanner = `Prompt understanding & review · safe beta`;
const oldInfo = `it never uploads files, spends credits, or starts processing.`;
const newInfo = `it never uploads files, spends credits, or starts processing. Acknowledgment only reveals an approved workflow link.`;
const oldPage = `Stage 02 recognizes selected natural-language image and photos-to-PDF requests with conservative offline rules.\n        Real AI and workflow execution will be added in later stages.`;
const newPage = `Stage 03 checks selected natural-language plans against approved tool registries and asks for a human review.\n        Acknowledgment only reveals an existing workflow link; no execution happens in this page.`;

function once(source, needle, file) {
  if (source.split(needle).length !== 2) {
    throw new Error(`STOP: ${file} differs from verified Phase 23 Stage 02 (missing/repeated anchor). No file was changed.`);
  }
}
const installed = component.text.includes(newImports) && component.text.includes(newPanel) &&
  component.text.includes(newBanner) && page.text.includes(newPage) &&
  !component.text.includes(oldPanel) && !component.text.includes(oldImports);
if (installed) {
  console.log("Phase 23 Stage 03 plan review already integrated.");
  process.exit(0);
}
for (const needle of [oldImports, oldPanel, oldBanner, oldInfo]) once(component.text, needle, componentFile);
once(page.text, oldPage, pageFile);
// Strictly reject inconsistent partial installations.
if (component.text.includes(newImports) || component.text.includes(newPanel) ||
    component.text.includes(newBanner) || page.text.includes(newPage)) {
  throw new Error("STOP: Partial Stage 03 installation detected. No file was changed.");
}
const updatedComponent = component.text.replace(oldImports, newImports)
  .replace(oldPanel, newPanel).replace(oldBanner, newBanner).replace(oldInfo, newInfo);
const updatedPage = page.text.replace(oldPage, newPage);
const preserve = ({crlf}, value) => crlf ? value.replace(/\n/g, "\r\n") : value;
writeFileSync(componentFile, preserve(component, updatedComponent), "utf8");
writeFileSync(pageFile, preserve(page, updatedPage), "utf8");
console.log("Phase 23 Stage 03 guarded plan review integrated (no execution). ");

// Phase 23 Stage 04: guarded and idempotent integration with Stage 03 UI.
// Reads/verifies all three files before writing; preserves LF or CRLF line endings.
import { readFileSync, writeFileSync } from "node:fs";

const files = {
  review: "components/ai-workspace/WorkspacePlanReview.jsx",
  understanding: "components/ai-workspace/AiWorkspaceUnderstanding.jsx",
  page: "app/(dashboard)/ai-workspace/page.js",
};
function read(file) {
  const original = readFileSync(file, "utf8");
  return { path: file, text: original.replace(/\r\n/g, "\n"), crlf: original.includes("\r\n") };
}
const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const edits = {
  review: [
    [
      'import { acknowledgeWorkspacePlan, createWorkspaceReview } from "@/lib/ai-workspace/reviewGate";',
      'import { acknowledgeWorkspacePlan, createWorkspaceReview } from "@/lib/ai-workspace/reviewGate";\nimport WorkspaceWebsiteRun from "@/components/ai-workspace/WorkspaceWebsiteRun";',
    ],
    [
      '            Open the existing workflow to upload/select your file and review its own settings.\n            This acknowledgement is not execution permission or a quota/security check.',
      '            You may open the existing approved workflow to configure and run it. For Website Ready only,\n            you can also choose a local image and click Run below. Review alone executes nothing.',
    ],
    [
      '            Open approved workflow <ArrowRight size={18} aria-hidden="true" />\n          </Link>\n        </div>',
      '            Open approved workflow <ArrowRight size={18} aria-hidden="true" />\n          </Link>\n          {plan.workflowId === "WF-06" && plan.variantId === "image" && (\n            <WorkspaceWebsiteRun plan={plan} />\n          )}\n        </div>',
    ],
  ],
  understanding: [
    [
      '<WorkspacePlanReview plan={result.plan} />',
      '<WorkspacePlanReview key={`${result.plan.workflowId}:${result.plan.variantId}:${result.plan.steps.map((step) => step.toolId).join(",")}`} plan={result.plan} />',
    ],
  ],
  page: [
    [
      'Stage 03 checks selected natural-language plans against approved tool registries and asks for a human review.\n        Acknowledgment only reveals an existing workflow link; no execution happens in this page.',
      'Stage 04 reuses the existing Website Ready local processor after an explicit review, file selection and Run click.\n        Other approved workflows still run on their existing pages; no remote AI execution or credits here.',
    ],
  ],
};

function replaceOnce(text, oldText, newText, file) {
  if (text.split(oldText).length !== 2) throw new Error(`STOP: ${file} differs from expected Stage 03 source. Nothing changed.`);
  if (text.includes(newText)) throw new Error(`STOP: Partial Stage 04 integration detected in ${file}. Nothing changed.`);
  return text.replace(oldText, newText);
}

const installed = Object.entries(edits).every(([key, changes]) =>
  changes.every(([, newText]) => source[key].text.includes(newText)));
if (installed) {
  console.log("Phase 23 Stage 04 local execution bridge already integrated.");
  process.exit(0);
}
if (Object.entries(edits).some(([key, changes]) => changes.some(([, newText]) => source[key].text.includes(newText)))) {
  throw new Error("STOP: Partial Stage 04 integration detected. Nothing changed.");
}

let updated = {};
for (const [key, changes] of Object.entries(edits)) {
  let content = source[key].text;
  for (const [oldText, newText] of changes) content = replaceOnce(content, oldText, newText, source[key].path);
  updated[key] = content;
}
for (const [key, content] of Object.entries(updated)) {
  writeFileSync(source[key].path, source[key].crlf ? content.replace(/\n/g, "\r\n") : content, "utf8");
}
console.log("Phase 23 Stage 04 Website Ready browser-local bridge integrated (no API/provider calls).");

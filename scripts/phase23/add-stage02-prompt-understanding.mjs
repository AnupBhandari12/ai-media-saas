// One-time guarded integration; can be rerun safely. Node.js/Bun friendly.
import { readFileSync, writeFileSync } from "node:fs";

const file = "app/(dashboard)/ai-workspace/page.js";
const source = readFileSync(file, "utf8");
const hadCrLf = source.includes("\r\n");
const original = source.replace(/\r\n/g, "\n");
const oldImport = 'import AiWorkspaceFoundation from "@/components/ai-workspace/AiWorkspaceFoundation";';
const newImport = 'import AiWorkspaceUnderstanding from "@/components/ai-workspace/AiWorkspaceUnderstanding";';
const oldComponent = "<AiWorkspaceFoundation />";
const newComponent = "<AiWorkspaceUnderstanding />";
const oldIntro = "Stage 01 is a deterministic demonstration;\n        natural-language AI interpretation and execution will be added in later stages.";
const newIntro = "Stage 02 recognizes selected natural-language image and photos-to-PDF requests with conservative offline rules.\n        Real AI and workflow execution will be added in later stages.";

if (original.includes(newImport) && original.includes(newComponent) &&
    !original.includes(oldImport) && !original.includes(oldComponent)) {
  console.log("Phase 23 Stage 02 integration already installed.");
  process.exit(0);
}
if (!original.includes(oldImport) || !original.includes(oldComponent) || !original.includes(oldIntro)) {
  throw new Error("STOP: AI Workspace page is different from verified Stage 01. No file was changed.");
}
const updated = original.replace(oldImport, newImport)
  .replace(oldComponent, newComponent)
  .replace(oldIntro, newIntro);
writeFileSync(file, hadCrLf ? updated.replace(/\n/g, "\r\n") : updated, "utf8");
console.log("Phase 23 Stage 02 AI Workspace prompt understanding integrated.");

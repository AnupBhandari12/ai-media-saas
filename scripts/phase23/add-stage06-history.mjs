// Safe one-time Stage 06 integration: two existing files; additive Prisma model.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const model = `// Stage 06: optional user-owned AI Workspace history, separate from permanent media assets.
model WorkspaceHistory {
  id         String   @id @default(cuid())
  ownerId    String
  prompt     String   @db.VarChar(500)
  workflowId String   @db.VarChar(16)
  variantId  String   @db.VarChar(32)
  taskStatus String   @default("SAVED") @db.VarChar(16)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([ownerId, createdAt])
}
`;
function normalize(text) { return text.replace(/\r\n/g, "\n"); }
function instances(text, needle) { return text.split(needle).length - 1; }

const componentPath = resolve(root, "components/ai-workspace/AiWorkspaceUnderstanding.jsx");
const schemaPath = resolve(root, "prisma/schema.prisma");
for (const file of [componentPath, schemaPath]) {
  if (!existsSync(file)) throw new Error(`STOP: Missing required file ${file}`);
}
const cOriginal = readFileSync(componentPath, "utf8");
const sOriginal = readFileSync(schemaPath, "utf8");
let component = normalize(cOriginal), schema = normalize(sOriginal);
const oldImport = 'import WorkspaceAiPlannerPanel from "@/components/ai-workspace/WorkspaceAiPlannerPanel";';
const newImport = `${oldImport}\nimport WorkspaceHistoryPanel from "@/components/ai-workspace/WorkspaceHistoryPanel";`;
// Append panel AFTER whole plan block by anchoring at the unique final end of root div.
const endAnchor = '      )}\n    </div>\n  );\n}';
const newEnd = '      )}\n      <WorkspaceHistoryPanel plan={result?.kind === "PLAN" ? result.plan : null} prompt={prompt} />\n    </div>\n  );\n}';
const componentDone = instances(component, newImport) === 1 && instances(component, newEnd) === 1;
const componentFresh = instances(component, oldImport) === 1 && instances(component, endAnchor) === 1 && !component.includes('import WorkspaceHistoryPanel');
const schemaDone = instances(schema, 'model WorkspaceHistory {') === 1;
const schemaFresh = instances(schema, 'model WorkspaceHistory {') === 0;
if ((!componentDone && !componentFresh) || (!schemaDone && !schemaFresh) || componentDone !== schemaDone) {
  throw new Error("STOP: Missing anchors or partially installed Stage 06; no files changed.");
}
if (componentDone && schemaDone) { console.log("Stage 06 integration already present; no changes."); process.exit(0); }
component = component.replace(oldImport, newImport).replace(endAnchor, newEnd);
schema = schema.trimEnd() + "\n\n" + model;
const emit = (original, changed) => original.includes("\r\n") ? changed.replace(/\n/g, "\r\n") : changed;
try {
  writeFileSync(componentPath, emit(cOriginal, component), "utf8");
  writeFileSync(schemaPath, emit(sOriginal, schema), "utf8");
} catch (error) {
  writeFileSync(componentPath, cOriginal, "utf8");
  writeFileSync(schemaPath, sOriginal, "utf8");
  throw error;
}
console.log("Phase 23 Stage 06 integrated in AI Workspace UI and Prisma schema.");

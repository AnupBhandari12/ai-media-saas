// One-time, additive Stage 05 integration installer; no new packages, secrets or DB migration.
// Preflights ALL files before writing; stops on unexpectedly changed source.
import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {resolve} from "node:path";

const root = process.cwd();
const changes = [
  {
    path:"lib/ai/aiReservationIdentity.mjs",
    patches:[[ 'const TEXT_ACTIONS = new Set(["CAPTION", "ALT_TEXT"]);',
      'const TEXT_ACTIONS = new Set(["CAPTION", "ALT_TEXT", "WORKSPACE_PLAN"]);' ]],
  },
  {
    path:"lib/ai/aiQuotaReservation.mjs",
    patches:[[ '!\u005b"CAPTION", "ALT_TEXT"\u005d.includes(identity.action)',
      '!\u005b"CAPTION", "ALT_TEXT", "WORKSPACE_PLAN"\u005d.includes(identity.action)' ]],
  },
  {
    path:"lib/ai/realAiGlobalBudget.mjs",
    patches:[[ 'CAPTION: 1000, ALT_TEXT: 30000',
      'CAPTION: 1000, ALT_TEXT: 30000, WORKSPACE_PLAN: 3000' ]],
  },
  {
    path:"lib/ai-workspace/reviewGate.js",
    patches:[[ '["CANONICAL_EXAMPLE", "DETERMINISTIC_INTENT"].includes(plan.source)',
      '["CANONICAL_EXAMPLE", "DETERMINISTIC_INTENT", "MODEL_SUGGESTION"].includes(plan.source)' ]],
  },
  {
    path:"components/ai-workspace/AiWorkspaceUnderstanding.jsx",
    patches:[
      ['import WorkspacePlanReview from "@/components/ai-workspace/WorkspacePlanReview";',
       'import WorkspacePlanReview from "@/components/ai-workspace/WorkspacePlanReview";\nimport WorkspaceAiPlannerPanel from "@/components/ai-workspace/WorkspaceAiPlannerPanel";'],
      ['export default function AiWorkspaceUnderstanding() {',
       'export default function AiWorkspaceUnderstanding({ realAiEnabled = false }) {'],
      ['      <section aria-label="Prompt understanding examples">',
       '      <WorkspaceAiPlannerPanel key={prompt} prompt={prompt} enabled={realAiEnabled} onOutcome={setResult} />\n\n      <section aria-label="Prompt understanding examples">'],
      ['{result.plan.variantName} · Preview only · No cost or execution',
       '{result.plan.variantName} · Workflow preview only · No media processing'],
      ['              Describe ONE image or photos-to-PDF result. This stage recognizes selected English phrases\n              using conservative local rules, not a real AI model. It only previews registered steps;\n              it never uploads files, spends credits, or starts processing. Acknowledgment only reveals an approved workflow link.',
       '              Describe ONE image or photos-to-PDF result. Free local preview uses conservative rules;\n              the optional AI interpreter is a separate, explicitly confirmed paid text request.\n              Neither preview executes media tools. Acknowledgment only reveals approved execution controls.'],
    ],
  },
  {
    path:"components/ai-workspace/WorkspacePlanReview.jsx",
    patches:[[ '            Verify the destination and {review.steps.length} listed steps above. This preview makes no upload,\n            provider call, credit charge, or file change. The final workflow has its own controls.',
      '            Verify the destination and {review.steps.length} listed steps above. Review/acknowledgment\n            does not upload files, call providers, or start processing. A separately approved AI interpretation\n            request may already have used quota. The final workflow has its own controls.' ]],
  },
  {
    path:"app/(dashboard)/ai-workspace/page.js",
    patches:[
      ['export default function AiWorkspacePage() {',
       'export default function AiWorkspacePage() {\n  const realAiEnabled = process.env.AI_WORKSPACE_PLANNER_ENABLED === "true" &&\n    process.env.AI_REAL_SPEND_APPROVED === "true" &&\n    typeof process.env.OPENAI_API_KEY === "string" && process.env.OPENAI_API_KEY.startsWith("sk-");'],
      ['        Other approved workflows still run on their existing pages; no remote AI execution or credits here.',
       '        Other approved workflows run on their existing pages. Optional text-only AI planning is disabled by default and requires explicit consent and a server-side quota/budget reservation.'],
      ['      <AiWorkspaceUnderstanding />',
       '      <AiWorkspaceUnderstanding realAiEnabled={realAiEnabled} />'],
    ],
  },
];

function norm(text) {return text.replace(/\r\n/g,"\n");}
function countOccurrences(text,fragment) {return text.split(fragment).length-1;}
const prepared = [];
for (const item of changes) {
  const file=resolve(root,item.path);
  if (!existsSync(file)) throw new Error(`STOP: Missing existing file ${item.path}`);
  const original=readFileSync(file,"utf8");
  let data=norm(original);
  let changed=0, already=0;
  for (const [from,to] of item.patches) {
    const fc=countOccurrences(data,from),tc=countOccurrences(data,to);
    if (tc===1 && fc<=1) already++; // "from" may be a prefix of already-patched "to".
    else if (fc===1 && tc===0) {data=data.replace(from,to);changed++;}
    else throw new Error(`STOP: Unexpected ${item.path} patch anchor. No files were written.`);
  }
  if (changed && already) throw new Error(`STOP: Partially integrated ${item.path}; no files written.`);
  const output=original.includes("\r\n")?data.replace(/\n/g,"\r\n"):data;
  prepared.push({file,original,output,changed,already,path:item.path});
}
const totalChanged=prepared.filter(x=>x.changed).length;
const totalAlready=prepared.filter(x=>x.already).length;
if (totalChanged && totalAlready) throw new Error("STOP: Partial Stage 05 installation detected; no files written.");
if (!totalChanged) {console.log("Stage 05 integration already present; no changes.");process.exit(0);}
const updated=[];
try {
  for (const item of prepared) {
    writeFileSync(item.file,item.output,"utf8");
    updated.push(item);
  }
} catch(error) {
  for (const item of updated.reverse()) writeFileSync(item.file,item.original,"utf8");
  throw error;
}
console.log(`Phase 23 Stage 05 integrated in ${updated.length} existing files.`);

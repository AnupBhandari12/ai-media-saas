// Stage 03 guarded install: only the reviewed WorkflowHub link and fixed step-list guard.
import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";

function stop(message) {console.error(`STOP: ${message}`); process.exit(1);}
const branch = execFileSync("git", ["branch", "--show-current"], {encoding: "utf8"}).trim();
if (branch !== "feat/phase22-workflows") stop("Expected feat/phase22-workflows branch.");
const nav = resolve("components/workflows/WorkflowHub.jsx");
const engine = resolve("lib/workflows/runLocalWorkflow.js");
const navSource = readFileSync(nav, "utf8");
const engineSource = readFileSync(engine, "utf8");
if (navSource.includes('href="/workflows/whatsapp-ready"')) stop("WhatsApp link already present; nothing changed.");
if (!navSource.includes('href="/workflows/website-ready"')) stop("Stage 02 Website Ready link is missing.");
const anchor = '                <button\n                  type="button" onClick={() => toggle(workflow)}';
if (navSource.split(anchor).length !== 2) stop("WorkflowHub does not match the reviewed anchor.");
const beforeList = 'const ALLOWED_STEPS = Object.freeze(["IMG-03", "IMG-05", "IMG-14", "IMG-02"]);';
const beforeCheck = `if (!Array.isArray(steps) || steps.length !== ALLOWED_STEPS.length ||\n      steps.some((id, index) => id !== ALLOWED_STEPS[index])) {`;
if (engineSource.split(beforeList).length !== 2 || engineSource.split(beforeCheck).length !== 2) {
  stop("The shared executor changed; manual review required (no files modified).");
}
const afterList = `const APPROVED_SEQUENCES = Object.freeze([\n  Object.freeze(["IMG-03", "IMG-05", "IMG-14", "IMG-02"]),\n  Object.freeze(["IMG-05", "IMG-02"]),\n]);\nfunction isApprovedSequence(steps) {\n  return Array.isArray(steps) && APPROVED_SEQUENCES.some((approved) =>\n    steps.length === approved.length && approved.every((id, i) => id === steps[i]));\n}`;
const navLink = `                {workflow.id === "WF-01" && (\n                  <Link href="/workflows/whatsapp-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">\n                    Try WhatsApp Ready (photo beta) <ArrowRight size={17} aria-hidden="true" />\n                  </Link>\n                )}\n`;
const oldBanner = `Planning preview • Stage 01`;
const oldNotice = `These are step previews, not working one-click conversions yet. No
              files are uploaded, no credits are used, and paid AI stays off.
              Select a workflow to inspect its existing tools.`;
const oldCount = `{visible.length} of {workflows.length} planned workflows`;
const oldStatus = `{workflow.priority} • Planned`;
const oldDisclaimer = `Step compatibility, errors, size limits and automatic chaining will be verified in later stages.`;
for (const token of [oldBanner, oldNotice, oldCount, oldStatus, oldDisclaimer]) {
  if (navSource.split(token).length !== 2) stop(`WorkflowHub wording changed. Manual review required (no files modified): ${token.slice(0, 40)}`);
}
const updatedEngine = engineSource.replace(beforeList, afterList)
  .replace(beforeCheck, 'if (!isApprovedSequence(steps)) {');
const updatedNav = navSource.replace(anchor, navLink + anchor)
  .replace(oldBanner, `Workflows • Photo betas and plan previews`)
  .replace(oldNotice, `Website Ready and WhatsApp Ready photos can run locally in your browser.
              The remaining workflows are previews only. Video is not enabled.
              No file upload, paid AI call or credits in these photo betas.`)
  .replace(oldCount, `{visible.length} of {workflows.length} workflows`)
  .replace(oldStatus, `{workflow.priority} • {["WF-01", "WF-06"].includes(workflow.id) ? "Photo beta" : "Planned"}`)
  .replace(oldDisclaimer, `Only the photo-beta links above execute today. All other variants and workflows are previews.`);
// Guard all transformations before touching the tree; never modify tool registry or existing utilities.
if (updatedEngine === engineSource || updatedNav === navSource) stop("Nothing to patch.");
try {
  writeFileSync(engine, updatedEngine, "utf8");
  writeFileSync(nav, updatedNav, "utf8");
} catch (error) {
  try {writeFileSync(engine, engineSource, "utf8"); writeFileSync(nav, navSource, "utf8");}
  catch { /* Report the original failure; user must inspect diff. */ }
  stop(`File write failed: ${error.message}`);
}
console.log("Added WhatsApp Ready link: components/workflows/WorkflowHub.jsx");
console.log("Allowed WF-01 two-step sequence: lib/workflows/runLocalWorkflow.js");

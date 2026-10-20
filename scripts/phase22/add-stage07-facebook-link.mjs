// Phase 22 Stage 07: fail-closed, idempotent installer. Only the Workflows hub is changed.
import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
function stop(message) { console.error(`STOP: ${message}`); process.exit(1); }
let branch;
try { branch = execFileSync("git", ["branch", "--show-current"], {encoding: "utf8"}).trim(); }
catch { stop("Cannot identify the current branch."); }
if (branch !== "feat/phase22-workflows") stop("Expected feat/phase22-workflows branch.");
const relative = "components/workflows/WorkflowHub.jsx";
const path = resolve(relative);
const enginePath = resolve("lib/workflows/runLocalWorkflow.js");
let source, engine;
try { source = readFileSync(path, "utf8"); engine = readFileSync(enginePath, "utf8"); }
catch (err) { stop(`Missing Stage 06 prerequisite: ${err.message}`); }
if (source.includes('href="/workflows/facebook-ready"')) {
  console.log("Facebook Ready link already installed; no files modified.");
  process.exit(0);
}
try { execFileSync("git", ["diff", "--quiet", "HEAD", "--", relative, "lib/workflows/runLocalWorkflow.js"]); }
catch { stop("Shared workflow files have uncommitted changes; review before installation."); }
const links = ["website-ready", "whatsapp-ready", "email-ready", "job-form-ready", "instagram-ready"];
if (!links.every((slug) => source.includes(`href="/workflows/${slug}"`))) {
  stop("Earlier workflow links are missing. No files modified.");
}
if (!engine.includes('Object.freeze(["IMG-08", "IMG-03", "IMG-01"])')) {
  stop("Approved photo processing sequence missing; do not alter the executor.");
}
const banner = 'Website Ready, WhatsApp Ready, Email Ready, Job / Form Ready and Instagram Ready photo branches run locally in your browser.';
const status = '["WF-01", "WF-02", "WF-06", "WF-07", "WF-08"].includes(workflow.id)';
const anchor = '                <button\n                  type="button" onClick={() => toggle(workflow)}';
for (const [needle, name] of [[banner,"Stage 06 banner"],[status,"Stage 06 status"],[anchor,"card link anchor"]]) {
  if (source.split(needle).length !== 2) stop(`${name} is not the reviewed Stage 06 version. No files modified.`);
}
const link = `                {workflow.id === "WF-03" && (
                  <Link href="/workflows/facebook-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try Facebook Ready (photo beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
`;
const updated = source.replace(anchor, link + anchor)
  .replace(banner, 'Website, WhatsApp, Email, Job / Form, Instagram and Facebook Ready photo branches run locally in your browser.')
  .replace(status, '["WF-01", "WF-02", "WF-03", "WF-06", "WF-07", "WF-08"].includes(workflow.id)');
if (updated === source) stop("No safe changes to apply.");
try { writeFileSync(path, updated, "utf8"); }
catch (err) { stop(`Could not write Workflow Hub: ${err.message}`); }
console.log("Added Facebook Ready photo-beta link: components/workflows/WorkflowHub.jsx");
console.log("Reused approved IMG-08 → IMG-03 → IMG-01 sequence; executor unchanged.");

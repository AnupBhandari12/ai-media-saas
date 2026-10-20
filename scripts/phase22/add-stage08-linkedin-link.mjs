// Guarded Stage 08 installer. Only WorkflowHub and the reviewed executor allowlist are updated.
import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
function stop(msg) { console.error(`STOP: ${msg}`); process.exit(1); }
let branch;
try { branch = execFileSync("git", ["branch", "--show-current"], {encoding: "utf8"}).trim(); }
catch { stop("Cannot read the current Git branch."); }
if (branch !== "feat/phase22-workflows") stop("Expected feat/phase22-workflows branch.");
const hubPath = resolve("components/workflows/WorkflowHub.jsx");
const enginePath = resolve("lib/workflows/runLocalWorkflow.js");
const hubRelative = "components/workflows/WorkflowHub.jsx";
const engineRelative = "lib/workflows/runLocalWorkflow.js";
let hub, engine;
try { hub = readFileSync(hubPath, "utf8"); engine = readFileSync(enginePath, "utf8"); }
catch (error) { stop(`Missing Stage 07 prerequisite: ${error.message}`); }
const linkExists = hub.includes('href="/workflows/linkedin-ready"');
const seq = 'Object.freeze(["IMG-03", "IMG-05", "IMG-01"])';
const seqExists = engine.includes(seq);
if (linkExists && seqExists) { console.log("Stage 08 LinkedIn post link and executor already installed."); process.exit(0); }
if (linkExists !== seqExists) stop("Partial Stage 08 installation detected; review the diff before retry.");
try { execFileSync("git", ["diff", "--quiet", "HEAD", "--", hubRelative, engineRelative]); }
catch { stop("Shared workflow files are modified; review changes before installing."); }
const earlier = ["website-ready", "whatsapp-ready", "email-ready", "job-form-ready", "instagram-ready", "facebook-ready"];
if (!earlier.every((slug) => hub.includes(`href="/workflows/${slug}"`))) {
  stop("Earlier workflow links missing. No changes made.");
}
const anchor = '                <button\n                  type="button" onClick={() => toggle(workflow)}';
const banner = "Website, WhatsApp, Email, Job / Form, Instagram and Facebook Ready photo branches run locally in your browser.";
const status = '["WF-01", "WF-02", "WF-03", "WF-06", "WF-07", "WF-08"].includes(workflow.id)';
const engineAnchor = '  Object.freeze(["IMG-08", "IMG-03", "IMG-01"]),\n]);';
for (const [s,needle,label] of [[hub,anchor,"hub anchor"],[hub,banner,"Stage 07 banner"],
  [hub,status,"Stage 07 status"],[engine,engineAnchor,"approved sequences"]]) {
  if (s.split(needle).length !== 2) stop(`Unexpected ${label}; no files modified.`);
}
const link = `                {workflow.id === "WF-04" && (
                  <Link href="/workflows/linkedin-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try LinkedIn Ready (post beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
`;
const newHub = hub.replace(anchor, link + anchor)
  .replace(banner, "Website, WhatsApp, Email, Job / Form, Instagram, Facebook and LinkedIn Ready image branches run locally in your browser.")
  .replace(status, '["WF-01", "WF-02", "WF-03", "WF-04", "WF-06", "WF-07", "WF-08"].includes(workflow.id)');
const newEngine = engine.replace(engineAnchor,
  '  Object.freeze(["IMG-08", "IMG-03", "IMG-01"]),\n  Object.freeze(["IMG-03", "IMG-05", "IMG-01"]),\n]);');
if (newHub === hub || newEngine === engine) stop("No reviewed changes to apply.");
try { writeFileSync(enginePath, newEngine, "utf8"); writeFileSync(hubPath, newHub, "utf8"); }
catch (error) {
  try { writeFileSync(enginePath, engine, "utf8"); writeFileSync(hubPath, hub, "utf8"); }
  catch { /* User must inspect any partial write before continuing. */ }
  stop(`Could not install Stage 08: ${error.message}`);
}
console.log("Added LinkedIn Ready post-beta link: components/workflows/WorkflowHub.jsx");
console.log("Approved WF-04 post IMG-03 → IMG-05 → IMG-01 sequence: lib/workflows/runLocalWorkflow.js");

// Guarded, idempotent Stage 09 installer; only Hub and approved shared executor change.
import {readFileSync,writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
function stop(message) {console.error(`STOP: ${message}`);process.exit(1);}
let branch;
try {branch=execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim();}
catch {stop("Cannot read the Git branch.");}
if (branch!=="feat/phase22-workflows") stop("Expected feat/phase22-workflows branch.");
const hubRelative="components/workflows/WorkflowHub.jsx";
const engineRelative="lib/workflows/runLocalWorkflow.js";
let hub,engine;
try {hub=readFileSync(resolve(hubRelative),"utf8");engine=readFileSync(resolve(engineRelative),"utf8");}
catch(error) {stop(`Missing shared workflow source: ${error.message}`);}
const linkAlready=hub.includes('href="/workflows/youtube-ready"');
const sequence='Object.freeze(["CRT-04", "IMG-02"])';
const sequenceAlready=engine.includes(sequence);
if (linkAlready && sequenceAlready) {console.log("Stage 09 YouTube Ready already installed.");process.exit(0);}
if (linkAlready!==sequenceAlready) stop("Partial installation: one shared file changed. Review manually.");
try {execFileSync("git",["diff","--quiet","HEAD","--",hubRelative,engineRelative]);}
catch {stop("Shared workflow files have local changes; no files modified.");}
const previous=["website-ready","whatsapp-ready","email-ready","job-form-ready","instagram-ready","facebook-ready","linkedin-ready"];
if (!previous.every((slug)=>hub.includes(`href="/workflows/${slug}"`))) stop("Prior workflow links missing.");
const anchor='                <button\n                  type="button" onClick={() => toggle(workflow)}';
const prevSequence='  Object.freeze(["IMG-03", "IMG-05", "IMG-01"]),\n]);';
const oldBanner="Website, WhatsApp, Email, Job / Form, Instagram, Facebook and LinkedIn Ready image branches run locally in your browser.";
const oldStatus='["WF-01", "WF-02", "WF-03", "WF-04", "WF-06", "WF-07", "WF-08"].includes(workflow.id)';
for (const [source,needle,label] of [
  [hub,anchor,"button anchor"],[hub,oldBanner,"intro text"],[hub,oldStatus,"card status"],
  [engine,prevSequence,"engine sequence"],
]) {
  if (source.split(needle).length!==2) stop(`Unexpected ${label}; no files modified.`);
}
const link=`                {workflow.id === "WF-05" && (
                  <Link href="/workflows/youtube-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try YouTube Ready (thumbnail beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
`;
const nextHub=hub.replace(anchor,link+anchor)
  .replace(oldBanner,"Website, WhatsApp, Email, Job / Form, Instagram, Facebook, LinkedIn and YouTube Ready image branches run locally in your browser.")
  .replace(oldStatus,'["WF-01", "WF-02", "WF-03", "WF-04", "WF-05", "WF-06", "WF-07", "WF-08"].includes(workflow.id)')
  .replace('{["WF-01", "WF-02", "WF-03", "WF-04", "WF-05", "WF-06", "WF-07", "WF-08"].includes(workflow.id) ? "Photo beta" : "Planned"}',
    '{["WF-01", "WF-02", "WF-03", "WF-04", "WF-05", "WF-06", "WF-07", "WF-08"].includes(workflow.id) ? "Image beta" : "Planned"}');
const nextEngine=engine.replace(prevSequence,
  '  Object.freeze(["IMG-03", "IMG-05", "IMG-01"]),\n  Object.freeze(["CRT-04", "IMG-02"]),\n]);');
if (nextHub===hub || nextEngine===engine) stop("Changes already applied or incompatible anchors.");
try {writeFileSync(resolve(engineRelative),nextEngine,"utf8");writeFileSync(resolve(hubRelative),nextHub,"utf8");}
catch(error) {
  try {writeFileSync(resolve(engineRelative),engine,"utf8");writeFileSync(resolve(hubRelative),hub,"utf8");}
  catch { /* manual inspection required if rollback fails */ }
  stop(`Installation failed: ${error.message}`);
}
console.log("Added YouTube Ready thumbnail-beta link: components/workflows/WorkflowHub.jsx");
console.log("Approved WF-05 CRT-04 -> IMG-02 sequence: lib/workflows/runLocalWorkflow.js");

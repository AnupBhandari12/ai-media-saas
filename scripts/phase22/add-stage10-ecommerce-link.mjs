import {readFileSync,writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
function stop(message) {console.error(`STOP: ${message}`);process.exit(1);}
let branch;
try {branch=execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim();}
catch {stop("Cannot read Git branch.");}
if (branch!=="feat/phase22-workflows") stop("Expected feat/phase22-workflows branch.");
const hubPath="components/workflows/WorkflowHub.jsx";
const enginePath="lib/workflows/runLocalWorkflow.js";
let hub,engine;
try {hub=readFileSync(resolve(hubPath),"utf8");engine=readFileSync(resolve(enginePath),"utf8");}
catch(error) {stop(`Missing shared workflow source: ${error.message}`);}
const linkAlready=hub.includes('href="/workflows/ecommerce-product-pack"');
const sequence='Object.freeze(["IMG-08", "IMG-03", "IMG-12"])';
const seqAlready=engine.includes(sequence);
if (linkAlready&&seqAlready) {console.log("Stage 10 E-commerce Product Pack already installed.");process.exit(0);}
if (linkAlready!==seqAlready) stop("Partial installation: shared files need manual review.");
try {execFileSync("git",["diff","--quiet","HEAD","--",hubPath,enginePath]);}
catch {stop("Shared workflow files have uncommitted changes; no files modified.");}
const prior=["website-ready","whatsapp-ready","email-ready","job-form-ready","instagram-ready","facebook-ready","linkedin-ready","youtube-ready"];
if (!prior.every(slug=>hub.includes(`href="/workflows/${slug}"`))) stop("Missing prior workflow links.");
const anchor='                <button\n                  type="button" onClick={() => toggle(workflow)}';
const oldBanner="Website, WhatsApp, Email, Job / Form, Instagram, Facebook, LinkedIn and YouTube Ready image branches run locally in your browser.";
const oldStatus='["WF-01", "WF-02", "WF-03", "WF-04", "WF-05", "WF-06", "WF-07", "WF-08"].includes(workflow.id)';
const prevSequence='  Object.freeze(["CRT-04", "IMG-02"]),\n]);';
for(const [content,needle,section] of [[hub,anchor,"button"],[hub,oldBanner,"banner"],
  [hub,oldStatus,"status"],[engine,prevSequence,"approved sequence"]]) {
  if (content.split(needle).length!==2) stop(`Unexpected ${section} anchor; no changes made.`);
}
const newLink=`                {workflow.id === "WF-09" && (
                  <Link href="/workflows/ecommerce-product-pack" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try E-commerce Product Pack (photo beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
`;
const nextHub=hub.replace(anchor,newLink+anchor)
 .replace(oldBanner,"Website, WhatsApp, Email, Job / Form, Instagram, Facebook, LinkedIn, YouTube and E-commerce image branches run locally in your browser.")
 .replace(oldStatus,'["WF-01", "WF-02", "WF-03", "WF-04", "WF-05", "WF-06", "WF-07", "WF-08", "WF-09"].includes(workflow.id)');
const nextEngine=engine.replace(prevSequence,
  '  Object.freeze(["CRT-04", "IMG-02"]),\n  Object.freeze(["IMG-08", "IMG-03", "IMG-12"]),\n]);');
if(nextHub===hub||nextEngine===engine) stop("Installer did not create expected changes.");
try {writeFileSync(resolve(enginePath),nextEngine,"utf8");writeFileSync(resolve(hubPath),nextHub,"utf8");}
catch(error) {
  try {writeFileSync(resolve(enginePath),engine,"utf8");writeFileSync(resolve(hubPath),hub,"utf8");}
  catch { /* manual recovery if disk rollback fails */ }
  stop(`Installer error: ${error.message}`);
}
console.log("Added E-commerce Product Pack photo beta to WorkflowHub.jsx");
console.log("Approved WF-09 IMG-08 → IMG-03 → IMG-12 in runLocalWorkflow.js");

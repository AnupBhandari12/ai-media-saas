// Phase 22 Stage 06: fail-closed installer. ONLY WorkflowHub and fixed executor sequences.
import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";

function stop(message) { console.error(`STOP: ${message}`); process.exit(1); }
let branch;
try { branch = execFileSync("git", ["branch", "--show-current"], {encoding: "utf8"}).trim(); }
catch { stop("Cannot identify the current Git branch."); }
if (branch !== "feat/phase22-workflows") stop("Expected feat/phase22-workflows branch.");
const nav = resolve("components/workflows/WorkflowHub.jsx");
const executor = resolve("lib/workflows/runLocalWorkflow.js");
let navSource, engineSource;
try { navSource = readFileSync(nav, "utf8"); engineSource = readFileSync(executor, "utf8"); }
catch (error) { stop(`Missing Stage 05 prerequisites: ${error.message}`); }
if (navSource.includes('href="/workflows/instagram-ready"')) stop("Instagram link already exists; nothing modified.");
if (!["website-ready", "whatsapp-ready", "email-ready", "job-form-ready"].every(
  (slug) => navSource.includes(`href="/workflows/${slug}"`))) {
  stop("Earlier workflow links are missing; no files modified.");
}
// Do not overwrite any unrelated local edits on shared files.
try {
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", "components/workflows/WorkflowHub.jsx", "lib/workflows/runLocalWorkflow.js"]);
} catch { stop("Shared files have uncommitted changes. Review them before installing."); }
const anchor = '                <button\n                  type="button" onClick={() => toggle(workflow)}';
const oldBanner = 'Website Ready, WhatsApp Ready, Email Ready and Job / Form Ready photo branches run locally in your browser.\n              Other variants remain previews only; no PDFs or video workflows are enabled.\n              No file upload, paid AI call or credits in these browser betas.';
const oldStatus = '["WF-01", "WF-06", "WF-07", "WF-08"].includes(workflow.id)';
const oldDisclaimer = 'Only approved browser image-beta links execute. PDF, video and every other workflow variant remain previews. Check the receiving form rules yourself.';
const oldSequence = '  Object.freeze(["IMG-10", "IMG-02"]),\n]);';
for (const [source, needle, name] of [
  [navSource, anchor, "card anchor"],
  [navSource, oldBanner, "Stage 05 banner"],
  [navSource, oldStatus, "Stage 05 badge"],
  [navSource, oldDisclaimer, "Stage 05 disclaimer"],
  [engineSource, oldSequence, "Stage 05 executor allowlist"],
]) {
  if (source.split(needle).length !== 2) stop(`${name} differs from reviewed Stage 05 source. No changes made.`);
}
for (const sequence of [
  '["IMG-03", "IMG-05", "IMG-14", "IMG-02"]',
  '["IMG-05", "IMG-02"]',
  '["IMG-02"]',
  '["IMG-10", "IMG-02"]',
]) {
  if (!engineSource.includes(`Object.freeze(${sequence})`)) stop("Earlier approved sequence missing.");
}
const link = `                {workflow.id === "WF-02" && (
                  <Link href="/workflows/instagram-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try Instagram Ready (photo beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
`;
const nextNav = navSource.replace(anchor, link + anchor)
  .replace(oldBanner, 'Website Ready, WhatsApp Ready, Email Ready, Job / Form Ready and Instagram Ready photo branches run locally in your browser.\n              PDF, reel and video variants remain previews only.\n              No file upload, paid AI call or credits in these browser betas.')
  .replace(oldStatus, '["WF-01", "WF-02", "WF-06", "WF-07", "WF-08"].includes(workflow.id)')
  .replace(oldDisclaimer, 'Only approved browser image-beta links execute. PDF, reel, video and other workflow variants remain previews. Always inspect final crops and receiving requirements.');
const nextEngine = engineSource.replace(oldSequence,
  '  Object.freeze(["IMG-10", "IMG-02"]),\n  Object.freeze(["IMG-08", "IMG-03", "IMG-01"]),\n]);');
if (nextNav === navSource || nextEngine === engineSource) stop("No changes to install.");
try {
  writeFileSync(executor, nextEngine, "utf8");
  writeFileSync(nav, nextNav, "utf8");
} catch (error) {
  try { writeFileSync(executor, engineSource, "utf8"); writeFileSync(nav, navSource, "utf8"); }
  catch { /* Report and require the user to inspect git diff. */ }
  stop(`Could not finish installation: ${error.message}`);
}
console.log("Added Instagram Ready photo-beta link: components/workflows/WorkflowHub.jsx");
console.log("Approved WF-02 exact 3-step sequence: lib/workflows/runLocalWorkflow.js");

// Phase 22 Stage 05 guarded setup: ONLY existing WorkflowHub + fixed executor allowlist.
import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";

function stop(message) {console.error(`STOP: ${message}`); process.exit(1);}
let branch;
try {branch = execFileSync("git", ["branch", "--show-current"], {encoding: "utf8"}).trim();}
catch {stop("Unable to check Git branch.");}
if (branch !== "feat/phase22-workflows") stop("Expected feat/phase22-workflows branch.");
const nav = resolve("components/workflows/WorkflowHub.jsx");
const engine = resolve("lib/workflows/runLocalWorkflow.js");
let navSource, engineSource;
try {navSource = readFileSync(nav, "utf8"); engineSource = readFileSync(engine, "utf8");}
catch (error) {stop(`Could not read prerequisites: ${error.message}`);}
if (navSource.includes('href="/workflows/job-form-ready"')) {
  stop("Job/Form Ready already installed; no files modified.");
}
if (!["website-ready", "whatsapp-ready", "email-ready"].every(
  (slug) => navSource.includes(`href="/workflows/${slug}"`))) {
  stop("Stage 02–04 links are missing; no files modified.");
}
const anchor = '                <button\n                  type="button" onClick={() => toggle(workflow)}';
const oldBanner = 'Website Ready, WhatsApp Ready and Email Ready image attachments run locally in your browser.\n              Other workflow variants are previews only; email PDF and videos are not enabled.\n              No file upload, paid AI call or credits in these browser betas.';
const oldStatus = '["WF-01", "WF-06", "WF-07"].includes(workflow.id)';
const oldDisclaimer = 'Only approved browser image-beta links above execute today. PDF, video and all other workflow variants remain previews.';
const oldList = '  Object.freeze(["IMG-02"]),\n]);';
for (const [source, needle, label] of [
  [navSource, anchor, "Workflow Hub card anchor"],
  [navSource, oldBanner, "Stage 04 banner"],
  [navSource, oldStatus, "Stage 04 status marker"],
  [navSource, oldDisclaimer, "Stage 04 preview disclaimer"],
  [engineSource, oldList, "Stage 04 allowlist"],
]) {
  if (source.split(needle).length !== 2) stop(`${label} changed. Manual review required; no files modified.`);
}
if (!engineSource.includes('  Object.freeze(["IMG-03", "IMG-05", "IMG-14", "IMG-02"]),') ||
    !engineSource.includes('  Object.freeze(["IMG-05", "IMG-02"]),')) {
  stop("Earlier workflow sequences missing. No files modified.");
}
const link = `                {workflow.id === "WF-08" && (
                  <Link href="/workflows/job-form-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try Job / Form Ready (photo beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
`;
const nextNav = navSource.replace(anchor, link + anchor)
  .replace(oldBanner, 'Website Ready, WhatsApp Ready, Email Ready and Job / Form Ready photo branches run locally in your browser.\n              Other variants remain previews only; no PDFs or video workflows are enabled.\n              No file upload, paid AI call or credits in these browser betas.')
  .replace(oldStatus, '["WF-01", "WF-06", "WF-07", "WF-08"].includes(workflow.id)')
  .replace(oldDisclaimer, 'Only approved browser image-beta links execute. PDF, video and every other workflow variant remain previews. Check the receiving form rules yourself.');
const nextEngine = engineSource.replace(oldList,
  '  Object.freeze(["IMG-02"]),\n  Object.freeze(["IMG-10", "IMG-02"]),\n]);');
if (nextNav === navSource || nextEngine === engineSource) stop("No changes prepared.");
try {
  writeFileSync(engine, nextEngine, "utf8");
  writeFileSync(nav, nextNav, "utf8");
} catch (error) {
  try {writeFileSync(engine, engineSource, "utf8"); writeFileSync(nav, navSource, "utf8");}
  catch { /* User should inspect git diff if a disk write failed. */ }
  stop(`Installation failed: ${error.message}`);
}
console.log("Added Job/Form Ready photo-beta link: components/workflows/WorkflowHub.jsx");
console.log("Approved WF-08 exact 2-step sequence: lib/workflows/runLocalWorkflow.js");

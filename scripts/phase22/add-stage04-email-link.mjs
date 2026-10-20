// Stage 04 guarded installation. Updates only WorkflowHub and shared fixed-sequence allowlist.
import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";

function stop(message) {console.error(`STOP: ${message}`); process.exit(1);}
const branch = execFileSync("git", ["branch", "--show-current"], {encoding: "utf8"}).trim();
if (branch !== "feat/phase22-workflows") stop("Expected feat/phase22-workflows branch.");
const nav = resolve("components/workflows/WorkflowHub.jsx");
const engine = resolve("lib/workflows/runLocalWorkflow.js");
let navSource;
let engineSource;
try {navSource = readFileSync(nav, "utf8"); engineSource = readFileSync(engine, "utf8");}
catch (error) {stop(`Could not read prerequisite files: ${error.message}`);}
if (navSource.includes('href="/workflows/email-ready"')) stop("Email Ready link already installed; no files changed.");
if (!navSource.includes('href="/workflows/whatsapp-ready"') ||
    !navSource.includes('href="/workflows/website-ready"')) {
  stop("Stage 02/03 links are missing; no files changed.");
}
const anchor = '                <button\n                  type="button" onClick={() => toggle(workflow)}';
const oldSequence = '  Object.freeze(["IMG-05", "IMG-02"]),\n]);';
const banner = 'Website Ready and WhatsApp Ready photos can run locally in your browser.\n              The remaining workflows are previews only. Video is not enabled.\n              No file upload, paid AI call or credits in these photo betas.';
const status = '["WF-01", "WF-06"].includes(workflow.id)';
const previewWarning = 'Only the photo-beta links above execute today. All other variants and workflows are previews.';
for (const [source, needle, label] of [
  [navSource, anchor, "Workflow Hub insert anchor"],
  [navSource, banner, "Workflow Hub beta banner"],
  [navSource, status, "Workflow Hub badge"],
  [navSource, previewWarning, "Workflow Hub preview disclaimer"],
  [engineSource, oldSequence, "approved executor sequences"],
]) {
  if (source.split(needle).length !== 2) stop(`${label} changed; manual review required (no files modified).`);
}
if (!engineSource.includes('  Object.freeze(["IMG-03", "IMG-05", "IMG-14", "IMG-02"]),')) {
  stop("Stage 02 sequence missing; no files modified.");
}
const link = `                {workflow.id === "WF-07" && (
                  <Link href="/workflows/email-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try Email Ready (image beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
`;
const nextNav = navSource.replace(anchor, link + anchor)
  .replace(banner, 'Website Ready, WhatsApp Ready and Email Ready image attachments run locally in your browser.\n              Other workflow variants are previews only; email PDF and videos are not enabled.\n              No file upload, paid AI call or credits in these browser betas.')
  .replace(status, '["WF-01", "WF-06", "WF-07"].includes(workflow.id)')
  .replace(previewWarning, 'Only approved browser image-beta links above execute today. PDF, video and all other workflow variants remain previews.');
const nextEngine = engineSource.replace(oldSequence,
  '  Object.freeze(["IMG-05", "IMG-02"]),\n  Object.freeze(["IMG-02"]),\n]);');
if (nextNav === navSource || nextEngine === engineSource) stop("No changes prepared.");
try {
  writeFileSync(engine, nextEngine, "utf8");
  writeFileSync(nav, nextNav, "utf8");
} catch (error) {
  try {writeFileSync(engine, engineSource, "utf8"); writeFileSync(nav, navSource, "utf8");}
  catch { /* Report initial error. Review local git diff before retrying. */ }
  stop(`Could not finish installation: ${error.message}`);
}
console.log("Added Email Ready image-beta link: components/workflows/WorkflowHub.jsx");
console.log("Approved WF-07 one-step sequence: lib/workflows/runLocalWorkflow.js");

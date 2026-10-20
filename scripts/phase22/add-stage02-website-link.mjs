// Guarded Stage 02 patch; changes only the exact Stage 01 WorkflowHub insertion anchor.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

function fail(message) { console.error(`STOP: ${message}`); process.exit(1); }
const branch = execFileSync("git", ["branch", "--show-current"], {encoding: "utf8"}).trim();
if (branch !== "feat/phase22-workflows") fail("Expected feat/phase22-workflows branch.");
const path = resolve("components/workflows/WorkflowHub.jsx");
const source = readFileSync(path, "utf8");
if (source.includes('href="/workflows/website-ready"')) fail("Website Ready link already installed; nothing changed.");
const anchor = '                <button\n                  type="button" onClick={() => toggle(workflow)}';
if (source.split(anchor).length !== 2 || !source.includes("const open = expandedId === workflow.id;")) {
  fail("WorkflowHub differs from reviewed Stage 01 version.");
}
const insert = `                {workflow.id === "WF-06" && (\n                  <Link href="/workflows/website-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">\n                    Try Website Ready (local beta) <ArrowRight size={17} aria-hidden="true" />\n                  </Link>\n                )}\n`;
writeFileSync(path, source.replace(anchor, insert + anchor), "utf8");
console.log("Added Website Ready local-beta link: components/workflows/WorkflowHub.jsx");

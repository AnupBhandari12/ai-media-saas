// Phase 19B5 — opt-in, local-only single-process worker loop.
// Run: bun --env-file=.env.local scripts/worker/run-auto.mjs
// Ctrl+C requests shutdown; on Windows a console signal may interrupt the active child.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { assertAutoDispatchEnabled } from "../../lib/worker/maintenanceRules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workerFile = path.join(root, "scripts", "worker", "run-once.mjs");
const POLL_MS = 15_000;
let stopping = false;
let child = null;

function requestStop() {
  if (stopping) return;
  stopping = true;
  console.log("Stop requested. If the current job was interrupted, inspect its status before retrying.");
  // We do not intentionally kill the child, but console signals can reach it on Windows.
}
process.on("SIGINT", requestStop);
process.on("SIGTERM", requestStop);

async function runOne() {
  return new Promise((resolve) => {
    child = spawn(process.execPath, [workerFile], {
      cwd: root, env: process.env, windowsHide: true, shell: false, stdio: "inherit",
    });
    child.once("error", error => {
      console.error("Could not start the local worker:", error.message);
      child = null;
      resolve(1);
    });
    child.once("exit", (code, signal) => {
      child = null;
      resolve(signal ? 1 : (code ?? 1));
    });
  });
}

async function main() {
  assertAutoDispatchEnabled();
  console.log("Phase 19B5: local automatic Office worker running for your configured Clerk user only.");
  console.log("One job at a time; every 15 seconds; Ctrl+C to stop. NOT hosted or production-ready.");
  while (!stopping) {
    const code = await runOne();
    if (code !== 0) {
      console.warn("A worker invocation failed; its status may need review. Automatic retry is disabled.");
    }
    if (!stopping) await sleep(POLL_MS);
  }
  console.log("Local auto worker stopped.");
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

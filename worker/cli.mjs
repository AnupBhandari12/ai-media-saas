import { spawn } from "node:child_process";
import { lstat, mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { MAX_INPUT_BYTES, validateWorkerRequest } from "./validation.mjs";
import { protectPdf, readPdfPassword } from "./pdfProtection.mjs";

const INPUT_DIR = "/work/input";
const OUTPUT_DIR = "/work/output";
const TIMEOUT_MS = 90_000;

function run(command, args, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, HOME: "/tmp", XDG_CONFIG_HOME: "/tmp/.config" },
    });
    let output = "";
    let settled = false;
    const append = chunk => { output = (output + chunk.toString()).slice(-8000); };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("error", error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (signal === "SIGKILL") return reject(new Error("Worker operation timed out."));
      if (code !== 0) return reject(new Error(`${command} failed: ${output.slice(-1000)}`));
      resolve(output.trim());
    });
  });
}

async function validateInput(filename) {
  const location = path.join(INPUT_DIR, filename);
  const info = await lstat(location);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error("Input must be a regular file.");
  if (info.size <= 0 || info.size > MAX_INPUT_BYTES) {
    throw new Error("Input must be between 1 byte and 25 MB.");
  }
  return location;
}

async function health() {
  const commands = [
    ["soffice", ["--version"]],
    ["qpdf", ["--version"]],
    ["gs", ["--version"]],
  ];
  for (const [command, args] of commands) {
    const output = await run(command, args, 15_000);
    console.log(`${command}: ${output.split("\n")[0]}`);
  }
  console.log("Document worker ready.");
}

async function checkPdf(filename) {
  const input = await validateInput(filename);
  await run("qpdf", ["--check", input]);
  console.log(`PASS: ${filename} is readable by qpdf.`);
}

async function convertOffice(request) {
  const input = await validateInput(request.filename);
  await mkdir(OUTPUT_DIR, { recursive: true });
  const output = path.join(OUTPUT_DIR, request.outputFilename);
  await unlink(output).catch(error => { if (error.code !== "ENOENT") throw error; });
  const profile = `file:///tmp/lo-profile-${process.pid}`;
  await run("soffice", [
    `-env:UserInstallation=${profile}`, "--headless", "--convert-to", "pdf",
    "--outdir", OUTPUT_DIR, input,
  ]);
  const result = await stat(output);
  if (!result.isFile() || result.size <= 0) {
    throw new Error("Office conversion produced no PDF.");
  }
  await run("qpdf", ["--check", output]);
  console.log(JSON.stringify({
    status: "COMPLETED", operation: "CONVERT_TO_PDF",
    output: request.outputFilename, bytes: result.size,
  }));
}

async function main() {
  const action = process.argv[2] || "health";
  const filename = process.argv[3];
  const request = validateWorkerRequest(action, filename);
  if (request.action === "health") return health();
  if (request.action === "check") return checkPdf(request.filename);

  if (request.action === "protect") {
    const password = await readPdfPassword(process.stdin);
    const result = await protectPdf(request, password);
    console.log(JSON.stringify({
      status: "COMPLETED", operation: "PROTECT_PDF",
      output: result.filename, bytes: result.bytes,
    }));
    return;
  }

  if (request.action !== "convert") {
    throw new Error("Unsupported worker operation.");
  }
  return convertOffice(request);
}

main().catch(error => {
  console.error(`Worker failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exitCode = 1;
});

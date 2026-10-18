import { spawn } from "node:child_process";
import { lstat, mkdir, open, rm, stat } from "node:fs/promises";
import path from "node:path";

const INPUT_DIR = "/work/input";
const OUTPUT_DIR = "/work/output";
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;
const TIMEOUT_MS = 90_000;

// PDF-16 is ONLY for files the user is authorized to open with a known password.
// Accept short/legacy passwords; PDF-15 has a separate, stronger creation policy.
export function validateUnlockPassword(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 128 ||
      Buffer.byteLength(value, "utf8") > 256 || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error("Enter the known PDF password (1-128 characters, no control characters).");
  }
  return value;
}

// Reads one password only, with a strict cap. Keeps other characters (including
// spaces) intact: a PDF's existing password cannot be normalized arbitrarily.
export async function readUnlockPassword(stdin, maxBytes = 512) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stdin) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.length;
    if (total > maxBytes) throw new Error("Password input exceeds limit.");
    chunks.push(bytes);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  const password = raw.replace(/\r?\n$/, "");
  return validateUnlockPassword(password);
}

// No password appears in these arguments or the host process listing.
// qpdf 11.3 supports --password-file=- (password comes via STDIN).
export function createQpdfUnlockArgs(inputPath, outputPath) {
  if (path.dirname(inputPath) !== INPUT_DIR ||
      path.dirname(outputPath) !== OUTPUT_DIR ||
      !path.basename(inputPath).toLowerCase().endsWith(".pdf") ||
      !path.basename(outputPath).toLowerCase().endsWith(".pdf") ||
      inputPath === outputPath) {
    throw new Error("Invalid PDF worker file path.");
  }
  return ["--password-file=-", "--decrypt", "--", inputPath, outputPath];
}

// qpdf exits with 0, 2, or 3 for --is-encrypted/--requires-password.
// This wrapper returns exit codes so the caller can interpret those modes.
async function runQpdf(args, stdinContent = "") {
  return new Promise((resolve, reject) => {
    const child = spawn("qpdf", args, {
      shell: false,
      stdio: ["pipe", "ignore", "ignore"],
      env: { ...process.env, HOME: "/tmp" },
    });
    let settled = false;
    const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS);
    function finish(error, code) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(new Error("PDF processing could not complete."));
      else resolve(code);
    }
    child.on("error", error => finish(error));
    child.on("close", (code, signal) => {
      if (signal || !Number.isInteger(code)) finish(new Error("qpdf stopped unexpectedly."));
      else finish(null, code);
    });
    child.stdin.on("error", () => {}); // Ignore EPIPE if qpdf exits early.
    child.stdin.end(stdinContent);
  });
}

async function assertPdfInput(location) {
  const info = await lstat(location);
  if (!info.isFile() || info.isSymbolicLink() ||
      info.size < 8 || info.size > MAX_INPUT_BYTES) {
    throw new Error("Choose a regular PDF file of at most 25 MiB.");
  }
  const handle = await open(location, "r");
  try {
    const header = Buffer.alloc(5);
    const { bytesRead } = await handle.read(header, 0, 5, 0);
    if (bytesRead !== 5 || header.toString("ascii") !== "%PDF-") {
      throw new Error("Invalid PDF signature.");
    }
  } finally {
    await handle.close();
  }
}

export async function unlockPdf(request, password) {
  validateUnlockPassword(password);
  const inputPath = path.join(INPUT_DIR, request.filename);
  const outputPath = path.join(OUTPUT_DIR, request.outputFilename);
  const decryptArgs = createQpdfUnlockArgs(inputPath, outputPath);

  await assertPdfInput(inputPath);
  if (await runQpdf(["--is-encrypted", inputPath]) !== 0) {
    throw new Error("This file is not an encrypted PDF or could not be read.");
  }
  // A non-empty password must actually be needed. PDFs with no password
  // requirement can be handled by other PDF tools without decryption.
  if (await runQpdf(["--requires-password", inputPath]) !== 0) {
    throw new Error("This PDF does not require a password or could not be read.");
  }
  // Exit code 3 specifically means the supplied password is correct.
  const authResult = await runQpdf(
    ["--password-file=-", "--requires-password", inputPath],
    `${password}\n`,
  );
  if (authResult !== 3) {
    throw new Error("Incorrect password or unsupported PDF encryption.");
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  await rm(outputPath, { force: true });
  try {
    if (await runQpdf(decryptArgs, `${password}\n`) !== 0) {
      throw new Error("PDF decryption failed.");
    }
    const out = await stat(outputPath);
    if (!out.isFile() || out.size < 20 || out.size > MAX_OUTPUT_BYTES) {
      throw new Error("Invalid unlocked PDF output.");
    }
    if (await runQpdf(["--is-encrypted", outputPath]) !== 2) {
      throw new Error("Output is still encrypted.");
    }
    if (await runQpdf(["--check", outputPath]) !== 0) {
      throw new Error("Unlocked PDF integrity check failed.");
    }
    return { filename: request.outputFilename, bytes: out.size };
  } catch (error) {
    await rm(outputPath, { force: true }).catch(() => {});
    throw error;
  }
}

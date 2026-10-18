import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { lstat, mkdir, open, rm, stat } from "node:fs/promises";
import path from "node:path";

const INPUT_DIR = "/work/input";
const OUTPUT_DIR = "/work/output";
const MAX_BYTES = 25 * 1024 * 1024;
const TIMEOUT_MS = 90_000;

// For the local proof of concept, use a conservative printable-ASCII password.
// qpdf response-file arguments are line-delimited, so never accept line breaks.
export function validatePdfPassword(value) {
  if (typeof value !== "string" ||
      !/^[A-Za-z0-9][\x21-\x7E]{11,63}$/.test(value)) {
    throw new Error(
      "Password must contain 12-64 printable ASCII characters and begin with a letter or digit.",
    );
  }
  return value;
}

export function createQpdfEncryptInput({ inputPath, outputPath, password, ownerPassword }) {
  validatePdfPassword(password);
  if (!/^[0-9a-f]{64}$/.test(ownerPassword) || ownerPassword === password) {
    throw new Error("Invalid generated owner password.");
  }
  // qpdf @- reads each line as a separate argument. Secrets never enter argv.
  return [
    "--encrypt", password, ownerPassword, "256", "--", inputPath, outputPath, "",
  ].join("\n");
}

export async function readPdfPassword(stdin, maxBytes = 256) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maxBytes) throw new Error("Password input exceeds limit.");
    chunks.push(buffer);
  }
  const value = Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  return validatePdfPassword(value);
}

// Do not expose qpdf stdout/stderr to the user: avoid leaking sensitive PDF metadata.
// All qpdf process arguments here are trusted, fixed switches and local paths.
async function qpdf(args, stdinContent) {
  return new Promise((resolve, reject) => {
    const child = spawn("qpdf", args, {
      shell: false,
      stdio: ["pipe", "ignore", "ignore"],
      env: { ...process.env, HOME: "/tmp" },
    });
    let finished = false;
    const timeout = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS);
    function finish(error, code) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (error) reject(new Error("PDF processing could not complete."));
      else resolve(code);
    }
    child.on("error", error => finish(error));
    child.on("close", (code, signal) =>
      signal ? finish(new Error("Timed out.")) : finish(null, code));
    child.stdin.on("error", () => {}); // EPIPE if qpdf rejects input early.
    child.stdin.end(stdinContent ?? "");
  });
}

export async function protectPdf(request, password) {
  validatePdfPassword(password);
  const inputPath = path.join(INPUT_DIR, request.filename);
  const outputPath = path.join(OUTPUT_DIR, request.outputFilename);
  const info = await lstat(inputPath);
  if (!info.isFile() || info.isSymbolicLink() ||
      info.size < 8 || info.size > MAX_BYTES) {
    throw new Error("Choose a regular PDF file of at most 25 MiB.");
  }
  const handle = await open(inputPath, "r");
  try {
    const header = Buffer.alloc(5);
    await handle.read(header, 0, 5, 0);
    if (header.toString("ascii") !== "%PDF-") {
      throw new Error("Invalid PDF signature.");
    }
  } finally {
    await handle.close();
  }

  // qpdf --is-encrypted uses exit 2 for an unencrypted file, 0 for encrypted.
  // Existing encrypted PDFs belong to PDF-16 (unlock), not PDF-15.
  if (await qpdf(["--is-encrypted", inputPath]) !== 2) {
    throw new Error("This PDF may already be encrypted or invalid.");
  }
  if (await qpdf(["--check", inputPath]) !== 0) {
    throw new Error("PDF integrity check failed.");
  }
  await mkdir(OUTPUT_DIR, { recursive: true });
  await rm(outputPath, { force: true });
  try {
    const content = createQpdfEncryptInput({
      inputPath,
      outputPath,
      password,
      ownerPassword: randomBytes(32).toString("hex"),
    });
    const exit = await qpdf(["@-"], content);
    if (exit !== 0) throw new Error("PDF encryption failed.");
    const created = await stat(outputPath);
    if (!created.isFile() || created.size < 20 || created.size > 50 * 1024 * 1024) {
      throw new Error("Invalid protected PDF output.");
    }
    // Must demand a password when opened without one (special qpdf exit 0).
    if (await qpdf(["--requires-password", outputPath]) !== 0) {
      throw new Error("Output did not require a password.");
    }
    return { filename: request.outputFilename, bytes: created.size };
  } catch (error) {
    await rm(outputPath, { force: true }).catch(() => {});
    throw error;
  }
}

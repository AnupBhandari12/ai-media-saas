// Phase 19B9 — PDF-30 Repair / Normalize, best-effort local worker.
// Never overwrite the source PDF. No arbitrary user-supplied command arguments.
import { spawn } from "node:child_process";
import { copyFile, lstat, mkdir, mkdtemp, open, rename, rm } from "node:fs/promises";
import path from "node:path";

const INPUT_DIR = "/work/input";
const OUTPUT_DIR = "/work/output";
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;
const TIMEOUT_MS = 90_000;

// Only fixed qpdf and Ghostscript switches; no user-supplied CLI flags.
export function pdfRepairCommand(method, inputPath, outputPath) {
  const relative = path.relative(OUTPUT_DIR, outputPath);
  if (path.dirname(inputPath) !== INPUT_DIR || path.extname(inputPath).toLowerCase() !== ".pdf" ||
      !relative || relative === "." || relative.startsWith("..") ||
      path.isAbsolute(relative) || path.extname(outputPath).toLowerCase() !== ".pdf") {
    throw new Error("Invalid PDF repair paths.");
  }
  if (method === "qpdf") {
    return { command: "qpdf", args: [
      "--warning-exit-0", "--object-streams=disable", "--", inputPath, outputPath,
    ] };
  }
  if (method === "ghostscript") {
    return { command: "gs", args: [
      "-dSAFER", "-dBATCH", "-dNOPAUSE", "-dQUIET", "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.6", "-dAutoRotatePages=/None",
      `-sOutputFile=${outputPath}`, "-f", inputPath,
    ] };
  }
  throw new Error("Unsupported PDF repair method.");
}

function run(command, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false, stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, HOME: "/tmp", XDG_CONFIG_HOME: "/tmp/.config" },
    });
    let output = "";
    let finished = false;
    const timeout = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS);
    function done(error, code) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (error) reject(new Error("PDF repair command failed or timed out."));
      else resolve({ code, output: output.trim() });
    }
    child.stdout.on("data", chunk => { if (capture) output = (output + chunk.toString("utf8")).slice(-1000); });
    child.on("error", e => done(e));
    child.on("close", (code, signal) => signal || !Number.isInteger(code)
      ? done(new Error("PDF processing stopped.")) : done(null, code));
  });
}

async function signature(file) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 8 || info.size > MAX_OUTPUT_BYTES) {
    throw new Error("Invalid PDF file or size.");
  }
  const handle = await open(file, "r");
  try {
    const header = Buffer.alloc(5);
    const { bytesRead } = await handle.read(header, 0, 5, 0);
    if (bytesRead !== 5 || header.toString("ascii") !== "%PDF-") {
      throw new Error("Invalid PDF signature.");
    }
  } finally { await handle.close(); }
  return info.size;
}

export function validatedRepairRequest(request) {
  if (!request || request.action !== "repair" || typeof request.filename !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/i.test(request.filename) ||
      request.filename.includes("..") || request.filename.length > 100 ||
      request.outputFilename !== request.filename.replace(/\.pdf$/i, "-normalized.pdf")) {
    throw new Error("Invalid PDF repair request.");
  }
  return request;
}

async function pageCount(file) {
  const pages = await run("qpdf", ["--show-npages", file], { capture: true });
  if (pages.code !== 0 || !/^[1-9][0-9]*$/.test(pages.output)) return null;
  const number = Number(pages.output);
  return Number.isSafeInteger(number) && number <= 5000 ? number : null;
}

async function validateCandidate(file, expectedPages) {
  const bytes = await signature(file);
  const check = await run("qpdf", ["--check", file]);
  if (check.code !== 0) throw new Error("PDF candidate failed integrity check.");
  const encrypted = await run("qpdf", ["--is-encrypted", file]);
  if (encrypted.code !== 2) throw new Error("PDF candidate is encrypted or unreadable.");
  const pages = await pageCount(file);
  if (pages === null || (expectedPages !== null && expectedPages !== pages)) {
    throw new Error("PDF candidate page count invalid or changed.");
  }
  return { bytes, pages };
}

export async function repairPdf(request) {
  validatedRepairRequest(request);
  const input = path.join(INPUT_DIR, request.filename);
  const output = path.join(OUTPUT_DIR, request.outputFilename);
  const originalBytes = await signature(input);
  if (originalBytes > MAX_INPUT_BYTES) throw new Error("PDF exceeds 25 MiB.");
  // qpdf may be unable to classify seriously corrupted files; don't reject an
  // unknown state here, but never process a PDF known to be encrypted.
  if ((await run("qpdf", ["--is-encrypted", input])).code === 0) {
    throw new Error("Encrypted PDF is not supported. Use PDF-16 with the known password first.");
  }
  const sourceIntegrityPassed = (await run("qpdf", ["--check", input])).code === 0;
  const sourcePages = await pageCount(input);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await rm(output, { force: true }); // prevent a previous result masquerading as success
  const temp = await mkdtemp(path.join(OUTPUT_DIR, ".repair-"));
  try {
    for (const method of ["qpdf", "ghostscript"]) {
      const candidate = path.join(temp, `${method}.pdf`);
      const { command, args } = pdfRepairCommand(method, input, candidate);
      let success = false;
      try {
        const outcome = await run(command, args);
        if (outcome.code !== 0) continue;
        const checked = await validateCandidate(candidate, sourcePages);
        // Copy and atomic publish only after successful checks.
        const publish = path.join(temp, "publish.pdf");
        await copyFile(candidate, publish);
        await rename(publish, output);
        success = true;
        return {
          output: request.outputFilename,
          bytes: checked.bytes,
          originalBytes,
          pages: checked.pages,
          method,
          sourceIntegrityPassed,
          note: sourceIntegrityPassed
            ? "Normalized PDF; inspect pages, signatures, forms, links and text before use."
            : "Best-effort recovered PDF. Some content may be missing; compare every page with the original.",
        };
      } catch {
        // Invalid/partial attempt: try the next allowlisted method, without
        // exposing PDF internals in logs or API responses.
      } finally {
        if (!success) await rm(candidate, { force: true }).catch(() => {});
      }
    }
    throw new Error("PDF could not be safely repaired or normalized.");
  } catch (error) {
    await rm(output, { force: true }).catch(() => {});
    throw error;
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

import { spawn } from "node:child_process";
import { copyFile, lstat, mkdir, mkdtemp, open, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

const INPUT_DIR = "/work/input";
const OUTPUT_DIR = "/work/output";
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_CANDIDATE_BYTES = 50 * 1024 * 1024;
const GS_TIMEOUT_MS = 75_000;
const QPDF_TIMEOUT_MS = 15_000;

// Conservative presets, high quality first. Lower DPI can visibly blur scans.
export const IMAGE_RESOLUTIONS_DPI = Object.freeze([170, 120, 85]);

// The CLI accepts target KiB (1024 bytes). 50 KiB to 25 MiB for local QA.
export function parseTargetKiB(value) {
  if (typeof value !== "string" || !/^[1-9][0-9]{0,4}$/.test(value)) {
    throw new Error("Target must be an integer from 50 to 25600 KiB.");
  }
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 50 || amount > 25600) {
    throw new Error("Target must be an integer from 50 to 25600 KiB.");
  }
  return amount;
}

// Fixed, allowlisted Ghostscript switches only. Never allow raw user-supplied args.
export function createGhostscriptArgs(inputPath, outputPath, dpi) {
  if (!IMAGE_RESOLUTIONS_DPI.includes(dpi) ||
      path.dirname(inputPath) !== INPUT_DIR ||
      path.extname(inputPath).toLowerCase() !== ".pdf" ||
      !path.relative(OUTPUT_DIR, outputPath) ||
      path.relative(OUTPUT_DIR, outputPath).startsWith("..") ||
      path.isAbsolute(path.relative(OUTPUT_DIR, outputPath)) ||
      path.extname(outputPath).toLowerCase() !== ".pdf") {
    throw new Error("Invalid PDF compression parameters.");
  }
  return [
    "-dSAFER", "-dBATCH", "-dNOPAUSE", "-dQUIET",
    "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.6",
    "-dDetectDuplicateImages=true", "-dAutoRotatePages=/None",
    "-dDownsampleColorImages=true", `-dColorImageResolution=${dpi}`,
    "-dDownsampleGrayImages=true", `-dGrayImageResolution=${dpi}`,
    "-dDownsampleMonoImages=true", "-dMonoImageResolution=300",
    `-sOutputFile=${outputPath}`, "-f", inputPath,
  ];
}

// Choose only a smaller output. Never say 'target reached' based on preset alone.
export function pickSmallerCandidate(best, candidate) {
  if (!Number.isSafeInteger(candidate.bytes) || candidate.bytes <= 0) {
    throw new Error("Invalid candidate size.");
  }
  return candidate.bytes < best.bytes ? candidate : best;
}

function run(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, HOME: "/tmp", XDG_CONFIG_HOME: "/tmp/.config" },
    });
    let stdout = "";
    let finished = false;
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    function settle(error, code) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (error) reject(new Error("PDF worker command failed or timed out."));
      else resolve({ code, stdout: stdout.trim() });
    }
    child.stdout.on("data", chunk => {
      stdout = (stdout + chunk.toString("utf8")).slice(-2048);
    });
    child.on("error", error => settle(error));
    child.on("close", (code, signal) => {
      if (signal || !Number.isInteger(code)) settle(new Error("Process stopped."));
      else settle(null, code);
    });
  });
}

async function qpdf(args) {
  return run("qpdf", args, QPDF_TIMEOUT_MS);
}

async function assertValidPdf(location, expectedPages = null) {
  const s = await lstat(location);
  if (!s.isFile() || s.isSymbolicLink() || s.size < 8 || s.size > MAX_CANDIDATE_BYTES) {
    throw new Error("Invalid PDF file or file size.");
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
  // Do not run rewriting on encrypted PDFs; existing password flow is PDF-16.
  if ((await qpdf(["--is-encrypted", location])).code !== 2) {
    throw new Error("Encrypted or unreadable PDFs are not supported.");
  }
  if ((await qpdf(["--check", location])).code !== 0) {
    throw new Error("PDF integrity check failed.");
  }
  const pagesResult = await qpdf(["--show-npages", location]);
  const raw = pagesResult.stdout;
  if (pagesResult.code !== 0 || !/^[1-9][0-9]*$/.test(raw)) {
    throw new Error("Unable to verify PDF page count.");
  }
  const pages = Number(raw);
  if (!Number.isSafeInteger(pages) || (expectedPages !== null && pages !== expectedPages)) {
    throw new Error("PDF page count changed during compression.");
  }
  return { bytes: s.size, pages };
}

export async function compressPdfToTarget(request, targetKiB) {
  const checkedTarget = parseTargetKiB(String(targetKiB));
  if (!request || request.action !== "compress-target" ||
      typeof request.filename !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/i.test(request.filename) ||
      request.filename.includes("..") ||
      request.outputFilename !== request.filename.replace(/\.pdf$/i, "-target.pdf")) {
    throw new Error("Invalid worker compression request.");
  }
  const inputPath = path.join(INPUT_DIR, request.filename);
  const outputPath = path.join(OUTPUT_DIR, request.outputFilename);
  const inputInfo = await lstat(inputPath);
  if (!inputInfo.isFile() || inputInfo.isSymbolicLink() ||
      inputInfo.size < 8 || inputInfo.size > MAX_INPUT_BYTES) {
    throw new Error("Choose a regular PDF file of at most 25 MiB.");
  }
  const { bytes: originalBytes, pages } = await assertValidPdf(inputPath);
  const targetBytes = checkedTarget * 1024;
  await mkdir(OUTPUT_DIR, { recursive: true });
  const tempDir = await mkdtemp(path.join(OUTPUT_DIR, ".target-"));
  let best = { file: inputPath, bytes: originalBytes, dpi: null };

  try {
    if (originalBytes > targetBytes) {
      for (const dpi of IMAGE_RESOLUTIONS_DPI) {
        const candidate = path.join(tempDir, `candidate-${dpi}.pdf`);
        const { code } = await run(
          "gs", createGhostscriptArgs(inputPath, candidate, dpi), GS_TIMEOUT_MS,
        );
        if (code !== 0) continue;
        try {
          const details = await assertValidPdf(candidate, pages);
          best = pickSmallerCandidate(best, { file: candidate, bytes: details.bytes, dpi });
          if (best.bytes <= targetBytes) break;
        } catch {
          // An invalid Ghostscript result must never be selected for export.
        }
      }
    }

    // Publish only a validated original or candidate, and never overwrite input.
    const publishPath = path.join(tempDir, "publish.pdf");
    await copyFile(best.file, publishPath);
    await rename(publishPath, outputPath);
    const result = await stat(outputPath);
    return {
      output: request.outputFilename,
      originalBytes,
      bytes: result.size,
      targetKiB: checkedTarget,
      targetBytes,
      targetMet: result.size <= targetBytes,
      savedBytes: Math.max(0, originalBytes - result.size),
      pages,
      qualityDpi: best.dpi,
      note: result.size <= targetBytes
        ? "Target reached. Visually inspect pages before sharing."
        : "Target not reached safely; best available result returned. No exact-size guarantee.",
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

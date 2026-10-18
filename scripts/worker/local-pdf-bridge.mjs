// Phase 19B7: additive, opt-in loopback-only development PDF bridge.
// Do not deploy, expose through tunnel, or enable in Vercel.
import { randomBytes } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, open, rm, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  PDF_DEV_PORT,
  MAX_DEV_PDF_BYTES,
  authorizedDevToken,
  buildLocalDockerArgs,
  createPdfFramingDecoder,
  requireDevBridgeSettings,
  validateDevOperation,
  validateDevPassword,
} from "../../lib/worker/localPdfDevRules.mjs";

const { origin: allowedOrigin } = requireDevBridgeSettings();
const accessToken = randomBytes(32).toString("hex");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workspace = path.join(root, "worker", "local-files");
let busy = false;
const MAX_FRAMED_BYTES = MAX_DEV_PDF_BYTES + 2 + 256;
const DOCKER_TIMEOUT_MS = 180_000;
const runFile = promisify(execFile);

function corsHeaders(origin) {
  return origin === allowedOrigin ? {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Expose-Headers": "X-PDF-Original-Bytes, X-PDF-Output-Bytes, X-PDF-Target-Met, X-PDF-Pages, X-PDF-Method, X-PDF-Source-Integrity",
    "Vary": "Origin",
  } : {};
}

function jsonError(res, code, message, origin) {
  if (res.headersSent) { res.destroy(); return; }
  res.writeHead(code, {
    ...corsHeaders(origin),
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify({ error: message }));
}

function dockerProcess(args, password) {
  return new Promise((resolve, reject) => {
    const process = spawn("docker", args, {
      cwd: root,
      windowsHide: true,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;
    const timer = setTimeout(() => process.kill("SIGKILL"), DOCKER_TIMEOUT_MS);
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(new Error("Docker PDF processing failed or timed out."));
      else resolve(output.trim());
    };
    process.stdout.on("data", chunk => {
      output = (output + chunk.toString("utf8")).slice(-8192);
    });
    // Never copy qpdf stderr to HTTP responses or logs: document metadata is private.
    process.stderr.on("data", () => {});
    process.stdin.on("error", () => {});
    process.on("error", () => finish(new Error("Docker unavailable.")));
    process.on("close", (code, signal) => finish(code === 0 && !signal ? null : new Error("Docker command failed.")));
    // Password is never included in process argv. Only private stdin.
    process.stdin.end(password ? `${password}\n` : "");
  });
}

async function validatePdfSignature(location) {
  const handle = await open(location, "r");
  try {
    const header = Buffer.alloc(5);
    const { bytesRead } = await handle.read(header, 0, 5, 0);
    if (bytesRead !== 5 || header.toString("ascii") !== "%PDF-") {
      throw new Error("Uploaded file is not a PDF.");
    }
  } finally { await handle.close(); }
}

async function handlePdf(req, res, config, origin) {
  let jobDir;
  let runningContainer = null;
  let password = "";
  try {
    await mkdir(workspace, { recursive: true });
    jobDir = await mkdtemp(path.join(workspace, "pdf-dev-"));
    const inputDir = path.join(jobDir, "input");
    const outputDir = path.join(jobDir, "output");
    await mkdir(inputDir);
    await mkdir(outputDir);
    const uploadFile = path.join(inputDir, "input.pdf");
    const decoder = createPdfFramingDecoder();
    await pipeline(req, decoder.transform, createWriteStream(uploadFile, { flags: "wx", mode: 0o644 }));
    password = validateDevPassword(config.operation, decoder.password());
    await validatePdfSignature(uploadFile);

    const containerName = `ai-media-pdf-dev-${randomBytes(12).toString("hex")}`;
    runningContainer = containerName;
    const args = buildLocalDockerArgs({
      jobDirectory: jobDir,
      containerName,
      operation: config.operation,
      targetKiB: config.targetKiB,
    });
    const output = await dockerProcess(args, password);
    runningContainer = null; // Docker --rm completed successfully.
    password = "";
    let workerResult;
    try { workerResult = JSON.parse(output); } catch { throw new Error("Worker result was not valid JSON."); }
    const resultPath = path.join(outputDir, config.outputFilename);
    const resultStats = await stat(resultPath);
    if (!resultStats.isFile() || resultStats.size < 20 || resultStats.size > 50 * 1024 * 1024 ||
        workerResult.status !== "COMPLETED" ||
        (config.operation === "compress-target" && workerResult.operation !== "COMPRESS_PDF_TO_TARGET") ||
        (config.operation === "protect" && workerResult.operation !== "PROTECT_PDF") ||
        (config.operation === "unlock" && workerResult.operation !== "UNLOCK_PDF") ||
        (config.operation === "repair" && workerResult.operation !== "REPAIR_NORMALIZE_PDF")) {
      throw new Error("Worker produced an invalid PDF result.");
    }
    await validatePdfSignature(resultPath);
    if (res.destroyed) return;
    res.writeHead(200, {
      ...corsHeaders(origin),
      "Cache-Control": "no-store, private",
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${config.outputFilename}"`,
      "Content-Length": String(resultStats.size),
      "X-Content-Type-Options": "nosniff",
      "X-PDF-Original-Bytes": String(decoder.pdfBytes),
      "X-PDF-Output-Bytes": String(resultStats.size),
      "X-PDF-Target-Met": config.operation === "compress-target" ? String(workerResult.targetMet === true) : "",
      "X-PDF-Pages": Number.isInteger(workerResult.pages) ? String(workerResult.pages) : "",
      "X-PDF-Method": config.operation === "repair" && ["qpdf", "ghostscript"].includes(workerResult.method) ? workerResult.method : "",
      "X-PDF-Source-Integrity": config.operation === "repair" ? String(workerResult.sourceIntegrityPassed === true) : "",
    });
    await pipeline(createReadStream(resultPath), res);
  } catch (error) {
    if (res.destroyed) return;
    // Never include Docker/qpdf errors or user password in browser responses.
    const safeInputError = ["Uploaded file is not a PDF."].includes(error?.message);
    jsonError(res, safeInputError ? 400 : 422,
      safeInputError ? error.message : "Local PDF processing failed. Check file format, known password, Docker and worker health.",
      origin);
  } finally {
    password = "";
    if (runningContainer) {
      // A terminated Docker CLI may leave its container running. Remove only our random exact name.
      await runFile("docker", ["rm", "-f", runningContainer], {
        cwd: root, windowsHide: true, timeout: 15_000, maxBuffer: 2048,
      }).catch(() => {});
    }
    if (jobDir) await rm(jobDir, { force: true, recursive: true }).catch(() => {
      console.warn("One temporary PDF workspace could not be removed; inspect worker/local-files locally.");
    });
  }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (req.headers.host !== `127.0.0.1:${PDF_DEV_PORT}` || origin !== allowedOrigin) {
    jsonError(res, 403, "Local-only origin required.", origin);
    return;
  }
  let parsed;
  try { parsed = new URL(req.url, `http://127.0.0.1:${PDF_DEV_PORT}`); }
  catch { jsonError(res, 400, "Invalid request.", origin); return; }
  if (parsed.pathname !== "/process") {
    jsonError(res, 404, "Not found.", origin);
    return;
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }
  if (req.method !== "POST") {
    jsonError(res, 405, "Method not allowed.", origin);
    return;
  }
  if (!authorizedDevToken(req.headers.authorization, accessToken)) {
    jsonError(res, 401, "Invalid local worker token.", origin);
    return;
  }
  if (req.headers["content-type"] !== "application/octet-stream") {
    jsonError(res, 415, "Expected binary PDF request.", origin);
    return;
  }
  const size = Number(req.headers["content-length"]);
  if (!Number.isSafeInteger(size) || size < 10 || size > MAX_FRAMED_BYTES ||
      !/^\d+$/.test(req.headers["content-length"] ?? "")) {
    jsonError(res, 413, "File is missing or exceeds the 25 MiB size limit.", origin);
    return;
  }
  if (busy) {
    jsonError(res, 409, "Local PDF worker busy; wait for the previous file.", origin);
    return;
  }
  let config;
  try {
    config = validateDevOperation(parsed.searchParams.get("operation"), parsed.searchParams.get("targetKiB"));
    const allowed = new Set(config.operation === "compress-target" ? ["operation", "targetKiB"] : ["operation"]);
    for (const key of parsed.searchParams.keys()) {
      if (!allowed.has(key)) throw new Error("Unexpected query setting.");
    }
  } catch (error) {
    jsonError(res, 400, error.message, origin);
    return;
  }
  busy = true;
  try { await handlePdf(req, res, config, origin); }
  finally { busy = false; }
});

server.requestTimeout = 180_000;
server.headersTimeout = 15_000;
server.listen(PDF_DEV_PORT, "127.0.0.1", () => {
  console.log("Local PDF-12/15/16/30 bridge: http://127.0.0.1:" + PDF_DEV_PORT);
  console.log("Allowed browser origin: " + allowedOrigin);
  console.log("LOCAL BRIDGE TOKEN (paste into local dev page, never share): " + accessToken);
  console.log("Docker Desktop must be running. Ctrl+C to stop. DO NOT deploy publicly.");
});

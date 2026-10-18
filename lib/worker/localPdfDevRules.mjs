// Phase 19B7: loopback-only development bridge rules. NOT production security policy.
import { timingSafeEqual } from "node:crypto";
import { Transform } from "node:stream";

export const PDF_DEV_PORT = 4847;
export const MAX_DEV_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_SECRET_BYTES = 256;
export const PDF_DEV_OPERATIONS = Object.freeze(["compress-target", "protect", "unlock", "repair"]);

export function requireDevBridgeSettings(env = process.env) {
  if (env.NODE_ENV === "production" || env.VERCEL ||
      env.LOCAL_PDF_DEV_BRIDGE_ENABLED !== "true") {
    throw new Error("Local PDF bridge disabled. Set LOCAL_PDF_DEV_BRIDGE_ENABLED=true in local .env.local only.");
  }
  const origin = env.LOCAL_PDF_DEV_ORIGIN || "http://localhost:3000";
  if (!["http://localhost:3000", "http://127.0.0.1:3000"].includes(origin)) {
    throw new Error("Local PDF bridge origin must be http://localhost:3000 or http://127.0.0.1:3000.");
  }
  return { origin };
}

export function authorizedDevToken(header, secret) {
  if (typeof header !== "string" || !/^Bearer [a-f0-9]{64}$/.test(header) ||
      typeof secret !== "string" || !/^[a-f0-9]{64}$/.test(secret)) return false;
  const actual = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return timingSafeEqual(actual, expected);
}

export function validateDevOperation(operation, target) {
  if (!PDF_DEV_OPERATIONS.includes(operation)) {
    throw new Error("Unsupported local PDF operation.");
  }
  if (operation === "compress-target") {
    if (typeof target !== "string" || !/^[1-9][0-9]{0,4}$/.test(target)) {
      throw new Error("Target must be an integer 50–25600 KiB.");
    }
    const number = Number(target);
    if (!Number.isSafeInteger(number) || number < 50 || number > 25600) {
      throw new Error("Target must be an integer 50–25600 KiB.");
    }
    return { operation, targetKiB: number, outputFilename: "input-target.pdf" };
  }
  if (target !== null && target !== undefined && target !== "") {
    throw new Error("A target is only supported for PDF compression.");
  }
  return {
    operation,
    targetKiB: null,
    outputFilename: operation === "protect" ? "input-protected.pdf"
      : operation === "unlock" ? "input-unlocked.pdf" : "input-normalized.pdf",
  };
}

export function validateDevPassword(operation, value) {
  if (operation === "compress-target" || operation === "repair") {
    if (value !== "") throw new Error("This PDF operation must not receive a password.");
    return value;
  }
  if (operation === "protect") {
    if (typeof value !== "string" || !/^[A-Za-z0-9][\x21-\x7E]{11,63}$/.test(value)) {
      throw new Error("New password must be 12–64 printable ASCII characters and start with a letter or number.");
    }
    return value;
  }
  if (operation === "unlock") {
    if (typeof value !== "string" || value.length < 1 || value.length > 128 ||
        Buffer.byteLength(value, "utf8") > MAX_SECRET_BYTES || /[\x00-\x1f\x7f]/.test(value)) {
      throw new Error("Enter the known PDF password (1–128 characters, no control characters).");
    }
    return value;
  }
  throw new Error("Unsupported local PDF operation.");
}

// Wire framing: 2-byte unsigned BE password length, UTF-8 password, raw PDF bytes.
// This avoids putting passwords in URLs, HTTP headers, process argv, or a database.
// A streaming decoder prevents buffering the PDF in application memory.
export function createPdfFramingDecoder(maxFileBytes = MAX_DEV_PDF_BYTES) {
  let lengthHeader = Buffer.alloc(2);
  let lengthRead = 0;
  let passwordLength = null;
  let passwordBuffer = null;
  let passwordRead = 0;
  let pdfBytes = 0;
  const transform = new Transform({
    transform(chunk, _enc, callback) {
      try {
        if (!Buffer.isBuffer(chunk)) chunk = Buffer.from(chunk);
        let index = 0;
        if (passwordLength === null) {
          const n = Math.min(2 - lengthRead, chunk.length);
          chunk.copy(lengthHeader, lengthRead, 0, n);
          lengthRead += n;
          index += n;
          if (lengthRead === 2) {
            passwordLength = lengthHeader.readUInt16BE(0);
            if (passwordLength > MAX_SECRET_BYTES) throw new Error("Password frame exceeds allowed size.");
            passwordBuffer = Buffer.alloc(passwordLength);
          }
        }
        if (passwordLength !== null && passwordRead < passwordLength && index < chunk.length) {
          const n = Math.min(passwordLength - passwordRead, chunk.length - index);
          chunk.copy(passwordBuffer, passwordRead, index, index + n);
          index += n;
          passwordRead += n;
        }
        if (index < chunk.length) {
          const pdf = chunk.subarray(index);
          pdfBytes += pdf.length;
          if (pdfBytes > maxFileBytes) throw new Error("PDF exceeds 25 MiB limit.");
          callback(null, pdf);
        } else callback();
      } catch (error) { callback(error); }
    },
    flush(callback) {
      if (passwordLength === null || passwordRead !== passwordLength || pdfBytes < 8) {
        callback(new Error("Incomplete or invalid PDF request."));
      } else callback();
    },
  });
  return {
    transform,
    password() {
      if (passwordLength === null || passwordRead !== passwordLength) throw new Error("Incomplete password frame.");
      const value = new TextDecoder("utf-8", { fatal: true }).decode(passwordBuffer);
      passwordBuffer.fill(0);
      return value;
    },
    get pdfBytes() { return pdfBytes; },
  };
}

export function buildLocalDockerArgs({ jobDirectory, operation, targetKiB = null, containerName }) {
  if (typeof jobDirectory !== "string" || !jobDirectory ||
      typeof containerName !== "string" || !/^ai-media-pdf-dev-[0-9a-f]{24}$/.test(containerName)) {
    throw new Error("Invalid local Docker job parameters.");
  }
  const cfg = validateDevOperation(operation, targetKiB === null ? null : String(targetKiB));
  const args = [
    "run", "--rm", "-i", "--name", containerName,
    "--network", "none", "--read-only", "--user", "10001:10001",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
    "--memory", "1g", "--cpus", "1.0", "--pids-limit", "128",
    "--tmpfs", "/tmp:rw,nosuid,nodev,size=256m,uid=10001,gid=10001",
    "--mount", `type=bind,source=${jobDirectory},target=/work`,
    "ai-media-document-worker:latest", cfg.operation, "input.pdf",
  ];
  if (cfg.targetKiB !== null) args.push(String(cfg.targetKiB));
  return args;
}

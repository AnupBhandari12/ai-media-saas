import { randomUUID } from "node:crypto";

import {
  MAX_WORKER_DOCUMENT_BYTES,
  isAllowedDocumentType,
} from "./jobConfig.js";

import { matchesOfficeSignature } from "./uploadRules.js";

const ID_PATTERN = /^c[a-z0-9]{10,60}$/;
const UUID_PATTERN = "[0-9a-f-]{36}";

function isSafeJobId(id) {
  return typeof id === "string" && ID_PATTERN.test(id);
}

export function validateReadyJob(job) {
  if (!job || !isSafeJobId(job.id) || job.status !== "PENDING") {
    throw new Error("Job is not eligible for execution.");
  }
  const refs = job.inputRefs;
  if (!refs || typeof refs !== "object" || Array.isArray(refs) ||
      refs.stage !== "READY_FOR_PROCESSING" ||
      typeof refs.filename !== "string" ||
      !isAllowedDocumentType(job.toolId, refs.filename)) {
    throw new Error("Job has no verified Office input.");
  }
  const extension = refs.extension;
  if (!/^(\.doc|\.docx|\.ppt|\.pptx|\.xls|\.xlsx)$/.test(extension ?? "") ||
      !refs.filename.toLowerCase().endsWith(extension) ||
      !Number.isInteger(refs.expectedBytes) ||
      refs.expectedBytes < 1 || refs.expectedBytes > MAX_WORKER_DOCUMENT_BYTES ||
      refs.verifiedBytes !== refs.expectedBytes) {
    throw new Error("Verified input metadata is invalid.");
  }
  const expectedKey = new RegExp(`^verified/${job.id}/${UUID_PATTERN}\\${extension}$`);
  if (typeof refs.verifiedKey !== "string" || !expectedKey.test(refs.verifiedKey)) {
    throw new Error("Invalid private verified object reference.");
  }
  return {
    extension,
    verifiedKey: refs.verifiedKey,
    bytes: refs.verifiedBytes,
    inputFilename: `${job.id}${extension}`,
    outputFilename: `${job.id}.pdf`,
  };
}

export function requireOfficeSignature(extension, bytes) {
  if (!matchesOfficeSignature(extension, bytes.subarray(0, 8))) {
    throw new Error("Stored Office document signature does not match its extension.");
  }
}

export function makeResultKey(jobId, nonce = randomUUID()) {
  if (!isSafeJobId(jobId) || !/^[0-9a-f-]{36}$/.test(nonce)) {
    throw new Error("Invalid output key parameters.");
  }
  return `results/${jobId}/${nonce}.pdf`;
}

// Unlike the Phase 19A shared compose volume, each job gets its OWN /work mount.
// This prevents one user's document from reading another job's input/output.
export function dockerConversionArguments({ jobId, hostDirectory, inputFilename }) {
  if (!isSafeJobId(jobId) || typeof hostDirectory !== "string" || !hostDirectory ||
      inputFilename !== `${jobId}.doc` && inputFilename !== `${jobId}.docx` &&
      inputFilename !== `${jobId}.ppt` && inputFilename !== `${jobId}.pptx` &&
      inputFilename !== `${jobId}.xls` && inputFilename !== `${jobId}.xlsx`) {
    throw new Error("Unsafe Docker conversion settings.");
  }
  const name = `ai-media-${jobId}`;
  return [
    "run", "--rm", "--name", name,
    "--network", "none", "--read-only", "--user", "10001:10001",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
    "--memory", "1g", "--cpus", "1.0", "--pids-limit", "128",
    "--tmpfs", "/tmp:rw,nosuid,nodev,size=256m,uid=10001,gid=10001",
    "--mount", `type=bind,source=${hostDirectory},target=/work`,
    "ai-media-document-worker:latest", "convert", inputFilename,
  ];
}

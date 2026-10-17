// Client-independent rules: used by the API and safe to unit-test.
export const DOCUMENT_MIME = Object.freeze({
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
});

export const PRESIGNED_UPLOAD_SECONDS = 300;

export function getDocumentMime(extension) {
  return DOCUMENT_MIME[extension] ?? null;
}

export function makeUploadKey(jobId, extension, nonce) {
  if (!/^c[a-z0-9]{10,60}$/.test(jobId)) {
    throw new Error("Invalid job ID.");
  }
  if (!getDocumentMime(extension) || !/^[0-9a-f-]{36}$/.test(nonce)) {
    throw new Error("Invalid document upload settings.");
  }
  return `uploads/${jobId}/${nonce}${extension}`;
}

export function makeVerifiedKey(jobId, extension, nonce) {
  return makeUploadKey(jobId, extension, nonce).replace(/^uploads\//, "verified/");
}

export function matchesOfficeSignature(extension, bytes) {
  if (!(bytes instanceof Uint8Array)) return false;

  const zip = [0x50, 0x4b, 0x03, 0x04];
  const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

  const magic = [".docx", ".pptx", ".xlsx"].includes(extension)
    ? zip
    : [".doc", ".ppt", ".xls"].includes(extension)
      ? ole
      : null;

  return Boolean(magic && magic.every((byte, i) => bytes[i] === byte));
}

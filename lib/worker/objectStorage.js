// Server-side only: do not import this module into a client component.
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { PRESIGNED_UPLOAD_SECONDS } from "./uploadRules.js";

let client;
let bucket;

function configured() {
  const {
    B2_ENDPOINT,
    B2_REGION,
    B2_BUCKET_NAME,
    B2_KEY_ID,
    B2_APPLICATION_KEY,
  } = process.env;

  if (
    ![
      B2_ENDPOINT,
      B2_REGION,
      B2_BUCKET_NAME,
      B2_KEY_ID,
      B2_APPLICATION_KEY,
    ].every(Boolean)
  ) {
    throw new Error("Private document storage is not configured.");
  }

  // The endpoint is server configuration, not a value supplied by the user.
  const endpoint = new URL(B2_ENDPOINT);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.port ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.hostname !== `s3.${B2_REGION}.backblazeb2.com`
  ) {
    throw new Error("Invalid Backblaze S3 endpoint configuration.");
  }

  return {
    endpoint: endpoint.origin,
    region: B2_REGION,
    bucketName: B2_BUCKET_NAME,
    accessKey: B2_KEY_ID,
    secret: B2_APPLICATION_KEY,
  };
}

function getStorage() {
  const config = configured();

  if (!client || bucket !== config.bucketName) {
    client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secret,
      },
      forcePathStyle: true,
      // Avoid requiring newer AWS-specific checksum headers from B2.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    bucket = config.bucketName;
  }

  return { client, bucket };
}

export async function createPresignedUpload({ key, contentType }) {
  const { client: s3, bucket: Bucket } = getStorage();
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: PRESIGNED_UPLOAD_SECONDS },
  );

  return { url, expiresIn: PRESIGNED_UPLOAD_SECONDS };
}

async function inspectObject(key) {
  const { client: s3, bucket: Bucket } = getStorage();
  const head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
  const part = await s3.send(
    new GetObjectCommand({ Bucket, Key: key, Range: "bytes=0-7" }),
  );

  if (!part.ContentRange || Number(part.ContentLength) > 8) {
    part.Body?.destroy?.();
    throw new Error("Storage did not return a bounded header range.");
  }

  const signature = new Uint8Array(await part.Body.transformToByteArray());
  return {
    bytes: Number(head.ContentLength),
    contentType: head.ContentType ?? "",
    signature,
  };
}

// The verified copy cannot be overwritten using the browser's signed PUT URL.
export async function freezeVerifiedObject(sourceKey, verifiedKey) {
  const { client: s3, bucket: Bucket } = getStorage();
  const copySource = `${Bucket}/${sourceKey.split("/").map(encodeURIComponent).join("/")}`;

  await s3.send(
    new CopyObjectCommand({
      Bucket,
      Key: verifiedKey,
      CopySource: copySource,
    }),
  );
}

export const inspectUploadedObject = inspectObject;
export const inspectVerifiedObject = inspectObject;

export async function deleteStoredObject(key) {
  if (!key) return;
  const { client: s3, bucket: Bucket } = getStorage();
  await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
}


// Phase 19B3 — used only by the local trusted worker and protected download API.
// Never return private object keys to browser clients.
export async function downloadVerifiedDocument({ key, expectedBytes }) {
  if (!/^verified\/c[a-z0-9]{10,60}\/[0-9a-f-]{36}\.(doc|docx|ppt|pptx|xls|xlsx)$/.test(key)) {
    throw new Error("Invalid verified document key.");
  }
  if (!Number.isInteger(expectedBytes) || expectedBytes < 1 || expectedBytes > 25 * 1024 * 1024) {
    throw new Error("Invalid document size.");
  }

  const { client: s3, bucket: Bucket } = getStorage();
  const result = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  if (Number(result.ContentLength) !== expectedBytes || !result.Body) {
    result.Body?.destroy?.();
    throw new Error("Stored document size changed.");
  }
  const bytes = Buffer.from(await result.Body.transformToByteArray());
  if (bytes.length !== expectedBytes) {
    throw new Error("Stored document was incomplete.");
  }
  return bytes;
}

export async function savePrivateWorkerPdf({ key, bytes }) {
  if (!/^results\/c[a-z0-9]{10,60}\/[0-9a-f-]{36}\.pdf$/.test(key)) {
    throw new Error("Invalid output storage key.");
  }
  if (!(bytes instanceof Uint8Array) || bytes.length < 5 ||
      bytes.length > 50 * 1024 * 1024 ||
      Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new Error("Output is not a valid-sized PDF.");
  }
  const { client: s3, bucket: Bucket } = getStorage();
  await s3.send(new PutObjectCommand({
    Bucket, Key: key, Body: bytes, ContentType: "application/pdf",
  }));
  const stored = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
  if (Number(stored.ContentLength) !== bytes.length) {
    throw new Error("Private PDF upload could not be verified.");
  }
  return { bytes: bytes.length };
}

export async function createPresignedDownload({ key, filename }) {
  if (!/^results\/c[a-z0-9]{10,60}\/[0-9a-f-]{36}\.pdf$/.test(key)) {
    throw new Error("Invalid output storage key.");
  }
  const safeFilename = typeof filename === "string" &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}\.pdf$/.test(filename)
      ? filename : "converted.pdf";
  const { client: s3, bucket: Bucket } = getStorage();
  const expiresIn = 90;
  const url = await getSignedUrl(s3, new GetObjectCommand({
    Bucket, Key: key,
    ResponseContentDisposition: `attachment; filename="${safeFilename}"`,
  }), { expiresIn });
  return { url, expiresIn };
}

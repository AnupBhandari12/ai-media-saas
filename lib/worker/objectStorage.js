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

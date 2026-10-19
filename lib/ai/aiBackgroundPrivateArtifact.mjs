/**
 * Phase 21 / Commit 10J — review-only background artifact storage boundary.
 * Pure preparation and owner-bound download decision. Neither function talks to
 * Neon, Backblaze B2, remove.bg, the web, or any HTTP route. NEVER pass client
 * JSON as `verifiedOutput`, `preparedSource` or server DB `asset`/`job`.
 *
 * 10I still reports BLOCKED. A plan is NOT authorization to store or publish.
 */
import { createHash, randomUUID } from 'node:crypto';

export const BG_ARTIFACT_REVIEW_ONLY = true;
export const BG_ARTIFACT_STORAGE_UPLOAD_ENABLED = false;
export const BG_ARTIFACT_DOWNLOAD_ROUTE_ENABLED = false;
export const BG_ARTIFACT_PUBLIC_URLS_ENABLED = false;
export const BG_ARTIFACT_PAID_DISPATCH_ENABLED = false;
export const BG_ARTIFACT_PRIVATE_PREFIX = 'ai/background/private/';
export const BG_ARTIFACT_MAX_BYTES = 20 * 1024 * 1024;
export const BG_ARTIFACT_MAX_PIXELS = 8_000_000;

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA = /^[a-f0-9]{64}$/;
const STORAGE_KEY = /^ai\/background\/private\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/([a-f0-9]{64})\.png$/;
const signature = [137, 80, 78, 71, 13, 10, 26, 10];
const sha256 = b => createHash('sha256').update(b).digest('hex');
const ownerValid = s => typeof s === 'string' && s.length >= 3 && s.length <= 200 &&
  s.trim() === s && !/[\u0000-\u001f\u007f]/.test(s);
const dateValid = d => d instanceof Date && Number.isFinite(d.getTime());
const hasPngSignature = b => b instanceof Uint8Array && b.length >= 57 &&
  signature.every((v, i) => b[i] === v);
const sizeValid = n => Number.isSafeInteger(n) && n >= 57 && n <= BG_ARTIFACT_MAX_BYTES;
const dimensionsValid = (w, h) => Number.isSafeInteger(w) && Number.isSafeInteger(h) &&
  w >= 1 && h >= 1 && w <= 8000 && h <= 8000 && w * h <= BG_ARTIFACT_MAX_PIXELS;
const deny = reason => Object.freeze({ status: 'BLOCKED', reason, authorized: false,
  providerCalled: false, uploaded: false, databaseWritten: false, publicUrl: null });

/**
 * Pure storage *plan*, not an upload. Inputs MUST originate from trusted 10C/10E
 * server call chain and are checked again. Even if a caller fabricates an object
 * that passes shape checks this module never performs any side effect.
 */
export function planBackgroundPrivateArtifact({ authenticatedOwnerId, requestId,
  preparedSource, verifiedOutput, createOpaqueId = randomUUID, now = new Date(),
} = {}) {
  if (!ownerValid(authenticatedOwnerId) || !UUID.test(requestId ?? ''))
    return deny('IDENTITY_INVALID');
  if (!dateValid(now)) return deny('CLOCK_INVALID');
  if (!preparedSource || typeof preparedSource !== 'object' ||
      preparedSource.ownerId !== authenticatedOwnerId ||
      preparedSource.serverDecoded !== true || preparedSource.preparation !== 'FULL_RGBA_DECODED' ||
      !(preparedSource.imageBytes instanceof Uint8Array) ||
      !SHA.test(preparedSource.imageSha256 ?? '') ||
      sha256(preparedSource.imageBytes) !== preparedSource.imageSha256)
    return deny('SOURCE_NOT_VERIFIED');
  if (!verifiedOutput || typeof verifiedOutput !== 'object' ||
      verifiedOutput.status !== 'VERIFIED' || verifiedOutput.provider !== 'remove.bg' ||
      verifiedOutput.mimeType !== 'image/png' ||
      verifiedOutput.sanitizedMetadata !== true || verifiedOutput.stored !== false ||
      verifiedOutput.providerCreditUnits !== 1 ||
      verifiedOutput.originalSha256 !== preparedSource.imageSha256 ||
      !dimensionsValid(verifiedOutput.width, verifiedOutput.height) ||
      !(verifiedOutput.outputBytes instanceof Uint8Array) ||
      !sizeValid(verifiedOutput.outputBytes.byteLength) ||
      !hasPngSignature(verifiedOutput.outputBytes) ||
      !SHA.test(verifiedOutput.outputSha256 ?? '') ||
      sha256(verifiedOutput.outputBytes) !== verifiedOutput.outputSha256)
    return deny('OUTPUT_NOT_VERIFIED');
  if (typeof createOpaqueId !== 'function') return deny('OPAQUE_ID_GENERATOR_UNAVAILABLE');
  let opaqueId;
  try { opaqueId = createOpaqueId(); } catch { return deny('OPAQUE_ID_GENERATOR_FAILED'); }
  if (typeof opaqueId !== 'string' || !UUID_V4.test(opaqueId))
    return deny('INVALID_OPAQUE_ID');
  // Opaque, non-owner-revealing namespace. Never use the source filename or URL.
  const outputBytes = new Uint8Array(verifiedOutput.outputBytes);
  const outputSha256 = sha256(outputBytes);
  const objectKey = `${BG_ARTIFACT_PRIVATE_PREFIX}${opaqueId.toLowerCase()}/${outputSha256}.png`;
  return Object.freeze({
    status: 'PLAN_ONLY_NEVER_UPLOAD', authorized: false,
    storageProvider: 'B2_PRIVATE', visibility: 'private',
    ownerId: authenticatedOwnerId, requestId,
    objectKey, mimeType: 'image/png', fileName: 'background-removed.png',
    outputBytes, outputSha256, originalSha256: preparedSource.imageSha256,
    bytes: outputBytes.byteLength, width: verifiedOutput.width, height: verifiedOutput.height,
    contentDisposition: 'attachment; filename="background-removed.png"',
    cacheControl: 'private, no-store', createdAt: now.toISOString(),
    verified: true, stored: false, providerCalled: false, uploaded: false,
    databaseWritten: false, ledgerReconciled: false, dispatchAllowed: false,
    publicUrl: null,
  });
}

/**
 * Server-only offline *eligibility* check against future durable DB records.
 * Not a download service. It never issues a signed URL, retrieves bytes or
 * unlocks the disabled public route. `asset` and `job` MUST come from DB,
 * NEVER from an HTTP body. Missing reconciliation always denies.
 */
export function reviewBackgroundPrivateDownload({ authenticatedOwnerId, asset,
  job, now = new Date(),
} = {}) {
  if (!ownerValid(authenticatedOwnerId) || !dateValid(now)) return deny('IDENTITY_OR_CLOCK_INVALID');
  if (!asset || !job || typeof asset !== 'object' || typeof job !== 'object' ||
      asset.ownerId !== authenticatedOwnerId || job.ownerId !== authenticatedOwnerId ||
      asset.jobId !== job.id || typeof job.id !== 'string' || !job.id ||
      asset.status !== 'STORED_VERIFIED' || job.status !== 'COMPLETED' ||
      job.ledgerReconciled !== true || job.providerOutcomeConfirmed !== true ||
      asset.storageProvider !== 'B2_PRIVATE' || asset.mimeType !== 'image/png' ||
      asset.secureUrl != null || !SHA.test(asset.outputSha256 ?? '') ||
      !SHA.test(job.outputSha256 ?? '') || asset.outputSha256 !== job.outputSha256 ||
      !sizeValid(asset.bytes) || !dimensionsValid(asset.width, asset.height) ||
      !dateValid(asset.expiresAt) || asset.expiresAt.getTime() <= now.getTime() ||
      typeof asset.storageKey !== 'string') return deny('NOT_DURABLY_AUTHORIZED');
  const match = STORAGE_KEY.exec(asset.storageKey);
  if (!match || match[2] !== asset.outputSha256) return deny('STORAGE_REFERENCE_INVALID');
  // Route still intentionally OFF: only server code may later use this intent.
  return Object.freeze({
    status: 'SERVER_REVIEW_ELIGIBLE_ROUTE_DISABLED', authorized: false,
    eligibleForFutureReview: true,
    serverOnlyStorageKey: asset.storageKey,
    mimeType: 'image/png', fileName: 'background-removed.png',
    cacheControl: 'private, no-store',
    providerCalled: false, uploaded: false, databaseWritten: false,
    publicUrl: null, signedUrl: null,
  });
}

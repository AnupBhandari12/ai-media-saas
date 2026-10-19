/**
 * Phase21 / Stage07 - isolated, server-only Backblaze B2 private PNG adapter.
 * It is NOT imported by an HTTP route; never put this module in client code.
 * Only a later authenticated DB-bound pipeline may supply `reservation`,
 * `verifiedOutput`, and `asset`. Never use client JSON for these arguments.
 *
 * NO new S3 bucket; uses the existing private B2 settings and SDK.
 * No provider calls, DB mutations, automatic retry or signed/public URLs.
 */
import { createHash } from 'node:crypto';

export const BG_B2_ROUTE_CONNECTED = false;
export const BG_B2_PAID_DISPATCH_CONNECTED = false;
export const BG_B2_DEFAULT_WRITE_ENABLED = false;
export const BG_B2_DEFAULT_READ_ENABLED = false;
export const BG_B2_MAX_BYTES = 20 * 1024 * 1024;
export const BG_B2_PRIVATE_PREFIX = 'ai/background/private/';
const KEY = /^ai\/background\/private\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/([a-f0-9]{64})\.png$/;
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PNG_SIGNATURE = [137,80,78,71,13,10,26,10];
const DIGEST = bytes => createHash('sha256').update(bytes).digest('hex');
const safeOwner = id => typeof id === 'string' && id.length >= 3 && id.length <= 200 && id.trim() === id && !/[\x00-\x1f\x7f]/.test(id);
const isPng = bytes => bytes instanceof Uint8Array && bytes.length >= 57 && PNG_SIGNATURE.every((n,i) => bytes[i] === n);
const safeSize = n => Number.isSafeInteger(n) && n >= 57 && n <= BG_B2_MAX_BYTES;
const safeDimensions = (w,h) => Number.isSafeInteger(w) && Number.isSafeInteger(h) && w > 0 && h > 0 && w <= 8000 && h <= 8000 && w*h <= 8_000_000;
const validKey = (key,sha) => typeof key === 'string' && KEY.test(key) && KEY.exec(key)[2] === sha;
const deny = reason => Object.freeze({ status:'BLOCKED', reason, uploaded:false, downloaded:false, publicUrl:null, retryAllowed:false });
const uncertain = reason => Object.freeze({ status:'UNKNOWN_NO_AUTO_RETRY', reason, uploaded:false, downloaded:false, publicUrl:null, retryAllowed:false });

function validateUpload(p, v, r) {
  if (!p || !v || !r || typeof p !== 'object' || typeof v !== 'object' || typeof r !== 'object') return false;
  if (!safeOwner(p.ownerId) || !UUID.test(p.requestId ?? '') ||
      p.status !== 'PLAN_ONLY_NEVER_UPLOAD' || p.storageProvider !== 'B2_PRIVATE' ||
      p.visibility !== 'private' || p.verified !== true || p.stored !== false ||
      p.dispatchAllowed !== false || p.uploaded !== false || p.publicUrl !== null ||
      p.mimeType !== 'image/png' || !safeDimensions(p.width,p.height) ||
      !safeSize(p.bytes) || !SHA.test(p.outputSha256 ?? '') ||
      !SHA.test(p.originalSha256 ?? '') || !validKey(p.objectKey,p.outputSha256) ||
      !(p.outputBytes instanceof Uint8Array) || p.outputBytes.length !== p.bytes ||
      !isPng(p.outputBytes) || DIGEST(p.outputBytes) !== p.outputSha256) return false;
  if (v.status !== 'VERIFIED' || v.provider !== 'remove.bg' || v.mimeType !== 'image/png' ||
      v.sanitizedMetadata !== true || v.stored !== false || v.providerCreditUnits !== 1 ||
      !Number.isInteger(v.transparentPixels) || v.transparentPixels <= 0 ||
      v.outputSha256 !== p.outputSha256 || v.originalSha256 !== p.originalSha256 ||
      v.width !== p.width || v.height !== p.height || !isPng(v.outputBytes) ||
      v.outputBytes.length !== p.bytes || DIGEST(v.outputBytes) !== p.outputSha256) return false;
  if (r.ownerId !== p.ownerId || r.requestId !== p.requestId ||
      r.imageSha256 !== p.originalSha256 || r.status !== 'PROCESSING' ||
      r.creditsReserved !== 1 || !(r.dispatchedAt instanceof Date) ||
      !Number.isFinite(r.dispatchedAt.getTime())) return false;
  return true;
}

/**
 * Private B2 PUT + independent HEAD + GET SHA256 integrity check.
 * Call only after trusted server-side Sharp validation AND DB reservation.
 * Caller must later save a durable BgStoredAsset record; success here is NOT
 * a ledger receipt nor user-visible completion. Failure is UNKNOWN, no retry.
 */
export async function uploadRealBgPrivatePng({ plan, verifiedOutput, reservation,
  storage, env = process.env } = {}) {
  if (env?.AI_BG_PRIVATE_B2_WRITE_ENABLED !== 'true' ||
      env?.AI_BG_PRIVATE_B2_OPERATOR_APPROVED !== 'true') return deny('PRIVATE_STORAGE_WRITE_DISABLED');
  if (!validateUpload(plan,verifiedOutput,reservation)) return deny('INVALID_VERIFIED_STORAGE_BINDING');
  if (!storage || typeof storage.put !== 'function' || typeof storage.head !== 'function' ||
      typeof storage.get !== 'function') return deny('PRIVATE_B2_ADAPTER_MISSING');
  const { objectKey: key, outputSha256: sha, originalSha256: originalSha, bytes: length } = plan;
  const bytes = Buffer.from(plan.outputBytes); // detached copy before first await
  try {
    await storage.put({key, bytes, sha, originalSha});
    const head = await storage.head({key});
    if (Number(head?.bytes) !== length || head?.mimeType !== 'image/png' ||
        head?.sha !== sha || head?.originalSha !== originalSha)
      return uncertain('B2_POST_WRITE_METADATA_MISMATCH');
    const fetched = await storage.get({key, maximumBytes:BG_B2_MAX_BYTES, expectedBytes:length});
    if (!(fetched instanceof Uint8Array) || fetched.length !== length ||
        !isPng(fetched) || DIGEST(fetched) !== sha)
      return uncertain('B2_POST_WRITE_HASH_MISMATCH');
    return Object.freeze({status:'STORED_VERIFIED_NEEDS_DB', uploaded:true, downloaded:false,
      storageKey:key, outputSha256:sha, originalSha256:originalSha, bytes:length,
      width:plan.width, height:plan.height, requestId:plan.requestId,
      ownerId:plan.ownerId, publicUrl:null, retryAllowed:false, ledgerReconciled:false});
  } catch { return uncertain('B2_WRITE_OR_VERIFY_UNCERTAIN'); }
}

/**
 * Owner-and-ledger-verified *server* read. Stage08 MUST fetch all three records
 * from Neon using the authenticated Clerk ID; NEVER accept HTTP JSON copies.
 * Returns bytes (not a public or presigned URL) after storage hash verification.
 */
export async function readRealBgPrivatePng({ ownerId, asset, reservation,
  ledgerProof, storage, now=new Date(), env=process.env } = {}) {
  if (env?.AI_BG_PRIVATE_B2_READ_ENABLED !== 'true') return deny('PRIVATE_STORAGE_READ_DISABLED');
  if (!safeOwner(ownerId) || !(now instanceof Date) || !Number.isFinite(now.getTime()) ||
      !asset || !reservation || !ledgerProof ||
      asset.ownerId !== ownerId || reservation.ownerId !== ownerId || ledgerProof.ownerId !== ownerId ||
      asset.requestId !== reservation.requestId || asset.requestId !== ledgerProof.requestId ||
      !UUID.test(asset.requestId ?? '') || asset.status !== 'STORED_VERIFIED' ||
      reservation.status !== 'COMPLETED' || reservation.creditsReserved !== 1 ||
      !(reservation.dispatchedAt instanceof Date) || !Number.isFinite(reservation.dispatchedAt.getTime()) ||
      ledgerProof.status !== 'RECONCILED' || ledgerProof.units !== 1 ||
      ledgerProof.quotaKey !== 'AI_ACTION' || ledgerProof.storageKey !== asset.storageKey ||
      !SHA.test(asset.originalSha256 ?? '') || reservation.imageSha256 !== asset.originalSha256 ||
      !SHA.test(asset.outputSha256 ?? '') || !validKey(asset.storageKey,asset.outputSha256) ||
      !safeSize(asset.bytes) || !safeDimensions(asset.width,asset.height) ||
      !(asset.expiresAt instanceof Date) || !Number.isFinite(asset.expiresAt.getTime()) ||
      asset.expiresAt.getTime() <= now.getTime()) return deny('OWNER_LEDGER_OR_ASSET_NOT_AUTHORIZED');
  if (!storage || typeof storage.get !== 'function') return deny('PRIVATE_B2_ADAPTER_MISSING');
  try {
    const bytes = await storage.get({key:asset.storageKey,maximumBytes:BG_B2_MAX_BYTES,expectedBytes:asset.bytes});
    if (!(bytes instanceof Uint8Array) || bytes.length !== asset.bytes ||
        !isPng(bytes) || DIGEST(bytes) !== asset.outputSha256)
      return uncertain('PRIVATE_DOWNLOAD_INTEGRITY_MISMATCH');
    return Object.freeze({status:'VERIFIED_PRIVATE_DOWNLOAD', downloaded:true, uploaded:false,
      bytes:Buffer.from(bytes),mimeType:'image/png',
      contentDisposition:'attachment; filename="background-removed.png"',
      cacheControl:'private, no-store',publicUrl:null,retryAllowed:false});
  } catch { return uncertain('PRIVATE_DOWNLOAD_UNAVAILABLE'); }
}

/**
 * Production B2 adapter. Uses the EXISTING B2_* env names and installed SDK.
 * Transport construction performs no network call. Bucket MUST be private:
 * bucket ACL/CORS is an operator obligation, not something env vars guarantee.
 */
export async function createRealBgB2Storage({env=process.env} = {}) {
  const {B2_ENDPOINT,B2_REGION,B2_BUCKET_NAME,B2_KEY_ID,B2_APPLICATION_KEY}=env ?? {};
  if (![B2_ENDPOINT,B2_REGION,B2_BUCKET_NAME,B2_KEY_ID,B2_APPLICATION_KEY]
       .every(s=>typeof s==='string' && s.length>0) ||
      !/^[a-z0-9-]{2,40}$/.test(B2_REGION) ||
      !/^[a-zA-Z0-9-]{6,63}$/.test(B2_BUCKET_NAME)) throw new Error('B2_PRIVATE_CONFIG_UNAVAILABLE');
  let endpoint;
  try {endpoint=new URL(B2_ENDPOINT);} catch {throw new Error('B2_ENDPOINT_INVALID');}
  if (endpoint.protocol!=='https:' || endpoint.username || endpoint.password ||
      endpoint.port || endpoint.pathname!=='/' || endpoint.search || endpoint.hash ||
      endpoint.hostname!==`s3.${B2_REGION}.backblazeb2.com`)
    throw new Error('B2_ENDPOINT_INVALID');
  const { S3Client,PutObjectCommand,HeadObjectCommand,GetObjectCommand } = await import('@aws-sdk/client-s3');
  const s3=new S3Client({region:B2_REGION,endpoint:endpoint.origin,forcePathStyle:true,
    requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED',
    credentials:{accessKeyId:B2_KEY_ID,secretAccessKey:B2_APPLICATION_KEY}});
  const Bucket=B2_BUCKET_NAME;
  const requireKey=key=>{if(!validKey(key,KEY.exec(key ?? '')?.[2]))throw new Error('PRIVATE_B2_KEY_INVALID');};
  async function boundedStream(body,max,expected){
    if (!body || typeof body[Symbol.asyncIterator]!=='function')throw new Error('B2_STREAM_UNAVAILABLE');
    const parts=[];let count=0;
    try {
      for await (const part of body){
        if (!(part instanceof Uint8Array)) throw new Error('B2_INVALID_STREAM_CHUNK');
        count+=part.length;
        if (count>max || count>expected) throw new Error('B2_RESULT_TOO_LARGE');
        parts.push(Buffer.from(part));
      }
      if (count!==expected)throw new Error('B2_RESULT_INCOMPLETE');
      return Buffer.concat(parts,count);
    } catch(e){body.destroy?.();throw e;}
  }
  return Object.freeze({
    async put({key,bytes,sha,originalSha}){
      requireKey(key);
      if (!safeSize(bytes?.length) || !isPng(bytes) || DIGEST(bytes)!==sha ||
          !SHA.test(originalSha ?? ''))throw new Error('B2_PUT_INVALID');
      await s3.send(new PutObjectCommand({Bucket,Key:key,Body:Buffer.from(bytes),
        ContentLength:bytes.length,ContentType:'image/png',
        CacheControl:'private, no-store',
        ContentDisposition:'attachment; filename="background-removed.png"',
        Metadata:{sha256:sha,'source-sha256':originalSha}}));
    },
    async head({key}){
      requireKey(key);
      const r=await s3.send(new HeadObjectCommand({Bucket,Key:key}));
      return {bytes:Number(r.ContentLength),mimeType:r.ContentType,
        sha:r.Metadata?.sha256,originalSha:r.Metadata?.['source-sha256']};
    },
    async get({key,maximumBytes=BG_B2_MAX_BYTES,expectedBytes}){
      requireKey(key);
      if (!safeSize(expectedBytes) || maximumBytes!==BG_B2_MAX_BYTES)throw new Error('B2_GET_INVALID');
      const r=await s3.send(new GetObjectCommand({Bucket,Key:key}));
      if (Number(r.ContentLength)!==expectedBytes || r.ContentType!=='image/png'){
        r.Body?.destroy?.();throw new Error('B2_DOWNLOAD_SIZE_OR_TYPE_MISMATCH');
      }
      return boundedStream(r.Body,BG_B2_MAX_BYTES,expectedBytes);
    },
  });
}

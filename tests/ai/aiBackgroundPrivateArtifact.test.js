import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  BG_ARTIFACT_REVIEW_ONLY, BG_ARTIFACT_STORAGE_UPLOAD_ENABLED,
  BG_ARTIFACT_DOWNLOAD_ROUTE_ENABLED, BG_ARTIFACT_PUBLIC_URLS_ENABLED,
  BG_ARTIFACT_PAID_DISPATCH_ENABLED, BG_ARTIFACT_PRIVATE_PREFIX,
  BG_ARTIFACT_MAX_BYTES, planBackgroundPrivateArtifact,
  reviewBackgroundPrivateDownload,
} from '../../lib/ai/aiBackgroundPrivateArtifact.mjs';

const O = 'user_local_10j';
const I = '12345678-1234-4234-9234-123456789abc';
const A = '87654321-4321-4321-8234-abcdefabcdef';
const NOW = new Date('2026-10-19T15:00:00.000Z');
const hash = b => createHash('sha256').update(b).digest('hex');
const fakePng = () => Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, ...new Array(56).fill(1)]);
const source = () => {
  const imageBytes = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12]);
  return { ownerId: O, serverDecoded: true, preparation: 'FULL_RGBA_DECODED',
    imageBytes, imageSha256: hash(imageBytes) };
};
const verified = (s = source()) => {
  const outputBytes = fakePng();
  return { status: 'VERIFIED', provider: 'remove.bg', mimeType: 'image/png',
    sanitizedMetadata: true, stored: false, providerCreditUnits: 1,
    originalSha256: s.imageSha256, outputBytes, outputSha256: hash(outputBytes),
    width: 2, height: 2 };
};
const plan = (patch = {}) => {
  const s = source();
  return planBackgroundPrivateArtifact({ authenticatedOwnerId: O, requestId: I,
    preparedSource: s, verifiedOutput: verified(s), createOpaqueId: () => A,
    now: NOW, ...patch });
};
const stored = () => ({ ownerId: O, jobId: I, status: 'STORED_VERIFIED',
  storageProvider: 'B2_PRIVATE', mimeType: 'image/png', secureUrl: null,
  storageKey: `${BG_ARTIFACT_PRIVATE_PREFIX}${A}/${'ab'.repeat(32)}.png`,
  outputSha256: 'ab'.repeat(32), width: 2, height: 2, bytes: 100,
  expiresAt: new Date('2026-10-20T15:00:00.000Z') });
const job = () => ({ id: I, ownerId: O, status: 'COMPLETED',
  ledgerReconciled: true, providerOutcomeConfirmed: true, outputSha256: 'ab'.repeat(32) });
const review = (patch = {}) => reviewBackgroundPrivateDownload({
  authenticatedOwnerId: O, asset: stored(), job: job(), now: NOW, ...patch });

// These are contract tests with inert in-memory values. The fake PNG is only a
// shape fixture; production MUST call the full 10E Sharp verifier first.
describe('Phase 21 / 10J offline private artifact contract (never uploads)', () => {
  test('all paid, upload, URL and route switches remain OFF', () => {
    assert.equal(BG_ARTIFACT_REVIEW_ONLY, true);
    for (const flag of [BG_ARTIFACT_STORAGE_UPLOAD_ENABLED,
      BG_ARTIFACT_DOWNLOAD_ROUTE_ENABLED, BG_ARTIFACT_PUBLIC_URLS_ENABLED,
      BG_ARTIFACT_PAID_DISPATCH_ENABLED]) assert.equal(flag, false);
  });
  test('makes a private opaque plan with no side effects or public URL', () => {
    const v = plan();
    assert.equal(v.status, 'PLAN_ONLY_NEVER_UPLOAD');
    assert.equal(v.storageProvider, 'B2_PRIVATE');
    assert.equal(v.visibility, 'private');
    assert.equal(v.objectKey, `${BG_ARTIFACT_PRIVATE_PREFIX}${A}/${v.outputSha256}.png`);
    assert.equal(v.cacheControl, 'private, no-store');
    assert.equal(v.ownerId, O); assert.equal(v.requestId, I);
    assert.equal(v.mimeType, 'image/png'); assert.equal(v.bytes, 64);
    for (const k of ['stored', 'uploaded', 'providerCalled', 'databaseWritten',
      'ledgerReconciled', 'dispatchAllowed', 'authorized']) assert.equal(v[k], false);
    assert.equal(v.publicUrl, null);
  });
  test('keeps original and output inputs unchanged, copies output for future use', () => {
    const s = source(); const v = verified(s);
    const beforeOutput = [...v.outputBytes], beforeSource = [...s.imageBytes];
    const r = plan({ preparedSource: s, verifiedOutput: v });
    assert.notEqual(r.outputBytes, v.outputBytes);
    assert.deepEqual([...v.outputBytes], beforeOutput);
    assert.deepEqual([...s.imageBytes], beforeSource);
    v.outputBytes[10] = 8;
    assert.equal(r.outputBytes[10], beforeOutput[10]);
  });
  test('never places source name or account identifier into object key', () => {
    const r = plan();
    assert.ok(!r.objectKey.includes(O));
    assert.ok(!r.objectKey.includes('filename'));
    assert.ok(r.objectKey.startsWith('ai/background/private/'));
  });
  test('rejects unauthenticated or malformed owner before invoking opaque id generator', () => {
    let calls = 0;
    for (const owner of ['', ' bad ', '\nowner', null, 'a'.repeat(201)]) {
      assert.equal(plan({ authenticatedOwnerId: owner, createOpaqueId: () => { calls++; return A; } }).status, 'BLOCKED');
    }
    assert.equal(calls, 0);
  });
  test('blocks invalid request UUID', () => {
    for (const bad of ['', 'hello', '../etc', null]) assert.equal(plan({ requestId: bad }).status, 'BLOCKED');
  });
  test('invalid clock refuses plan', () => {
    assert.equal(plan({ now: new Date('no') }).status, 'BLOCKED');
    assert.equal(plan({ now: '2026-10-19' }).status, 'BLOCKED');
  });
  test('source must belong to authenticated owner and be FULL_RGBA_DECODED', () => {
    const s = source();
    assert.equal(plan({ preparedSource: { ...s, ownerId: 'other-user' } }).status, 'BLOCKED');
    assert.equal(plan({ preparedSource: { ...s, preparation: 'HEADER_ONLY' } }).status, 'BLOCKED');
    assert.equal(plan({ preparedSource: { ...s, serverDecoded: false } }).status, 'BLOCKED');
  });
  test('detects mutation of source bytes and mismatched source hash', () => {
    const s = source(); s.imageBytes[0] ^= 255;
    assert.equal(plan({ preparedSource: s }).status, 'BLOCKED');
    const x = source(); x.imageSha256 = 'ab'.repeat(32);
    assert.equal(plan({ preparedSource: x }).status, 'BLOCKED');
  });
  test('rejects forged provider, unverified status and claimed stored results', () => {
    const s = source();
    for (const fields of [{provider: 'other'}, {status: 'SUCCESS'}, {stored: true},
      {sanitizedMetadata: false}, {providerCreditUnits: 2}, {mimeType: 'image/jpeg'}]) {
      assert.equal(plan({preparedSource: s, verifiedOutput: { ...verified(s), ...fields }}).status,'BLOCKED');
    }
  });
  test('rejects original/output hash disagreement and output mutation', () => {
    const s = source(); const v = verified(s);
    assert.equal(plan({preparedSource: s, verifiedOutput:{...v, originalSha256:'aa'.repeat(32)}}).status,'BLOCKED');
    v.outputBytes[16] ^= 3;
    assert.equal(plan({preparedSource:s, verifiedOutput:v}).status,'BLOCKED');
  });
  test('rejects wrong, short, unsupported PNG output and fake bytes', () => {
    const s = source(); const v = verified(s);
    for (const bytes of [new Uint8Array([1,2]), 'png', new Uint8Array(64), null]) {
      const obj = {...v, outputBytes:bytes, outputSha256: bytes instanceof Uint8Array ? hash(bytes) : v.outputSha256};
      assert.equal(plan({preparedSource:s,verifiedOutput:obj}).status,'BLOCKED');
    }
  });
  test('rejects oversized output immediately', () => {
    const s=source(); const v=verified(s); const bytes=new Uint8Array(BG_ARTIFACT_MAX_BYTES+1);
    assert.equal(plan({preparedSource:s,verifiedOutput:{...v,outputBytes:bytes}}).status,'BLOCKED');
  });
  test('rejects malformed dimensions and decompression bombs', () => {
    const s=source(); const v=verified(s);
    for(const bad of [{width:0},{height:-1},{width:1.5},{width:8001},{width:8000,height:8000}])
      assert.equal(plan({preparedSource:s,verifiedOutput:{...v,...bad}}).status,'BLOCKED');
  });
  test('uses a random opaque UUIDv4, rejecting invalid generated keys', () => {
    for (const id of ['../escape','user-public','00000000-0000-1000-8000-000000000000', null])
      assert.equal(plan({createOpaqueId:()=>id}).status,'BLOCKED');
  });
  test('refuses an unavailable or throwing key generator', () => {
    assert.equal(plan({createOpaqueId:null}).status,'BLOCKED');
    assert.equal(plan({createOpaqueId:()=>{throw Error('SECRET');}}).status,'BLOCKED');
  });
  test('success output has no credential or signed download URL', () => {
    const p = plan();
    assert.equal(p.publicUrl, null); assert.equal('signedUrl' in p, false);
    assert.equal('apiKey' in p, false); assert.equal('secureUrl' in p, false);
  });
});

describe('Phase 21 / 10J owner-only download REVIEW (route remains OFF)', () => {
  test('requires real-looking durable DB proof but never grants a download', () => {
    const r = review();
    assert.equal(r.status, 'SERVER_REVIEW_ELIGIBLE_ROUTE_DISABLED');
    assert.equal(r.eligibleForFutureReview,true);
    assert.equal(r.authorized,false); assert.equal(r.publicUrl,null); assert.equal(r.signedUrl,null);
    assert.ok(r.serverOnlyStorageKey.startsWith(BG_ARTIFACT_PRIVATE_PREFIX));
  });
  test('refuses another authenticated owner and missing owner', () => {
    assert.equal(review({authenticatedOwnerId:'other-user'}).status,'BLOCKED');
    assert.equal(review({authenticatedOwnerId:null}).status,'BLOCKED');
  });
  test('both asset and job must belong to same owner', () => {
    assert.equal(review({asset:{...stored(),ownerId:'other-user'}}).status,'BLOCKED');
    assert.equal(review({job:{...job(),ownerId:'other-user'}}).status,'BLOCKED');
  });
  test('requires matching job IDs and completed job', () => {
    assert.equal(review({asset:{...stored(),jobId:'other'}}).status,'BLOCKED');
    assert.equal(review({job:{...job(),status:'PROCESSING'}}).status,'BLOCKED');
  });
  test('requires EXACT completed receipt and reconciled ledger', () => {
    assert.equal(review({asset:{...stored(),status:'PENDING'}}).status,'BLOCKED');
    assert.equal(review({job:{...job(),ledgerReconciled:false}}).status,'BLOCKED');
    assert.equal(review({job:{...job(),providerOutcomeConfirmed:false}}).status,'BLOCKED');
  });
  test('a claimed public URL or wrong private storage provider blocks download', () => {
    assert.equal(review({asset:{...stored(),secureUrl:'https://example.com'}}).status,'BLOCKED');
    assert.equal(review({asset:{...stored(),storageProvider:'public'}}).status,'BLOCKED');
  });
  test('rejects invalid storage keys including traversal and owner paths', () => {
    for(const key of ['../secret','ai/background/private/../../secrets',
      `ai/background/private/${O}/${'ab'.repeat(32)}.png`,
      `ai/background/private/${A}/${'ab'.repeat(32)}.jpg`]) {
      assert.equal(review({asset:{...stored(),storageKey:key}}).status,'BLOCKED');
    }
  });
  test('rejects object key/hash disagreement', () => {
    assert.equal(review({asset:{...stored(),outputSha256:'cd'.repeat(32)}}).status,'BLOCKED');
    assert.equal(review({job:{...job(),outputSha256:'cd'.repeat(32)}}).status,'BLOCKED');
  });
  test('enforces expiry against UTC clock including equality', () => {
    assert.equal(review({now:new Date('2026-10-20T15:00:00Z')}).status,'BLOCKED');
    assert.equal(review({now:new Date('2026-10-21T15:00:00Z')}).status,'BLOCKED');
    assert.equal(review({now:new Date('invalid')}).status,'BLOCKED');
    assert.equal(review({asset:{...stored(),expiresAt:'tomorrow'}}).status,'BLOCKED');
  });
  test('rejects unknown file type and oversized bytes or dimensions', () => {
    assert.equal(review({asset:{...stored(),mimeType:'text/html'}}).status,'BLOCKED');
    assert.equal(review({asset:{...stored(),bytes:BG_ARTIFACT_MAX_BYTES+1}}).status,'BLOCKED');
    assert.equal(review({asset:{...stored(),width:8000,height:8000}}).status,'BLOCKED');
  });
  test('missing job or asset always blocks', () => {
    assert.equal(review({job:null}).status,'BLOCKED');
    assert.equal(review({asset:null}).status,'BLOCKED');
  });
  test('no storage or database call can run from a review-only decision', () => {
    const r=review();
    assert.equal(r.providerCalled,false); assert.equal(r.uploaded,false);
    assert.equal(r.databaseWritten,false); assert.equal(r.authorized,false);
  });
});

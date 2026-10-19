import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import sharp from 'sharp';
import { prepareBackgroundRemovalSourceWithSharp } from '../../lib/ai/aiSharpDecoder.mjs';
import { verifyBackgroundRemovalOutput } from '../../lib/ai/aiBackgroundOutput.mjs';
import { planBackgroundPrivateArtifact, reviewBackgroundPrivateDownload } from '../../lib/ai/aiBackgroundPrivateArtifact.mjs';

const owner = 'clerk_local_integration_10k';
const requestId = '12345678-1234-4234-9234-123456789abc';
const now = new Date('2026-10-19T11:00:00.000Z');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const original = async fmt => new Uint8Array(await sharp({
  create: { width: 6, height: 4, channels: 4, background: { r: 80, g: 140, b: 200, alpha: 1 } },
})[fmt]().toBuffer());
const fakeProviderPng = async (transparent = true, visible = true) => {
  const px = new Uint8Array(6 * 4 * 4);
  for (let i=0; i<px.length; i+=4) {
    px[i] = 255; px[i+1] = 45; px[i+2] = 25;
    px[i+3] = transparent ? ((i / 4) % 2 === 0 ? (visible ? 255 : 0) : 0) : 255;
  }
  const bytes = new Uint8Array(await sharp(px, {
    raw: { width: 6, height: 4, channels: 4 },
  }).png().toBuffer());
  // Entirely fake transport result. No API call or payment made.
  return { provider: 'remove.bg', status: 'SUCCESS', generated: true,
    originalUnchanged: true, format: 'png', mimeType: 'image/png',
    providerCreditUnits: 1, width: 6, height: 4, bytes };
};
const prepare = async fmt => prepareBackgroundRemovalSourceWithSharp({ ownerId: owner,
  imageBytes: await original(fmt), declaredMimeType: fmt === 'jpeg' ? 'image/jpeg' : `image/${fmt}` });
const pipeline = async fmt => {
  const source = await prepare(fmt);
  const result = await fakeProviderPng();
  const verified = await verifyBackgroundRemovalOutput({ preparedSource: source, providerResult: result });
  const plan = planBackgroundPrivateArtifact({ authenticatedOwnerId: owner,
    requestId, preparedSource: source, verifiedOutput: verified, now,
    createOpaqueId: () => '87654321-4321-4321-8234-abcdefabcdef' });
  return { source, result, verified, plan };
};

describe('Phase 21 / 10K real pixel offline integration, fake provider ONLY', () => {
  test('PNG -> server decode -> fake transparent result -> full verify -> private PLAN', async () => {
    const { source, result, verified, plan } = await pipeline('png');
    assert.equal(source.preparation, 'FULL_RGBA_DECODED');
    assert.equal(verified.status, 'VERIFIED');
    assert.equal(plan.status, 'PLAN_ONLY_NEVER_UPLOAD');
    assert.equal(plan.originalSha256, hash(source.imageBytes));
    assert.equal(plan.outputSha256, hash(verified.outputBytes));
    assert.equal(plan.outputSha256, hash(plan.outputBytes));
    assert.equal(plan.objectKey.endsWith(`/${plan.outputSha256}.png`), true);
    assert.equal(plan.uploaded, false); assert.equal(plan.dispatchAllowed, false);
    assert.equal(result.providerCreditUnits, 1);
  });
  test('JPEG -> same full offline validation and never uploads', async () => {
    const { source, plan } = await pipeline('jpeg');
    assert.equal(source.mimeType, 'image/jpeg'); assert.equal(plan.stored, false);
    assert.equal(plan.publicUrl, null);
  });
  test('WebP -> same full offline validation and never uploads', async () => {
    const { source, plan } = await pipeline('webp');
    assert.equal(source.mimeType, 'image/webp'); assert.equal(plan.status, 'PLAN_ONLY_NEVER_UPLOAD');
  });
  test('real original input remains unchanged throughout pipeline', async () => {
    const source = await prepare('png'); const before = hash(source.imageBytes);
    await verifyBackgroundRemovalOutput({ preparedSource: source, providerResult: await fakeProviderPng() });
    assert.equal(hash(source.imageBytes), before);
  });
  test('fake success without transparent pixels cannot create verified output', async () => {
    const source = await prepare('png');
    const fake = await fakeProviderPng(false);
    await assert.rejects(() => verifyBackgroundRemovalOutput({ preparedSource: source,
      providerResult: fake }), /./);
  });
  test('fully transparent fake output is rejected as missing subject', async () => {
    const source = await prepare('png');
    const fake = await fakeProviderPng(true, false);
    await assert.rejects(() => verifyBackgroundRemovalOutput({ preparedSource: source,
      providerResult: fake }), /./);
  });
  test('fake provider cannot claim uncharged output', async () => {
    const source = await prepare('png');
    const fake = await fakeProviderPng();
    await assert.rejects(() => verifyBackgroundRemovalOutput({ preparedSource: source,
      providerResult: { ...fake, providerCreditUnits: 0 } }), /./);
  });
  test('tampering with fake provider PNG is rejected by PNG CRC integrity', async () => {
    const source = await prepare('png'); const result = await fakeProviderPng();
    result.bytes[45] ^= 0xff;
    await assert.rejects(() => verifyBackgroundRemovalOutput({ preparedSource: source,
      providerResult: result }), /./);
  });
  test('server-verified output cannot be planned for another authenticated owner', async () => {
    const { source, verified } = await pipeline('png');
    const plan = planBackgroundPrivateArtifact({ authenticatedOwnerId: 'other-user',
      requestId, preparedSource: source, verifiedOutput: verified, now });
    assert.equal(plan.status, 'BLOCKED'); assert.equal(plan.authorized, false);
  });
  test('tampered original after validation cannot be packaged', async () => {
    const { source, verified } = await pipeline('png');
    source.imageBytes[12] ^= 0xff;
    const plan = planBackgroundPrivateArtifact({ authenticatedOwnerId: owner,
      requestId, preparedSource: source, verifiedOutput: verified, now });
    assert.equal(plan.status, 'BLOCKED');
  });
  test('wrong output hash never gets a storage plan', async () => {
    const { source, verified } = await pipeline('png');
    const plan = planBackgroundPrivateArtifact({ authenticatedOwnerId: owner,
      requestId, preparedSource: source,
      verifiedOutput: { ...verified, outputSha256: '0'.repeat(64) }, now });
    assert.equal(plan.status, 'BLOCKED');
  });
  test('a plan alone never unlocks a download, even with matching owner', async () => {
    const { plan } = await pipeline('png');
    const result = reviewBackgroundPrivateDownload({ authenticatedOwnerId: owner,
      asset: plan, job: { id: requestId, ownerId: owner, status: 'COMPLETED' }, now });
    assert.equal(result.status, 'BLOCKED'); assert.equal(result.authorized, false);
  });
  test('repeating the same offline plan never touches the provider or database', async () => {
    const source = await prepare('png');
    const verified = await verifyBackgroundRemovalOutput({ preparedSource: source, providerResult: await fakeProviderPng() });
    const a = planBackgroundPrivateArtifact({ authenticatedOwnerId: owner, requestId,
      preparedSource: source, verifiedOutput: verified, createOpaqueId: randomUUID, now });
    const b = planBackgroundPrivateArtifact({ authenticatedOwnerId: owner, requestId,
      preparedSource: source, verifiedOutput: verified, createOpaqueId: randomUUID, now });
    for (const r of [a,b]) { assert.equal(r.providerCalled, false); assert.equal(r.databaseWritten, false); assert.equal(r.uploaded, false); }
    assert.notEqual(a.objectKey,b.objectKey);
  });
});

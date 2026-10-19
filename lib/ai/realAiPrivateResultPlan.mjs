import {randomUUID,createHash} from 'node:crypto';
const SHA=/^[0-9a-f]{64}$/;
export function planPrivateAiPng({ownerId,jobId,pngBytes,verifiedSourceSha,uuidFn=randomUUID}={}) {
  if (typeof ownerId!=='string'||ownerId.length<3||ownerId.length>256||ownerId.trim()!==ownerId) throw new Error('Authenticated owner required.');
  if (typeof jobId!=='string'||!/^[-a-zA-Z0-9_]{8,128}$/.test(jobId)) throw new Error('Invalid opaque job ID.');
  if (!SHA.test(verifiedSourceSha||'')) throw new Error('Verified source SHA required.');
  if (!(pngBytes instanceof Uint8Array)||pngBytes.length<40||pngBytes.length>12_000_000) throw new Error('Bounded verified PNG required.');
  if (!(pngBytes[0]===137&&pngBytes[1]===80&&pngBytes[2]===78&&pngBytes[3]===71&&pngBytes[4]===13&&pngBytes[5]===10&&pngBytes[6]===26&&pngBytes[7]===10)) throw new Error('PNG signature missing.');
  const id=uuidFn();if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new Error('Opaque UUID required.');
  return Object.freeze({status:'REVIEW_ONLY_NOT_UPLOADED',storageProvider:'backblaze-b2',
    storageKey:`ai-private/${id}.png`,sha256:createHash('sha256').update(pngBytes).digest('hex'),
    sourceSha256:verifiedSourceSha,bytes:pngBytes.length,uploadAllowed:false,
    publicUrl:null,downloadUrl:null,ownerAccessVerified:false});
}

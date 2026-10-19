import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  BG_B2_ROUTE_CONNECTED, BG_B2_PAID_DISPATCH_CONNECTED, BG_B2_DEFAULT_WRITE_ENABLED,
  BG_B2_DEFAULT_READ_ENABLED, BG_B2_MAX_BYTES,
  uploadRealBgPrivatePng, readRealBgPrivatePng, createRealBgB2Storage,
} from '../../lib/ai/realBgPrivateB2.mjs';

const owner='user_123';
const requestId='123e4567-e89b-42d3-a456-426614174000';
const opaque='123e4567-e89b-42d3-a456-426614174001';
const sourceSha='a'.repeat(64);
const digest=b=>createHash('sha256').update(b).digest('hex');
const png=()=>{
  const b=Buffer.alloc(64, 0);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(b);
  return b;
};
function fixture(){
  // Shape-only PNG fixture: no image decoder is run in Stage07.
  // The real runtime must call the existing Sharp verifier in Stage08.
  const bytes=png(),sha=digest(bytes);
  const key=`ai/background/private/${opaque}/${sha}.png`;
  const plan={ownerId:owner,requestId,status:'PLAN_ONLY_NEVER_UPLOAD',
    storageProvider:'B2_PRIVATE',visibility:'private',verified:true,stored:false,
    dispatchAllowed:false,uploaded:false,publicUrl:null,mimeType:'image/png',
    width:2,height:2,bytes:bytes.length,objectKey:key,
    originalSha256:sourceSha,outputSha256:sha,outputBytes:bytes};
  const verifiedOutput={status:'VERIFIED',provider:'remove.bg',mimeType:'image/png',
    sanitizedMetadata:true,stored:false,providerCreditUnits:1,transparentPixels:2,
    originalSha256:sourceSha,outputSha256:sha,outputBytes:Buffer.from(bytes),width:2,height:2};
  const reservation={requestId,ownerId:owner,imageSha256:sourceSha,status:'PROCESSING',
    creditsReserved:1,dispatchedAt:new Date('2026-10-19T13:00:00Z')};
  const asset={requestId,ownerId:owner,status:'STORED_VERIFIED',storageKey:key,
    outputSha256:sha,originalSha256:sourceSha,bytes:bytes.length,width:2,height:2,
    expiresAt:new Date('2026-10-26T13:00:00Z')};
  const completed={...reservation,status:'COMPLETED'};
  const ledgerProof={requestId,ownerId:owner,status:'RECONCILED',units:1,
    quotaKey:'AI_ACTION',storageKey:key};
  return {bytes,sha,key,plan,verifiedOutput,reservation,asset,completed,ledgerProof};
}
function storage(f,{badHead=false,badBytes=false,failPut=false}={}){
  let puts=0,heads=0,gets=0;
  return {
    get calls(){return {puts,heads,gets};},
    async put({key,bytes,sha,originalSha}){
      puts++;assert.equal(key,f.key);assert.equal(sha,f.sha);
      assert.equal(originalSha,sourceSha);assert.deepEqual(bytes,f.bytes);
      if(failPut)throw new Error('secret vendor message');
    },
    async head(){heads++;return {bytes:f.bytes.length,mimeType:'image/png',
      sha:badHead?'0'.repeat(64):f.sha,originalSha:sourceSha};},
    async get(){gets++;const b=Buffer.from(f.bytes);if(badBytes)b[20]^=255;return b;},
  };
}
const envWrite={AI_BG_PRIVATE_B2_WRITE_ENABLED:'true',AI_BG_PRIVATE_B2_OPERATOR_APPROVED:'true'};
const envRead={AI_BG_PRIVATE_B2_READ_ENABLED:'true'};
const upload=(f,s,extra={})=>uploadRealBgPrivatePng({plan:f.plan,verifiedOutput:f.verifiedOutput,
  reservation:f.reservation,storage:s,env:envWrite,...extra});
const read=(f,s,extra={})=>readRealBgPrivatePng({ownerId:owner,asset:f.asset,
  reservation:f.completed,ledgerProof:f.ledgerProof,storage:s,
  now:new Date('2026-10-20T00:00:00Z'),env:envRead,...extra});

test('Stage07 B2 and paid routes remain fully disconnected by default',()=>{
  assert.equal(BG_B2_ROUTE_CONNECTED,false);assert.equal(BG_B2_PAID_DISPATCH_CONNECTED,false);
  assert.equal(BG_B2_DEFAULT_WRITE_ENABLED,false);assert.equal(BG_B2_DEFAULT_READ_ENABLED,false);
  assert.equal(BG_B2_MAX_BYTES,20*1024*1024);
});
test('write requires BOTH explicit server env switches',async()=>{
  const f=fixture(),s=storage(f);
  const a=await upload(f,s,{env:{AI_BG_PRIVATE_B2_WRITE_ENABLED:'true'}});
  const b=await upload(f,s,{env:{AI_BG_PRIVATE_B2_OPERATOR_APPROVED:'true'}});
  assert.equal(a.status,'BLOCKED');assert.equal(b.status,'BLOCKED');assert.equal(s.calls.puts,0);
});
test('untrusted or inconsistent plan is rejected before B2 access',async()=>{
  const f=fixture(),s=storage(f);
  for(const patch of [{objectKey:'../foo'},{ownerId:'other-user'},{verified:false},
    {bytes:999},{publicUrl:'https://example.org/a.png'},{outputSha256:'b'.repeat(64)}]){
    assert.equal((await upload(f,s,{plan:{...f.plan,...patch}})).status,'BLOCKED');
  }
  assert.deepEqual(s.calls,{puts:0,heads:0,gets:0});
});
test('changed Sharp verified output fails before writing',async()=>{
  const f=fixture(),s=storage(f);
  assert.equal((await upload(f,s,{verifiedOutput:{...f.verifiedOutput,transparentPixels:0}})).status,'BLOCKED');
  assert.equal((await upload(f,s,{verifiedOutput:{...f.verifiedOutput,outputSha256:'1'.repeat(64)}})).status,'BLOCKED');
  assert.equal(s.calls.puts,0);
});
test('missing dispatched reservation or wrong owner never uploads',async()=>{
  const f=fixture(),s=storage(f);
  for(const patch of [{status:'RESERVED'},{ownerId:'other'},{creditsReserved:2},{dispatchedAt:null}]){
    assert.equal((await upload(f,s,{reservation:{...f.reservation,...patch}})).status,'BLOCKED');
  }
  assert.equal(s.calls.puts,0);
});
test('successful private PUT uses HEAD and full GET hash before claiming stored',async()=>{
  const f=fixture(),s=storage(f),r=await upload(f,s);
  assert.equal(r.status,'STORED_VERIFIED_NEEDS_DB');assert.equal(r.uploaded,true);
  assert.equal(r.publicUrl,null);assert.equal(r.ledgerReconciled,false);
  assert.equal(r.storageKey,f.key);assert.deepEqual(s.calls,{puts:1,heads:1,gets:1});
});
test('B2 HEAD metadata mismatch is UNKNOWN, never an automatic retry',async()=>{
  const f=fixture(),s=storage(f,{badHead:true}),r=await upload(f,s);
  assert.equal(r.status,'UNKNOWN_NO_AUTO_RETRY');assert.equal(r.retryAllowed,false);
  assert.deepEqual(s.calls,{puts:1,heads:1,gets:0});
});
test('B2 readback hash mismatch is UNKNOWN without a second write',async()=>{
  const f=fixture(),s=storage(f,{badBytes:true}),r=await upload(f,s);
  assert.equal(r.status,'UNKNOWN_NO_AUTO_RETRY');assert.equal(r.retryAllowed,false);
  assert.deepEqual(s.calls,{puts:1,heads:1,gets:1});
});
test('B2 write exception never leaks vendor secret and never retries',async()=>{
  const f=fixture(),s=storage(f,{failPut:true}),r=await upload(f,s);
  assert.equal(r.status,'UNKNOWN_NO_AUTO_RETRY');assert.equal(r.retryAllowed,false);
  assert.equal(JSON.stringify(r).includes('secret vendor message'),false);
  assert.equal(s.calls.puts,1);
});
test('private read requires explicit switch and makes no B2 call when off',async()=>{
  const f=fixture(),s=storage(f),r=await read(f,s,{env:{}});
  assert.equal(r.status,'BLOCKED');assert.equal(s.calls.gets,0);
});
test('private read denies wrong owner, mismatch, or missing ledger',async()=>{
  const f=fixture(),s=storage(f);
  const x=await read(f,s,{ownerId:'other-user'});
  const y=await read(f,s,{ledgerProof:null});
  const z=await read(f,s,{reservation:{...f.completed,status:'UNKNOWN'}});
  assert.equal(x.status,'BLOCKED');assert.equal(y.status,'BLOCKED');
  assert.equal(z.status,'BLOCKED');assert.equal(s.calls.gets,0);
});
test('private read denies expired asset and traversal key before B2',async()=>{
  const f=fixture(),s=storage(f);
  const expired=await read(f,s,{now:new Date('2026-10-27T00:00:00Z')});
  const path=await read(f,s,{asset:{...f.asset,storageKey:'../../secret'}});
  assert.equal(expired.status,'BLOCKED');assert.equal(path.status,'BLOCKED');
  assert.equal(s.calls.gets,0);
});
test('successful private read returns verified PNG bytes, never signed URL',async()=>{
  const f=fixture(),s=storage(f),r=await read(f,s);
  assert.equal(r.status,'VERIFIED_PRIVATE_DOWNLOAD');assert.equal(r.downloaded,true);
  assert.equal(r.publicUrl,null);assert.equal('signedUrl' in r,false);
  assert.deepEqual(r.bytes,f.bytes);assert.equal(r.cacheControl,'private, no-store');
});
test('private read detects tampered bytes and fails closed',async()=>{
  const f=fixture(),s=storage(f,{badBytes:true}),r=await read(f,s);
  assert.equal(r.status,'UNKNOWN_NO_AUTO_RETRY');assert.equal(r.downloaded,false);
});
test('B2 configuration rejects external endpoints before loading SDK/network',async()=>{
  for(const endpoint of ['http://s3.us-east-005.backblazeb2.com/',
    'https://evil.example/', 'https://s3.us-east-005.backblazeb2.com:444/',
    'https://s3.us-east-005.backblazeb2.com/?credentials=yes']){
    await assert.rejects(createRealBgB2Storage({env:{
      B2_ENDPOINT:endpoint,B2_REGION:'us-east-005',B2_BUCKET_NAME:'ai-media-temp-documents',
      B2_KEY_ID:'fake',B2_APPLICATION_KEY:'fake',
    }}),/B2_ENDPOINT_INVALID/);
  }
});

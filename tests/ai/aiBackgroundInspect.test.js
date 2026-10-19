import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import {
  BG_INSPECT_MAX_INPUT_BYTES, BG_INSPECT_MAX_PIXELS,
  BG_INSPECT_PROVIDER_DISPATCH_ENABLED, BG_INSPECT_DATABASE_WRITES_ENABLED,
  isLocalBgInspectEnabled, readBoundedBackgroundBytes, handleLocalBackgroundInspect,
} from '../../lib/ai/aiBackgroundInspect.mjs';

const url = 'http://localhost:3000/api/ai/background/inspect';
const sample = new Uint8Array(64).fill(1);
const quota = { allowed: true, daily: { used: 0, limit: 3 }, monthly: { used: 0, limit: 20 } };
function request(body = sample, type = 'image/png', origin = 'http://localhost:3000', target = url, extra = {}) {
  return new Request(target, { method: 'POST', headers: { origin, 'content-type': type, ...extra }, body });
}
const inspectImage = async ({ownerId,imageBytes,declaredMimeType}) => ({
  ownerId, imageBytes, mimeType: declaredMimeType, width: 4, height: 4,
  preparation:'FULL_RGBA_DECODED',serverDecoded:true,
});
const readQuota = async () => quota;
function invoke(overrides = {}) {
  return handleLocalBackgroundInspect({ request: request(), userId: 'user_test_01', enabled: true,
    inspectImage, readQuota, ...overrides });
}

// Only the pure HTTP policy is exercised by these tests. Real 10D decoder
// integration is already tested separately; production endpoint stays OFF.
describe('Phase 21 / 10H authenticated local-only background inspection', () => {
  test('does not allow dispatch, quota mutations or storage uploads', () => {
    assert.equal(BG_INSPECT_PROVIDER_DISPATCH_ENABLED, false);
    assert.equal(BG_INSPECT_DATABASE_WRITES_ENABLED, false);
  });
  test('requires BOTH development and server opt-in on local host', () => {
    assert.equal(isLocalBgInspectEnabled({nodeEnv:'development',flag:'1',host:'localhost'}),true);
    assert.equal(isLocalBgInspectEnabled({nodeEnv:'development',flag:'1',host:'127.0.0.1'}),true);
    assert.equal(isLocalBgInspectEnabled({nodeEnv:'development',flag:'1',host:'[::1]'}),true);
    for (const a of [
      {nodeEnv:'production',flag:'1',host:'localhost'},
      {nodeEnv:'development',flag:'0',host:'localhost'},
      {nodeEnv:'development',flag:'1',host:'media.example.com'},
      {nodeEnv:'development',flag:1,host:'localhost'},
    ]) assert.equal(isLocalBgInspectEnabled(a),false);
  });
  test('disabled 404 occurs before any image or quota reads', async () => {
    let called = false;
    const r = await invoke({enabled:false,inspectImage:()=>{called=true;},readQuota:()=>{called=true;}});
    assert.equal(r.status,404);assert.equal(called,false);
  });
  test('unauthenticated requests are rejected before expensive reads', async () => {
    let called=false;const r=await invoke({userId:null,inspectImage:()=>{called=true;},readQuota:()=>{called=true;}});
    assert.equal(r.status,401);assert.equal(called,false);
  });
  test('rejects owner whitespace and spoofed blank owner', async () => {
    assert.equal((await invoke({userId:' user_test_01'})).status,401);
    assert.equal((await invoke({userId:'   '})).status,401);
  });
  test('local exact same-origin POST is accepted', async () => {
    const r=await invoke();assert.equal(r.status,200);assert.equal(r.body.mode,'LOCAL_INSPECTION_ONLY');
  });
  test('cross-origin localhost, null and absent Origin are blocked', async () => {
    assert.equal((await invoke({request:request(sample,'image/png','https://evil.example')})).status,403);
    assert.equal((await invoke({request:request(sample,'image/png','null')})).status,403);
    assert.equal((await invoke({request:new Request(url,{method:'POST',headers:{'content-type':'image/png'},body:sample})})).status,403);
  });
  test('remote host is refused even with matching remote origin', async () => {
    const r=await invoke({request:request(sample,'image/png','https://myapp.example','https://myapp.example/api/ai/background/inspect')});
    assert.equal(r.status,403);
  });
  test('query flags and fragment fields are blocked', async () => {
    assert.equal((await invoke({request:request(sample,'image/png','http://localhost:3000',url+'?paid=1')})).status,400);
  });
  test('only raw PNG JPEG WebP is accepted', async () => {
    for(const type of ['application/json','multipart/form-data','image/svg+xml','image/png; charset=utf-8','application/octet-stream']){
      assert.equal((await invoke({request:request(sample,type)})).status,415);
    }
    for(const type of ['image/png','image/jpeg','image/webp']){
      assert.equal((await invoke({request:request(sample,type)})).status,200);
    }
  });
  test('requires POST request', async () => {
    const r=await invoke({request:new Request(url,{method:'GET',headers:{origin:'http://localhost:3000','content-type':'image/png'}})});
    assert.equal(r.status,405);
  });
  test('rejects missing body and tiny image', async () => {
    assert.equal((await invoke({request:new Request(url,{method:'POST',headers:{origin:'http://localhost:3000','content-type':'image/png'}})})).status,400);
    assert.equal((await invoke({request:request(new Uint8Array(3))})).status,400);
  });
  test('rejects oversized advertised Content-Length before reading image', async () => {
    const r=await invoke({request:request(sample,'image/png','http://localhost:3000',url,{'content-length':String(BG_INSPECT_MAX_INPUT_BYTES+1)})});
    assert.equal(r.status,413);
  });
  test('rejects malformed advertised length', async () => {
    assert.equal((await invoke({request:request(sample,'image/png','http://localhost:3000',url,{'content-length':'NaN'})})).status,400);
  });
  test('streaming size bounds are enforced even without Content-Length', async () => {
    const chunks=[new Uint8Array(BG_INSPECT_MAX_INPUT_BYTES-10), new Uint8Array(32)];
    const stream=new ReadableStream({pull(controller){if(chunks.length)controller.enqueue(chunks.shift());else controller.close();}});
    const req=new Request(url,{method:'POST',headers:{origin:'http://localhost:3000','content-type':'image/png'},body:stream,duplex:'half'});
    assert.equal((await invoke({request:req})).status,413);
  });
  test('stream reader errors fail closed', async () => {
    const stream=new ReadableStream({start(controller){controller.error(new Error('private file details'));}});
    const req=new Request(url,{method:'POST',headers:{origin:'http://localhost:3000','content-type':'image/png'},body:stream,duplex:'half'});
    const result=await readBoundedBackgroundBytes(req);
    assert.equal(result.error.status,400);assert.equal(JSON.stringify(result).includes('private file details'),false);
  });
  test('inspector error returns sanitized 422 and never reads quota', async () => {
    let read=false;
    const r=await invoke({inspectImage:()=>{throw Error('secret internal image path');}, readQuota:()=>{read=true;}});
    assert.equal(r.status,422);assert.equal(read,false);
    assert.equal(JSON.stringify(r).includes('secret'),false);
  });
  test('trusted image must match authenticated owner and verified full decode', async () => {
    for(const modifications of [{ownerId:'user_other'}, {serverDecoded:false}, {preparation:'HEADER_ONLY'}, {mimeType:'image/svg+xml'}]){
      const r=await invoke({inspectImage:async (args)=>({...await inspectImage(args),...modifications})});
      assert.equal(r.status,422);
    }
  });
  test('forged huge dimensions and invalid byte count are rejected', async () => {
    assert.equal(BG_INSPECT_MAX_PIXELS,4_000_000);
    for(const modifications of [{width:4000,height:4000}, {width:0}, {height:1.3},{imageBytes:new Uint8Array(2)}]){
      const r=await invoke({inspectImage:async(args)=>({...await inspectImage(args),...modifications})});
      assert.equal(r.status,422);
    }
  });
  test('reads quota only after full verification and once', async () => {
    let seen=null,calls=0;
    const r=await invoke({readQuota:async owner=>{calls++;seen=owner;return quota;}});
    assert.equal(r.status,200); assert.equal(calls,1);assert.equal(seen,'user_test_01');
  });
  test('does not claim background removal, processing, vendor or cloud upload', async () => {
    const r=await invoke();
    assert.equal(r.body.backgroundRemoved,false);assert.equal(r.body.providerCalled,false);
    assert.equal(r.body.quotaConsumed,false);assert.equal(r.body.uploadedToCloud,false);
    assert.deepEqual(r.body.image,{mimeType:'image/png',width:4,height:4,bytes:64});
    assert.deepEqual(r.body.quota,quota);
    assert.equal('imageBytes' in r.body,false);
  });
  test('missing server deps refuse work rather than invoking a provider', async () => {
    await assert.rejects(invoke({inspectImage:null}),/Trusted server dependencies/);
    await assert.rejects(invoke({readQuota:null}),/Trusted server dependencies/);
  });
  test('invalid shared quota fails closed rather than fabricating allowance', async () => {
    await assert.rejects(invoke({readQuota:async()=>({daily:{},monthly:{}})}),/quota snapshot/);
  });
});

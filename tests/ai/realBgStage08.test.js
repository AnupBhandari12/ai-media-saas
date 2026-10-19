import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessBgRuntime,assessBgRead} from '../../lib/ai/realBgRuntimePolicy.mjs';
import {markBgDispatch,markBgUnknown,completeBgWithUniqueLedger,getBgDownloadProof}
 from '../../lib/ai/realBgPersistence.mjs';
const id='123e4567-e89b-42d3-a456-426614174000',owner='user_123';
const disabled={};
const env={AI_BG_REAL_ENABLED:'true',AI_BG_REAL_SPEND_APPROVED:'true',
 AI_BG_PRIVATE_B2_WRITE_ENABLED:'true',AI_BG_PRIVATE_B2_OPERATOR_APPROVED:'true',
 REMOVE_BG_API_KEY:'vendor-fake-key-123',B2_ENDPOINT:'https://s3.ap-southeast-1.backblazeb2.com',
 B2_REGION:'ap-southeast-1',B2_BUCKET_NAME:'bucket-valid',B2_KEY_ID:'access-valid',
 B2_APPLICATION_KEY:'secret-valid'};
const stored=()=>({status:'STORED_VERIFIED_NEEDS_DB',ownerId:owner,requestId:id,
 uploaded:true,ledgerReconciled:false,storageKey:'ai/background/private/123e4567-e89b-42d3-a456-426614174001/'+('b'.repeat(64))+'.png',
 originalSha256:'a'.repeat(64),outputSha256:'b'.repeat(64),bytes:1024,width:100,height:100});
const row=()=>({ownerId:owner,requestId:id,status:'PROCESSING',creditsReserved:1,
 imageSha256:'a'.repeat(64),dispatchedAt:new Date('2026-10-19T12:00:00.000Z')});
function fakeDb({badStatus=false,assetFailure=false}={}){
 const events=[];const assets=[];const edits=[];
 const db={
  bgCreditReservation:{
   async findUnique(){return {...row(),status:badStatus?'UNKNOWN':'PROCESSING'};},
   async updateMany({where,data}){edits.push({where,data});return {count:where.status==='PROCESSING'||where.status==='RESERVED'?1:0};},
  },
  bgStoredAsset:{async create({data}){if(assetFailure)throw Error('failure');assets.push(data);},
    async findUnique(){return {...stored(),status:'STORED_VERIFIED',expiresAt:new Date('2026-11-01T12:00:00Z'),storageKey:stored().storageKey};}},
  usageEvent:{async create({data}){events.push(data);},async findUnique(){return {ownerId:owner,bgCreditReservationId:id,quotaKey:'AI_ACTION',units:1,toolId:'background-remover'};}},
 };
 db.$transaction=async fn=>{
   const before={e:events.length,a:assets.length,ed:edits.length};
   try{return await fn(db);}catch(e){events.length=before.e;assets.length=before.a;edits.length=before.ed;throw e;}
 };
 return {db,events,assets,edits};
}
const src=file=>readFileSync(new URL(file,import.meta.url),'utf8');

test('all server paid flags default OFF',()=>assert.equal(assessBgRuntime(disabled).allowed,false));
test('operator approval and vendor/storage must all exist',()=>{
 for(const field of ['AI_BG_REAL_ENABLED','AI_BG_REAL_SPEND_APPROVED','AI_BG_PRIVATE_B2_WRITE_ENABLED',
 'AI_BG_PRIVATE_B2_OPERATOR_APPROVED','REMOVE_BG_API_KEY','B2_ENDPOINT','B2_REGION','B2_BUCKET_NAME','B2_KEY_ID','B2_APPLICATION_KEY'])
   assert.equal(assessBgRuntime({...env,[field]:''}).allowed,false,field);
 assert.equal(assessBgRuntime(env).allowed,true);
});
test('private download defaults OFF and requires exact true',()=>{
 assert.equal(assessBgRead({}).allowed,false);
 assert.equal(assessBgRead({AI_BG_PRIVATE_B2_READ_ENABLED:'TRUE'}).allowed,false);
 assert.equal(assessBgRead({AI_BG_PRIVATE_B2_READ_ENABLED:'true'}).allowed,true);
});
test('dispatch transition must CAS only new RESERVED request',async()=>{
 const f=fakeDb();const r=await markBgDispatch({db:f.db,ownerId:owner,requestId:id});
 assert.equal(r.ok,true);assert.equal(f.edits[0].where.status,'RESERVED');
 assert.equal(f.edits[0].where.dispatchedAt,null);
});
test('no malformed request can alter dispatch',async()=>{
 const f=fakeDb();assert.equal((await markBgDispatch({db:f.db,ownerId:' ',requestId:id})).ok,false);
 assert.equal(f.edits.length,0);
});
test('unknown after dispatch holds reservation (not cancelled)',async()=>{
 const f=fakeDb();assert.equal((await markBgUnknown({db:f.db,ownerId:owner,requestId:id})).ok,true);
 assert.equal(f.edits[0].data.status,'UNKNOWN');
});
test('successful stored proof creates one owned asset + unique linked usage event',async()=>{
 const f=fakeDb();const res=await completeBgWithUniqueLedger({db:f.db,ownerId:owner,requestId:id,stored:stored()});
 assert.equal(res.ok,true);assert.equal(f.assets.length,1);assert.equal(f.events.length,1);
 assert.equal(f.events[0].bgCreditReservationId,id);
 assert.equal(f.events[0].quotaKey,'AI_ACTION');
 assert.equal(f.assets[0].status,'STORED_VERIFIED');assert.equal(f.edits[0].data.status,'COMPLETED');
});
test('UNKNOWN credit cannot be falsely completed',async()=>{
 const f=fakeDb({badStatus:true});const r=await completeBgWithUniqueLedger({db:f.db,ownerId:owner,requestId:id,stored:stored()});
 assert.equal(r.ok,false);assert.equal(f.events.length,0);assert.equal(f.assets.length,0);
});
test('asset persistence failure rolls back usage event and final status',async()=>{
 const f=fakeDb({assetFailure:true});const r=await completeBgWithUniqueLedger({db:f.db,ownerId:owner,requestId:id,stored:stored()});
 assert.equal(r.ok,false);assert.equal(f.events.length,0);assert.equal(f.edits.length,0);
});
test('untrusted output hash / owner cannot be made durable',async()=>{
 const f=fakeDb();const r=await completeBgWithUniqueLedger({db:f.db,ownerId:'other',requestId:id,stored:stored()});
 assert.equal(r.ok,false);assert.equal(f.edits.length,0);
});
test('download requires query-bound owner records and unique ledger',async()=>{
 const f=fakeDb();const r=await getBgDownloadProof({db:f.db,ownerId:owner,requestId:id});
 assert.equal(r.ledgerProof.status,'RECONCILED');assert.equal(r.ledgerProof.storageKey,stored().storageKey);
 assert.equal(await getBgDownloadProof({db:f.db,ownerId:'other',requestId:id}),null);
});
test('additive migration uses exact once linkage without destructive SQL',()=>{
 const sql=src('../../prisma/migrations/20261019235900_phase21_bg_unique_usage_ledger/migration.sql');
 assert.match(sql,/CREATE UNIQUE INDEX "UsageEvent_bgCreditReservationId_key"/);
 assert.match(sql,/REFERENCES "BgCreditReservation"/);
 assert.doesNotMatch(sql.split('\n').filter(line=>!line.trim().startsWith('--')).join('\n'),/^\s*(?:DROP|DELETE|TRUNCATE|UPDATE)\b/im);
});
test('routes use Clerk owner, origin and no-storage-public-urls',()=>{
 const post=src('../../app/api/ai/real/background/route.js');
 const get=src('../../app/api/ai/real/background/download/route.js');
 assert.match(post,/await auth\(\)/);assert.match(post,/headers\.get\('origin'\)/);
 assert.match(post,/paidConsent/);assert.match(post,/runRealBackground/);
 assert.match(get,/await auth\(\)/);assert.match(get,/getBgDownloadProof/);
 assert.match(get,/private, no-store/);assert.match(get,/readRealBgPrivatePng/);
 assert.doesNotMatch(get,/getSignedUrl|publicUrl|createPresignedPost/);
});
test('UI includes separate controlled beta while keeping free browser editor',()=>{
 const ui=src('../../components/ai/BackgroundRemoverClient.jsx');
 assert.match(ui,/LocalSolidBackgroundLab/);assert.match(ui,/RealBackgroundLab/);
 const beta=src('../../components/ai/RealBackgroundLab.jsx');
 assert.match(beta,/type="checkbox"/);assert.match(beta,/crypto.randomUUID/);
 assert.match(beta,/response.status===409/);
});

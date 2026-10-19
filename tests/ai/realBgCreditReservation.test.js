import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {reserveRealBackgroundCredit,BG_REAL_PROVIDER_DISPATCH_ALLOWED,BG_REAL_VENDOR_ROUTE_CONNECTED} from '../../lib/ai/realBgCreditReservation.mjs';
const now=new Date('2026-10-19T13:20:00.000Z');
const uuid='123e4567-e89b-42d3-a456-426614174000';
const preflight=()=>({status:'READY_FOR_ATOMIC_RESERVATION',requiresDurableAtomicReservation:true,
  dispatchAllowed:false,atomicReservationCompleted:false,requiredCredits:1,
  requestId:uuid,ownerId:'user_123',imageSha256:'a'.repeat(64),
  quotaDayStart:'2026-10-19',quotaMonthStart:'2026-10'});
const kw=(p,period)=>`${p.ownerId}|${period}`;
const pk=(period)=>`remove.bg|${period}`;
function makeFake({dailyUsed=0,monthlyUsed=0,dailyPool=0,monthlyPool=0,limitValue=5,ceiling=5,missing='',legacy=false,conflict=''}={}){
  const p=preflight();
  const s={requests:new Map(),q:new Map(),b:new Map()};
  for(const period of ['MONTH','DAY']){
    if(missing!==`q${period}`)s.q.set(kw(p,period),{
      id:'q'+period,ownerId:p.ownerId,quotaKey:'AI_ACTION',period,
      periodStart:new Date(period==='MONTH'?'2026-10-01T00:00:00.000Z':'2026-10-19T00:00:00.000Z'),
      used:period==='MONTH'?monthlyUsed:dailyUsed,
      ...(legacy?{limit:limitValue}:{limitValue}),
    });
    if(missing!==`b${period}`)s.b.set(pk(period),{
      id:'b'+period,scope:'POOL',scopeId:'remove.bg',period,
      periodKey:period==='MONTH'?'2026-10':'2026-10-19',
      committed:period==='MONTH'?monthlyPool:dailyPool,ceiling,
    });
  }
  let transactions=0,proceeded=0;
  // In-memory serializable snapshot transaction: commit only on success.
  const db={$transaction:async fn=>{
    transactions++;
    const local=structuredClone(s);
    const tx={
      bgCreditReservation:{
        findUnique:async({where})=>local.requests.get(where.requestId)??null,
        create:async({data})=>{if(local.requests.has(data.requestId))throw Error('duplicate');local.requests.set(data.requestId,{...data});return data;},
      },
      aiQuotaBucket:{
        findUnique:async({where})=>{const k=where.ownerId_quotaKey_period_periodStart;return local.q.get(`${k.ownerId}|${k.period}`)??null;},
        updateMany:async({where})=>{if(conflict==='q'+where.period)return {count:0};const x=local.q.get(`${where.ownerId}|${where.period}`);if(!x||x.id!==where.id||x.used!==where.used||x.limitValue!==where.limitValue)return {count:0};x.used++;return {count:1};},
      },
      bgCreditBucket:{
        findUnique:async({where})=>local.b.get(`remove.bg|${where.scope_scopeId_period_periodKey.period}`)??null,
        updateMany:async({where})=>{if(conflict==='b'+where.period)return {count:0};const x=local.b.get(`remove.bg|${where.period}`);if(!x||x.id!==where.id||x.committed!==where.committed||x.ceiling!==where.ceiling)return {count:0};x.committed++;return {count:1};},
      },
    };
    const result=await fn(tx);
    s.requests=local.requests;s.q=local.q;s.b=local.b;proceeded++;
    return result;
  }};
  return {db,s,stats:()=>({transactions,proceeded})};
}
const call=(db,override={})=>reserveRealBackgroundCredit({db,preflight:preflight(),now,ownerPaidConsent:true,operatorApproval:true,...override});
test('no operator approval is a zero-side-effect hard stop',async()=>{
  const f=makeFake();const r=await reserveRealBackgroundCredit({db:f.db,preflight:preflight(),now,ownerPaidConsent:true});
  assert.equal(r.outcome,'BLOCKED');assert.equal(f.stats().transactions,0);
});
test('trusted request debits shared MONTH/DAY and vendor POOL MONTH/DAY exactly once',async()=>{
  const f=makeFake();const r=await call(f.db);
  assert.equal(r.outcome,'RESERVED_NOT_DISPATCHABLE');assert.equal(r.providerCalled,false);
  assert.equal(r.dispatchAllowed,false);assert.equal(f.s.requests.size,1);
  for(const p of ['MONTH','DAY']){assert.equal(f.s.q.get('user_123|'+p).used,1);assert.equal(f.s.b.get('remove.bg|'+p).committed,1);}
});
test('same request UUID is denied without double charges',async()=>{
  const f=makeFake();assert.equal((await call(f.db)).committed,true);
  const next=await call(f.db);assert.equal(next.outcome,'BLOCKED');assert.equal(next.reason,'REQUEST_EXISTS_NO_RETRY');
  assert.equal(f.s.requests.size,1);assert.equal(f.s.b.get('remove.bg|DAY').committed,1);
});
test('exhausted shared DAY quota rolls back all writes',async()=>{
  const f=makeFake({dailyUsed:5});const r=await call(f.db);
  assert.equal(r.reason,'SHARED_QUOTA_EXHAUSTED');assert.equal(f.s.requests.size,0);
  assert.equal(f.s.q.get('user_123|MONTH').used,0);assert.equal(f.s.b.get('remove.bg|MONTH').committed,0);
});
test('exhausted vendor POOL DAY rolls back earlier shared and month debit',async()=>{
  const f=makeFake({dailyPool:5});const r=await call(f.db);
  assert.equal(r.reason,'VENDOR_POOL_EXHAUSTED');assert.equal(f.s.requests.size,0);
  assert.equal(f.s.q.get('user_123|DAY').used,0);assert.equal(f.s.b.get('remove.bg|MONTH').committed,0);
});
test('missing vendor pool bucket fails closed',async()=>{
  const f=makeFake({missing:'bMONTH'});assert.equal((await call(f.db)).reason,'VENDOR_POOL_MISSING_OR_INVALID');assert.equal(f.s.requests.size,0);
});
test('legacy limit is rejected: real Prisma field is limitValue',async()=>{
  const f=makeFake({legacy:true});assert.equal((await call(f.db)).reason,'SHARED_QUOTA_MISSING_OR_INVALID');assert.equal(f.s.requests.size,0);
});
test('concurrent changes abort entire transaction without retry',async()=>{
  const f=makeFake({conflict:'bDAY'});const r=await call(f.db);
  assert.equal(r.reason,'VENDOR_POOL_CONFLICT');assert.equal(f.stats().transactions,1);
  assert.equal(f.s.requests.size,0);assert.equal(f.s.q.get('user_123|MONTH').used,0);
});
test('untrusted date, hashes, and preflight evidence never enter DB',async()=>{
  const f=makeFake();const p=preflight();p.imageSha256='bad';
  assert.equal((await call(f.db,{preflight:p})).outcome,'BLOCKED');
  assert.equal((await call(f.db,{now:new Date('2026-10-20T00:00:00Z')})).outcome,'BLOCKED');
  assert.equal(f.stats().transactions,0);
});
test('no route/provider is enabled by creating a reservation',async()=>{
  assert.equal(BG_REAL_PROVIDER_DISPATCH_ALLOWED,false);assert.equal(BG_REAL_VENDOR_ROUTE_CONNECTED,false);
  const f=makeFake();const r=await call(f.db);assert.equal(r.dispatchAllowed,false);
});

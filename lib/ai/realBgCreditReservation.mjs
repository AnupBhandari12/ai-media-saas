/**
 * Phase21 Stage06: durable accounting transaction for background removal.
 * NOT imported by an HTTP route; NO vendor, network, B2 or secret dependency.
 * Credit reservation is not authorization to dispatch/remove.bg or upload.
 * Requires existing Bg* tables and pre-provisioned POOL budgets, never funds them.
 */
export const BG_REAL_VENDOR_ROUTE_CONNECTED = false;
export const BG_REAL_PROVIDER_DISPATCH_ALLOWED = false;
export const BG_REAL_STORAGE_UPLOAD_ALLOWED = false;
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OWNER = /^[^\u0000-\u001f\u007f]{3,256}$/;
const MAX_COUNT = 1_000_000;
const whole = n => Number.isSafeInteger(n) && n >= 0 && n <= MAX_COUNT;
const blocked = reason => Object.freeze({outcome:'BLOCKED',reason,committed:false,dispatchAllowed:false,providerCalled:false});
const ok = requestId => Object.freeze({outcome:'RESERVED_NOT_DISPATCHABLE',requestId,committed:true,dispatchAllowed:false,providerCalled:false});
class Denied extends Error {constructor(code){super(code);this.code=code;}}
const deny = code => {throw new Denied(code);};
const utc = d => d.toISOString().slice(0,10);

function candidateIsTrusted(p, now){
  if (!p || typeof p !== 'object' || Array.isArray(p) || !(now instanceof Date) || !Number.isFinite(now.getTime())) return false;
  const day=utc(now);
  return p.status==='READY_FOR_ATOMIC_RESERVATION' && p.requiresDurableAtomicReservation===true &&
    p.dispatchAllowed===false && p.atomicReservationCompleted===false && p.requiredCredits===1 &&
    typeof p.ownerId==='string' && p.ownerId===p.ownerId.trim() && OWNER.test(p.ownerId) &&
    typeof p.requestId==='string' && UUID.test(p.requestId) &&
    typeof p.imageSha256==='string' && SHA.test(p.imageSha256) &&
    p.quotaDayStart===day && p.quotaMonthStart===day.slice(0,7);
}
function methods(tx){
  return typeof tx?.bgCreditReservation?.findUnique==='function' &&
    typeof tx?.bgCreditReservation?.create==='function' &&
    typeof tx?.aiQuotaBucket?.findUnique==='function' &&
    typeof tx?.aiQuotaBucket?.updateMany==='function' &&
    typeof tx?.bgCreditBucket?.findUnique==='function' &&
    typeof tx?.bgCreditBucket?.updateMany==='function';
}
function validQuota(b,p,period,start){
  return b && typeof b.id==='string' && b.id.length>0 && b.ownerId===p.ownerId &&
    b.quotaKey==='AI_ACTION' && b.period===period && b.periodStart instanceof Date &&
    b.periodStart.getTime()===start.getTime() && whole(b.used) && whole(b.limitValue) &&
    b.limitValue>0 && b.used<=b.limitValue;
}
function validPool(b,period,key){
  return b && typeof b.id==='string' && b.id.length>0 &&
    b.scope==='POOL' && b.scopeId==='remove.bg' && b.period===period && b.periodKey===key &&
    whole(b.committed) && whole(b.ceiling) && b.ceiling>0 && b.committed<=b.ceiling;
}
/**
 * Caller MUST provide a server-created trusted preflight and explicit operator authorization.
 * DO NOT pass HTTP JSON as a preflight, or treat successful reservation as paid approval.
 * All four CAS updates + UUID idempotency insert commit/rollback as ONE Serializable unit.
 * NO automatic retry on serialization failures or unknown outcomes.
 */
export async function reserveRealBackgroundCredit({db,preflight,now=new Date(),ownerPaidConsent=false,operatorApproval=false}={}){
  if (ownerPaidConsent!==true || operatorApproval!==true) return blocked('PAYMENT_APPROVAL_REQUIRED');
  if (!candidateIsTrusted(preflight,now)) return blocked('UNTRUSTED_SERVER_PREFLIGHT');
  if (typeof db?.$transaction!=='function') return blocked('DATABASE_UNAVAILABLE');
  const day=utc(now), month=day.slice(0,7);
  const shared=[
    {period:'MONTH',start:new Date(month+'-01T00:00:00.000Z')},
    {period:'DAY',start:new Date(day+'T00:00:00.000Z')},
  ];
  const pool=[{period:'MONTH',key:month},{period:'DAY',key:day}];
  try {
    return await db.$transaction(async tx=>{
      if (!methods(tx)) deny('INCOMPLETE_DATABASE_ADAPTER');
      const prior=await tx.bgCreditReservation.findUnique({where:{requestId:preflight.requestId}});
      if (prior) deny('REQUEST_EXISTS_NO_RETRY');
      await tx.bgCreditReservation.create({data:{
        requestId:preflight.requestId, ownerId:preflight.ownerId,
        imageSha256:preflight.imageSha256, status:'RESERVED', creditsReserved:1,
        dispatchedAt:null, quotaDayStart:day, quotaMonthStart:month,
      }});
      for (const q of shared){
        const lookup={ownerId:preflight.ownerId,quotaKey:'AI_ACTION',period:q.period,periodStart:q.start};
        const current=await tx.aiQuotaBucket.findUnique({where:{ownerId_quotaKey_period_periodStart:lookup}});
        if (!validQuota(current,preflight,q.period,q.start)) deny('SHARED_QUOTA_MISSING_OR_INVALID');
        if (current.used>=current.limitValue) deny('SHARED_QUOTA_EXHAUSTED');
        const changed=await tx.aiQuotaBucket.updateMany({where:{
          id:current.id,ownerId:preflight.ownerId,quotaKey:'AI_ACTION',period:q.period,
          periodStart:q.start,used:current.used,limitValue:current.limitValue,
        },data:{used:{increment:1}}});
        if (changed?.count!==1) deny('SHARED_QUOTA_CONFLICT');
      }
      for (const v of pool){
        const lookup={scope:'POOL',scopeId:'remove.bg',period:v.period,periodKey:v.key};
        const current=await tx.bgCreditBucket.findUnique({where:{scope_scopeId_period_periodKey:lookup}});
        if (!validPool(current,v.period,v.key)) deny('VENDOR_POOL_MISSING_OR_INVALID');
        if (current.committed>=current.ceiling) deny('VENDOR_POOL_EXHAUSTED');
        const changed=await tx.bgCreditBucket.updateMany({where:{
          id:current.id,scope:'POOL',scopeId:'remove.bg',period:v.period,
          periodKey:v.key,committed:current.committed,ceiling:current.ceiling,
        },data:{committed:{increment:1}}});
        if (changed?.count!==1) deny('VENDOR_POOL_CONFLICT');
      }
      return ok(preflight.requestId);
    },{isolationLevel:'Serializable'});
  } catch(e){return blocked(e instanceof Denied?e.code:'TRANSACTION_UNCERTAIN_NO_RETRY');}
}

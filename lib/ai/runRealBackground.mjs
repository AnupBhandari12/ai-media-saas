/** Stage08: bounded opt-in server workflow. DOES NOT enable real paid calls by itself. */
import { assessBgRuntime } from './realBgRuntimePolicy.mjs';
import { prepareBackgroundRemovalSourceWithSharp } from './aiSharpDecoder.mjs';
import { reserveRealBackgroundCredit } from './realBgCreditReservation.mjs';
import { runRemoveBgProvider } from './aiRemoveBgProvider.mjs';
import { verifyBackgroundRemovalOutput } from './aiBackgroundOutput.mjs';
import { planBackgroundPrivateArtifact } from './aiBackgroundPrivateArtifact.mjs';
import { uploadRealBgPrivatePng,createRealBgB2Storage } from './realBgPrivateB2.mjs';
import { markBgDispatch,markBgUnknown,completeBgWithUniqueLedger } from './realBgPersistence.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const blocked=(reason,requestId)=>Object.freeze({outcome:'BLOCKED',reason,requestId});
const unknown=(requestId)=>Object.freeze({outcome:'UNKNOWN_NO_AUTO_RETRY',requestId});
export const BG_MAX_BETA_BYTES=2_000_000;
export async function runRealBackground({db,ownerId,requestId,imageBytes,mimeType,
  ownerPaidConsent=false,env=process.env,now=new Date(),vendor=runRemoveBgProvider,
  upload=uploadRealBgPrivatePng,storageFactory=createRealBgB2Storage}={}) {
  if (!assessBgRuntime(env).allowed) return blocked('PAID_BACKGROUND_DISABLED');
  if (!ownerPaidConsent || typeof ownerId!=='string'||ownerId.length<3||ownerId.length>200 ||
      ownerId!==ownerId.trim() || !UUID.test(requestId??'') ||
      !(imageBytes instanceof Uint8Array) || imageBytes.length<64 || imageBytes.length>BG_MAX_BETA_BYTES ||
      !['image/png','image/jpeg','image/webp'].includes(mimeType) ||
      !(now instanceof Date) || !Number.isFinite(now.getTime())) return blocked('INVALID_REQUEST_OR_CONSENT');
  // All image decoding occurs BEFORE quota or paid reserve.
  let prepared;
  try {
    prepared=await prepareBackgroundRemovalSourceWithSharp({ownerId,imageBytes,declaredMimeType:mimeType});
    if(prepared.width*prepared.height>4_000_000 || prepared.width>4096 || prepared.height>4096)
      return blocked('BETA_IMAGE_DIMENSIONS');
  }catch{return blocked('SOURCE_IMAGE_NOT_VALID');}
  // Validate B2 transport configuration BEFORE any quota or vendor-credit reservation.
  // Construction must be network-free; Stage07's adapter satisfies this requirement.
  let storage;
  try {storage=await storageFactory({env});} catch {
    return blocked('PRIVATE_STORAGE_UNAVAILABLE');
  }
  const day=now.toISOString().slice(0,10),month=day.slice(0,7);
  const preflight={status:'READY_FOR_ATOMIC_RESERVATION',ownerId,requestId,
    imageSha256:prepared.imageSha256,quotaDayStart:day,quotaMonthStart:month,
    requiredCredits:1,requiresDurableAtomicReservation:true,
    dispatchAllowed:false,atomicReservationCompleted:false};
  const reservation=await reserveRealBackgroundCredit({db,preflight,now,ownerPaidConsent:true,operatorApproval:true});
  if(reservation.outcome!=='RESERVED_NOT_DISPATCHABLE')
    return blocked(reservation.reason||'BUDGET_OR_QUOTA_DENIED',requestId);
  const marked=await markBgDispatch({db,ownerId,requestId,now:new Date()});
  if(!marked.ok) return unknown(requestId); // mark may have committed despite network failure
  try {
    const output=await vendor({imageBytes:prepared.imageBytes,mimeType:prepared.mimeType,
      width:prepared.width,height:prepared.height,serverDecoded:true,
      enabled:true,apiKey:env.REMOVE_BG_API_KEY});
    const verified=await verifyBackgroundRemovalOutput({preparedSource:prepared,providerResult:output});
    const plan=planBackgroundPrivateArtifact({authenticatedOwnerId:ownerId,requestId,
      preparedSource:prepared,verifiedOutput:verified});
    if(plan.status!=='PLAN_ONLY_NEVER_UPLOAD') throw Error('PLAN_INVALID');
    const rec=await db.bgCreditReservation.findUnique({where:{requestId}});
    if(!rec || rec.ownerId!==ownerId || rec.status!=='PROCESSING' ||
        rec.imageSha256!==prepared.imageSha256 || rec.creditsReserved!==1 ||
        !(rec.dispatchedAt instanceof Date)) throw Error('RESERVATION_INVALID');
    const stored=await upload({plan,verifiedOutput:verified,reservation:rec,storage,env});
    if(stored.status!=='STORED_VERIFIED_NEEDS_DB') throw Error('STORAGE_UNCERTAIN');
    const completed=await completeBgWithUniqueLedger({db,ownerId,requestId,stored});
    if(!completed.ok) throw Error('COMPLETION_UNCERTAIN');
    return Object.freeze({outcome:'COMPLETED',requestId,
      downloadUrl:'/api/ai/real/background/download?requestId='+encodeURIComponent(requestId),
      expiresAt:completed.expiresAt.toISOString()});
  }catch {
    await markBgUnknown({db,ownerId,requestId}); // best effort; retain vendor quota either way
    return unknown(requestId);
  }
}

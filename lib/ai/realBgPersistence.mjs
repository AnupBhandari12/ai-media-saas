/** Background credit state machine + unique DB-linked UsageEvent. Server-only.
 * Every write uses request UUID + Clerk owner + exact expected status.
 * No status transition automatically retries vendor dispatch or refunds credits.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const deny=(reason)=>Object.freeze({ok:false,reason});
const allowed=(ownerId,requestId)=>typeof ownerId==='string' && ownerId.trim()===ownerId &&
  ownerId.length>=3 && ownerId.length<=200 && UUID.test(requestId ?? '');
export async function markBgDispatch({db,ownerId,requestId,now=new Date()}={}) {
  if (!allowed(ownerId,requestId) || !(now instanceof Date) || !Number.isFinite(now.getTime())) return deny('INVALID_IDENTITY');
  try {
    const result=await db.bgCreditReservation.updateMany({where:{requestId,ownerId,status:'RESERVED',dispatchedAt:null},
      data:{status:'PROCESSING',dispatchedAt:now}});
    return result?.count===1 ? Object.freeze({ok:true,dispatchedAt:now}) : deny('NOT_NEW_RESERVED');
  }catch{return deny('DISPATCH_MARK_UNCERTAIN');}
}
export async function markBgUnknown({db,ownerId,requestId}={}) {
  if (!allowed(ownerId,requestId)) return deny('INVALID_IDENTITY');
  try {
    const result=await db.bgCreditReservation.updateMany({where:{requestId,ownerId,status:'PROCESSING'},data:{status:'UNKNOWN'}});
    return result?.count===1 ? Object.freeze({ok:true}) : deny('UNKNOWN_TRANSITION_UNCERTAIN');
  }catch{return deny('UNKNOWN_TRANSITION_UNCERTAIN');}
}
export async function completeBgWithUniqueLedger({db,ownerId,requestId,stored,now=new Date()}={}) {
  if (!allowed(ownerId,requestId) || !(now instanceof Date) || !Number.isFinite(now.getTime()) ||
      stored?.status!=='STORED_VERIFIED_NEEDS_DB' || stored.ownerId!==ownerId ||
      stored.requestId!==requestId || stored.uploaded!==true || stored.ledgerReconciled!==false ||
      !/^ai\/background\/private\/[0-9a-f-]{36}\/[a-f0-9]{64}\.png$/.test(stored.storageKey??'') ||
      !/^[a-f0-9]{64}$/.test(stored.originalSha256??'') ||
      !/^[a-f0-9]{64}$/.test(stored.outputSha256??'') ||
      !Number.isSafeInteger(stored.bytes) || stored.bytes<57 || stored.bytes>20971520 ||
      !Number.isSafeInteger(stored.width) || !Number.isSafeInteger(stored.height) ||
      stored.width<1 || stored.height<1 || stored.width*stored.height>8000000 ||
      typeof db?.$transaction!=='function') return deny('INVALID_STORED_OUTPUT');
  const expiresAt=new Date(now.getTime()+7*24*60*60*1000);
  try {
    return await db.$transaction(async tx=>{
      const rec=await tx.bgCreditReservation.findUnique({where:{requestId}});
      if (!rec || rec.ownerId!==ownerId || rec.status!=='PROCESSING' ||
          rec.creditsReserved!==1 || rec.imageSha256!==stored.originalSha256 ||
          !(rec.dispatchedAt instanceof Date)) throw Error('NO_PROCESSING_PROOF');
      const updated=await tx.bgCreditReservation.updateMany({where:{requestId,ownerId,status:'PROCESSING'},
        data:{status:'COMPLETED'}});
      if(updated?.count!==1) throw Error('CONCURRENT_TRANSITION');
      await tx.bgStoredAsset.create({data:{requestId,ownerId,status:'STORED_VERIFIED',
        storageKey:stored.storageKey,outputSha256:stored.outputSha256,
        originalSha256:stored.originalSha256,bytes:stored.bytes,
        width:stored.width,height:stored.height,expiresAt}});
      await tx.usageEvent.create({data:{ownerId,quotaKey:'AI_ACTION',units:1,
        toolId:'background-remover',bgCreditReservationId:requestId}});
      return Object.freeze({ok:true,requestId,expiresAt});
    },{isolationLevel:'Serializable'});
  }catch{return deny('DURABLE_COMPLETION_UNCERTAIN_NO_RETRY');}
}
export async function getBgDownloadProof({db,ownerId,requestId}={}) {
  if (!allowed(ownerId,requestId)) return null;
  try {
    const [asset,reservation,ledger]=await Promise.all([
      db.bgStoredAsset.findUnique({where:{requestId}}),
      db.bgCreditReservation.findUnique({where:{requestId}}),
      db.usageEvent.findUnique({where:{bgCreditReservationId:requestId}}),
    ]);
    if (!asset||!reservation||!ledger ||
        asset.ownerId!==ownerId || reservation.ownerId!==ownerId || ledger.ownerId!==ownerId ||
        ledger.bgCreditReservationId!==requestId || ledger.quotaKey!=='AI_ACTION' ||
        ledger.units!==1 || ledger.toolId!=='background-remover') return null;
    return Object.freeze({asset,reservation,
      ledgerProof:{ownerId:ledger.ownerId,requestId,quotaKey:ledger.quotaKey,
        units:ledger.units,status:'RECONCILED',storageKey:asset.storageKey}});
  }catch{return null;}
}

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { runRealBackground, BG_MAX_BETA_BYTES } from '@/lib/ai/runRealBackground.mjs';
import { assessBgRuntime } from '@/lib/ai/realBgRuntimePolicy.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(data,status)=>Response.json(data,{status,headers});
export async function POST(request){
  if(!assessBgRuntime(process.env).allowed)return reply({error:'Real background removal is disabled.'},503);
  const {userId,isAuthenticated}=await auth();
  if(!isAuthenticated || !userId)return reply({error:'Unauthorized'},401);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
  if(!/^multipart\/form-data;\s*boundary=/i.test(request.headers.get('content-type')||''))
    return reply({error:'Expected image upload'},415);
  const h=request.headers.get('content-length');const size=Number(h);
  if(!h || !Number.isSafeInteger(size) || size<64 || size>BG_MAX_BETA_BYTES+32768)
    return reply({error:'Upload size unsupported'},413);
  try{
    const form=await request.formData();
    if([...form.keys()].sort().join()!=='image,paidConsent,requestId' ||
      [...form.keys()].some(k=>form.getAll(k).length!==1))return reply({error:'Invalid fields'},400);
    const file=form.get('image'),id=form.get('requestId');
    if(!(file instanceof File) || file.size<64 || file.size>BG_MAX_BETA_BYTES ||
      !['image/png','image/jpeg','image/webp'].includes(file.type) ||
      form.get('paidConsent')!=='yes' || typeof id!=='string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      return reply({error:'Invalid image or approval'},400);
    const result=await runRealBackground({db:prisma,ownerId:userId,requestId:id,
      imageBytes:new Uint8Array(await file.arrayBuffer()),mimeType:file.type,
      ownerPaidConsent:true});
    if(result.outcome==='COMPLETED')return reply({requestId:result.requestId,
      downloadUrl:result.downloadUrl,expiresAt:result.expiresAt},200);
    if(result.outcome==='UNKNOWN_NO_AUTO_RETRY' || result.reason?.includes('REVIEW'))
      return reply({error:'Outcome requires manual review. Do not retry.',requestId:id},409);
    if(/QUOTA|POOL|BUDGET/.test(result.reason||''))return reply({error:'Quota or vendor-credit limit reached.'},429);
    return reply({error:'Background removal not available.',requestId:id},400);
  }catch{return reply({error:'Request rejected or outcome unknown. Review before retry.'},409);}
}

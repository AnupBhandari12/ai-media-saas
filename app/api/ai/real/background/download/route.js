import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { assessBgRead } from '@/lib/ai/realBgRuntimePolicy.mjs';
import { getBgDownloadProof } from '@/lib/ai/realBgPersistence.mjs';
import { readRealBgPrivatePng,createRealBgB2Storage } from '@/lib/ai/realBgPrivateB2.mjs';
export const dynamic='force-dynamic';export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(data,status)=>Response.json(data,{status,headers});
export async function GET(request){
  if(!assessBgRead(process.env).allowed)return reply({error:'Private downloads disabled'},503);
  const {userId,isAuthenticated}=await auth();
  if(!isAuthenticated||!userId)return reply({error:'Unauthorized'},401);
  const parsed=new URL(request.url);
  if([...parsed.searchParams.keys()].length!==1 || !parsed.searchParams.has('requestId'))
    return reply({error:'Invalid request'},400);
  const requestId=parsed.searchParams.get('requestId');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId||''))
    return reply({error:'Invalid request'},400);
  const proof=await getBgDownloadProof({db:prisma,ownerId:userId,requestId});
  if(!proof)return reply({error:'Not found'},404);
  let storage;
  try{storage=await createRealBgB2Storage();}catch{return reply({error:'Storage unavailable'},503);}
  const output=await readRealBgPrivatePng({ownerId:userId,...proof,storage});
  if(output.status!=='VERIFIED_PRIVATE_DOWNLOAD')return reply({error:'Private output unavailable'},404);
  return new Response(output.bytes,{status:200,headers:{...headers,
    'Content-Type':'image/png','Content-Disposition':output.contentDisposition,
    'Content-Length':String(output.bytes.length)}});
}

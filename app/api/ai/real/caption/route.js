import {auth} from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import {runRealCaption} from "@/lib/ai/runRealCaption.mjs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
function reply(body,status){return Response.json(body,{status,headers});}
export async function POST(request){
  // Operator gates are never accepted from client JSON. A missing flag denies BEFORE DB or network.
  if(process.env.AI_REAL_CAPTION_ENABLED!=="true" || process.env.AI_REAL_SPEND_APPROVED!=="true")
    return reply({error:"Real AI is not enabled."},503);
  if(typeof process.env.OPENAI_API_KEY!=="string" || !process.env.OPENAI_API_KEY.startsWith("sk-"))
    return reply({error:"AI provider is not configured."},503);
  const {userId,isAuthenticated}=await auth();
  if(!isAuthenticated||!userId)return reply({error:"Unauthorized"},401);
  if(request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Invalid origin"},403);
  if(!/application\/json/i.test(request.headers.get("content-type")||""))return reply({error:"JSON required"},415);
  const declared=Number(request.headers.get("content-length"));
  if(!Number.isSafeInteger(declared)||declared<1||declared>5000)return reply({error:"Invalid request length"},413);
  try{
    const body=JSON.parse(await request.text());
    if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).sort().join()!=="description,requestId")
      return reply({error:"Invalid caption request"},400);
    const result=await runRealCaption({prisma,ownerId:userId,idempotencyKey:body.requestId,
      description:body.description,apiKey:process.env.OPENAI_API_KEY});
    if(result.outcome==="COMPLETED")return reply({text:result.text,requestId:result.requestId,estimatedCostUsd:result.estimatedCostUsd},200);
    if(result.outcome==="QUOTA_EXCEEDED"||result.outcome==="SPEND_BUDGET_BLOCKED")return reply({error:"AI quota or approved budget exhausted."},429);
    // Includes UNKNOWN and EXISTING: never blindly redispatch on retry.
    return reply({error:"Request needs status review. Do not retry automatically.",requestId:result.requestId},409);
  }catch {return reply({error:"AI request rejected or requires review; no automatic retry."},400);}
}

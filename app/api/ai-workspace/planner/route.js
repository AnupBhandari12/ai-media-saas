import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { runRealWorkspacePlanner } from "@/lib/ai-workspace/runRealWorkspacePlanner.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = {"Cache-Control":"no-store", "X-Content-Type-Options":"nosniff"};
function reply(body,status) {return Response.json(body,{status,headers});}
function liveEnabled() {
  return process.env.AI_WORKSPACE_PLANNER_ENABLED === "true" &&
    process.env.AI_REAL_SPEND_APPROVED === "true";
}
export async function POST(request) {
  // Fail closed before DB/provider calls; client JSON may NOT turn on these flags.
  if (!liveEnabled()) return reply({error:"AI Workspace planner is disabled."},503);
  if (typeof process.env.OPENAI_API_KEY !== "string" || !process.env.OPENAI_API_KEY.startsWith("sk-")) {
    return reply({error:"AI provider is not configured."},503);
  }
  const {userId,isAuthenticated} = await auth();
  if (!isAuthenticated || !userId) return reply({error:"Unauthorized"},401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({error:"Invalid origin"},403);
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) {
    return reply({error:"JSON required"},415);
  }
  const length = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(length) || length < 1 || length > 2600) return reply({error:"Invalid request length"},413);
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength !== length) return reply({error:"Request length mismatch"},413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).sort().join() !== "approved,prompt,requestId" ||
        body.approved !== true || typeof body.prompt !== "string" ||
        typeof body.requestId !== "string") return reply({error:"Invalid planner request"},400);
    const result = await runRealWorkspacePlanner({prisma,ownerId:userId,idempotencyKey:body.requestId,
      prompt:body.prompt,apiKey:process.env.OPENAI_API_KEY});
    if (result.outcome === "COMPLETED") return reply({
      selection:result.selection,requestId:result.requestId,estimatedCostUsd:result.estimatedCostUsd,
    },200);
    if (result.outcome === "NEEDS_CLARIFICATION") return reply({
      selection:{kind:"NEEDS_CLARIFICATION",question:result.question},charged:false,
    },200);
    if (["QUOTA_EXCEEDED","SPEND_BUDGET_BLOCKED"].includes(result.outcome)) {
      return reply({error:"AI quota or approved budget exhausted."},429);
    }
    if (["PROVIDER_NOT_CONFIGURED"].includes(result.outcome)) return reply({error:"Provider unavailable"},503);
    return reply({error:"Request needs status review. Do not retry automatically.",requestId:result.requestId},409);
  } catch {
    return reply({error:"Planner request rejected or requires review; no automatic retry."},400);
  }
}

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { HISTORY_LIMIT, publicHistoryRecord, validateHistorySave } from "@/lib/ai-workspace/historyContract";
import { historyReply, readHistoryJson, validHistoryOrigin } from "@/lib/ai-workspace/historyHttp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function owner() {
  const { userId, isAuthenticated } = await auth();
  return isAuthenticated && typeof userId === "string" ? userId : null;
}

export async function GET() {
  const ownerId = await owner();
  if (!ownerId) return historyReply({ error: "Unauthorized" }, 401);
  try {
    const records = await prisma.workspaceHistory.findMany({
      where: { ownerId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: HISTORY_LIMIT,
      select: { id:true, prompt:true, workflowId:true, variantId:true, taskStatus:true, createdAt:true },
    });
    return historyReply({ records: records.map(publicHistoryRecord) });
  } catch {
    return historyReply({ error: "History is temporarily unavailable." }, 503);
  }
}

export async function POST(request) {
  const ownerId = await owner();
  if (!ownerId) return historyReply({ error: "Unauthorized" }, 401);
  if (!validHistoryOrigin(request)) return historyReply({ error: "Invalid origin." }, 403);
  let data;
  try { data = validateHistorySave(await readHistoryJson(request)); }
  catch { return historyReply({ error: "Invalid history details." }, 400); }
  try {
    // Per-user soft cap for beta; count/create isn't an exact concurrent quota ledger.
    const count = await prisma.workspaceHistory.count({ where: { ownerId } });
    if (count >= HISTORY_LIMIT) return historyReply({ error: "History limit reached. Delete a record first." }, 409);
    const created = await prisma.workspaceHistory.create({ data: { ownerId, ...data },
      select: { id:true, prompt:true, workflowId:true, variantId:true, taskStatus:true, createdAt:true },
    });
    return historyReply({ record: publicHistoryRecord(created) }, 201);
  } catch {
    return historyReply({ error: "History could not be saved." }, 503);
  }
}

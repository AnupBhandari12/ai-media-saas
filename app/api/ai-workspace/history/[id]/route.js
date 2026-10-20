import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { validHistoryId, validateHistoryPatch } from "@/lib/ai-workspace/historyContract";
import { historyReply, readHistoryJson, validHistoryOrigin } from "@/lib/ai-workspace/historyHttp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request, params) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) return { response: historyReply({ error: "Unauthorized" }, 401) };
  if (!validHistoryOrigin(request)) return { response: historyReply({ error: "Invalid origin." }, 403) };
  const { id } = await params;
  if (!validHistoryId(id)) return { response: historyReply({ error: "Invalid record ID." }, 400) };
  return { ownerId: userId, id };
}

export async function PATCH(request, { params }) {
  const guard = await authorize(request, params);
  if (guard.response) return guard.response;
  let data;
  try { data = validateHistoryPatch(await readHistoryJson(request)); }
  catch { return historyReply({ error: "Invalid status." }, 400); }
  try {
    const update = await prisma.workspaceHistory.updateMany({
      where: { id: guard.id, ownerId: guard.ownerId }, data,
    });
    if (update.count !== 1) return historyReply({ error: "Record not found." }, 404);
    return historyReply({ ok: true });
  } catch { return historyReply({ error: "Status update failed." }, 503); }
}

export async function DELETE(request, { params }) {
  const guard = await authorize(request, params);
  if (guard.response) return guard.response;
  try {
    const deleted = await prisma.workspaceHistory.deleteMany({
      where: { id: guard.id, ownerId: guard.ownerId },
    });
    if (deleted.count !== 1) return historyReply({ error: "Record not found." }, 404);
    return historyReply({ ok: true });
  } catch { return historyReply({ error: "Delete failed." }, 503); }
}

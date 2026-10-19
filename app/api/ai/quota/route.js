
import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import { getAiUsageSnapshot } from "@/lib/ai/aiUsageReader.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
    const { isAuthenticated, userId } = await auth();

    if (!isAuthenticated || !userId) {
        return Response.json(
            { error: "Unauthorized" },
            {
                status: 401,
                headers: { "Cache-Control": "no-store" },
            }
        );
    }

    try {
        const usage = await getAiUsageSnapshot({
            usageEvent: prisma.usageEvent,
            ownerId: userId,
        });

        return Response.json(
            {
                plan: "FREE_BETA",
                ...usage,
            },
            {
                headers: { "Cache-Control": "no-store" },
            }
        );
    } catch {
        return Response.json(
            { error: "Unable to load AI usage." },
            {
                status: 500,
                headers: { "Cache-Control": "no-store" },
            }
        );
    }
}

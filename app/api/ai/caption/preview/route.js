import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import { getAiUsageSnapshot } from "@/lib/ai/aiUsageReader.mjs";
import {
  handleLocalCaptionPreview,
  isLocalCaptionPreviewEnabled,
} from "@/lib/ai/aiCaptionPreview.mjs";

export const dynamic = "force-dynamic";

/**
 * Explicit opt-in, LOCAL DEVELOPMENT MOCK ONLY. No provider network call.
 * Never take a provider-enable flag from the JSON payload.
 */
export async function POST(request) {
  const enabled = isLocalCaptionPreviewEnabled({
    nodeEnv: process.env.NODE_ENV,
    flag: process.env.AI_CAPTION_MOCK_PREVIEW,
  });
  // Hard fail before doing even authentication work when not enabled.
  if (!enabled) {
    return Response.json({ error: "Not found." }, {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }

  try {
    const { isAuthenticated, userId } = await auth();
    const result = await handleLocalCaptionPreview({
      request,
      userId: isAuthenticated ? userId : null,
      enabled,
      readQuota: (ownerId) => getAiUsageSnapshot({
        aiQuotaBucket: prisma.aiQuotaBucket,
        ownerId,
      }),
    });
    return Response.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return Response.json({ error: "Unable to load mock caption preview." }, {
      status: 500,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}

import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import { getAiUsageSnapshot } from "@/lib/ai/aiUsageReader.mjs";
import {
  handleLocalAltTextPreview,
  isLocalAltTextPreviewEnabled,
} from "@/lib/ai/aiAltTextPreview.mjs";

export const dynamic = "force-dynamic";

/** Mock-only, development-only. No images, API secrets or writes cross this route. */
export async function POST(request) {
  const enabled = isLocalAltTextPreviewEnabled({
    nodeEnv: process.env.NODE_ENV,
    flag: process.env.AI_ALT_TEXT_MOCK_PREVIEW,
  });

  if (!enabled) {
    return Response.json({ error: "Not found." }, {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }

  try {
    const { isAuthenticated, userId } = await auth();
    const result = await handleLocalAltTextPreview({
      request,
      enabled,
      userId: isAuthenticated ? userId : null,
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
    return Response.json({ error: "Unable to load mock alt text preview." }, {
      status: 500,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}

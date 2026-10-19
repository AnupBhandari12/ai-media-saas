import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getAiUsageSnapshot } from '@/lib/ai/aiUsageReader.mjs';
import { prepareBackgroundRemovalSourceWithSharp } from '@/lib/ai/aiSharpDecoder.mjs';
import { handleLocalBackgroundInspect, isLocalBgInspectEnabled } from '@/lib/ai/aiBackgroundInspect.mjs';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const responseHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

/**
 * Local developer inspection ONLY. This route NEVER calls remove.bg, writes
 * Neon, uploads to storage, reserves quota, or enables the Remove button.
 * The 10G schema is review-only and MUST NOT be applied via this route.
 */
export async function POST(request) {
  let hostname = '';
  try { hostname = new URL(request.url).hostname; } catch { /* safely disabled */ }
  const enabled = isLocalBgInspectEnabled({
    nodeEnv: process.env.NODE_ENV,
    flag: process.env.AI_BG_LOCAL_INSPECT,
    host: hostname,
  });
  if (!enabled) return Response.json({ error: 'Not found.' }, { status: 404, headers: responseHeaders });
  try {
    const { isAuthenticated, userId } = await auth();
    const result = await handleLocalBackgroundInspect({
      request, userId: isAuthenticated ? userId : null, enabled,
      inspectImage: async ({ ownerId, imageBytes, declaredMimeType }) => {
        // A conservative developer-only memory ceiling, prior to full RGBA decode.
        // Metadata alone is not accepted: the 10C+10D contract fully decodes next.
        const info = await sharp(Buffer.from(imageBytes), {
          limitInputPixels: 4_000_000, pages: 1, failOn: 'warning',
        }).metadata();
        if (!Number.isSafeInteger(info.width) || !Number.isSafeInteger(info.height) ||
            info.width < 1 || info.height < 1 || info.width * info.height > 4_000_000 ||
            (info.pages ?? 1) !== 1) {
          throw new Error('Image too large or animated.');
        }
        return prepareBackgroundRemovalSourceWithSharp({ ownerId, imageBytes, declaredMimeType });
      },
      readQuota: (ownerId) => getAiUsageSnapshot({ aiQuotaBucket: prisma.aiQuotaBucket, ownerId }),
    });
    return Response.json(result.body, { status: result.status, headers: responseHeaders });
  } catch {
    return Response.json({ error: 'Unable to inspect image.' }, { status: 500, headers: responseHeaders });
  }
}

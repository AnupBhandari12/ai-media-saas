import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import {
  FREE_BETA_LIMITS,
  getCurrentMonthStart,
} from "@/lib/limits";

export async function GET() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const monthStart = getCurrentMonthStart();

  const [imagesUsed, videosUsed] = await Promise.all([
    prisma.media.count({
      where: {
        ownerId: userId,
        type: "IMAGE",
        createdAt: {
          gte: monthStart,
        },
      },
    }),

    prisma.media.count({
      where: {
        ownerId: userId,
        type: "VIDEO",
        createdAt: {
          gte: monthStart,
        },
      },
    }),
  ]);

  return Response.json({
    plan: "FREE_BETA",

    images: {
      used: imagesUsed,
      limit: FREE_BETA_LIMITS.imagesPerMonth,
      remaining: Math.max(
        FREE_BETA_LIMITS.imagesPerMonth - imagesUsed,
        0
      ),
    },

    videos: {
      used: videosUsed,
      limit: FREE_BETA_LIMITS.videosPerMonth,
      remaining: Math.max(
        FREE_BETA_LIMITS.videosPerMonth - videosUsed,
        0
      ),
    },
  });
}
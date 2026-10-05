import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

export async function POST(request) {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();

  const {
    originalFilename,
    cloudinaryPublicId,
    secureUrl,
    format,
    bytes,
    width,
    height,
  } = body;

  if (!originalFilename || !cloudinaryPublicId || !secureUrl) {
    return Response.json(
      { error: "Missing required media fields." },
      { status: 400 }
    );
  }

  const media = await prisma.media.create({
    data: {
      ownerId: userId,
      type: "IMAGE",
      status: "READY",

      originalFilename,
      cloudinaryPublicId,
      secureUrl,

      format: format || null,
      bytes: bytes || null,
      width: width || null,
      height: height || null,
    },
  });

  return Response.json(
    { media },
    { status: 201 }
  );
}
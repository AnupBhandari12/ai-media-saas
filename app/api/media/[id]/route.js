import { auth } from "@clerk/nextjs/server";

import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

export async function DELETE(request, { params }) {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const media = await prisma.media.findFirst({
    where: {
      id,
      ownerId: userId,
    },
  });

  if (!media) {
    return Response.json(
      { error: "Media not found." },
      { status: 404 }
    );
  }

  const resourceType =
    media.type === "VIDEO" ? "video" : "image";

  await cloudinary.uploader.destroy(
    media.cloudinaryPublicId,
    {
      resource_type: resourceType,
      invalidate: true,
    }
  );

  await prisma.media.delete({
    where: {
      id: media.id,
    },
  });

  return Response.json({
    success: true,
  });
}
import { auth } from "@clerk/nextjs/server";

import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";
import { createMediaSchema } from "@/lib/validation/media";

export async function POST(request) {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const validation = createMediaSchema.safeParse(body);

  if (!validation.success) {
    return Response.json(
      { error: "Invalid media data." },
      { status: 400 }
    );
  }

  const {
    type,
    originalFilename,
    cloudinaryPublicId,
  } = validation.data;

  const expectedFolder =
    type === "IMAGE"
      ? `ai-media/${userId}/images/`
      : `ai-media/${userId}/videos/`;

  if (!cloudinaryPublicId.startsWith(expectedFolder)) {
    return Response.json(
      { error: "Invalid media ownership." },
      { status: 400 }
    );
  }

  const resourceType =
    type === "VIDEO" ? "video" : "image";

  let cloudinaryResource;

  try {
    cloudinaryResource = await cloudinary.api.resource(
      cloudinaryPublicId,
      {
        resource_type: resourceType,
      }
    );
  } catch (error) {
    console.error("Cloudinary verification failed:", error);

    return Response.json(
      { error: "Uploaded media could not be verified." },
      { status: 400 }
    );
  }

  if (
    !cloudinaryResource ||
    cloudinaryResource.public_id !== cloudinaryPublicId
  ) {
    return Response.json(
      { error: "Uploaded media could not be verified." },
      { status: 400 }
    );
  }

  const media = await prisma.media.create({
    data: {
      ownerId: userId,
      type,
      status: "READY",

      originalFilename:
        cloudinaryResource.original_filename ||
        originalFilename,

      cloudinaryPublicId:
        cloudinaryResource.public_id,

      secureUrl:
        cloudinaryResource.secure_url,

      format:
        cloudinaryResource.format || null,

      bytes:
        cloudinaryResource.bytes ?? null,

      width:
        cloudinaryResource.width ?? null,

      height:
        cloudinaryResource.height ?? null,

      duration:
        cloudinaryResource.duration ?? null,
    },
  });

  return Response.json(
    { media },
    { status: 201 }
  );
}
import { auth } from "@clerk/nextjs/server";

import ImageUploader from "@/components/studio/ImageUploader";
import prisma from "@/lib/prisma";

export default async function ImageStudioPage() {
  const { userId } = await auth();

  const latestImage = userId
    ? await prisma.media.findFirst({
        where: {
          ownerId: userId,
          type: "IMAGE",
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    : null;

  const initialImage = latestImage
    ? {
        public_id: latestImage.cloudinaryPublicId,
        secure_url: latestImage.secureUrl,
        original_filename: latestImage.originalFilename,
        format: latestImage.format,
        bytes: latestImage.bytes,
        width: latestImage.width,
        height: latestImage.height,
      }
    : null;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Image Studio
        </h1>

        <p className="mt-2 text-muted">
          Upload an image and prepare it for smart optimization and social-ready
          transformations.
        </p>
      </div>

      <section className="mt-10 max-w-2xl">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Upload image
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted">
            JPG, PNG, WebP, or AVIF. Maximum file size: 10 MB.
          </p>

          <div className="mt-6">
            <ImageUploader initialImage={initialImage} />
          </div>
        </div>
      </section>
    </div>
  );
}
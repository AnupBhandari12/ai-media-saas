import { auth } from "@clerk/nextjs/server";

import VideoUploader from "@/components/studio/VideoUploader";
import prisma from "@/lib/prisma";

export default async function VideoStudioPage() {
  const { userId } = await auth();

  const latestVideo = userId
    ? await prisma.media.findFirst({
      where: {
        ownerId: userId,
        type: "VIDEO",
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    : null;

  const initialVideo = latestVideo
    ? {
      public_id: latestVideo.cloudinaryPublicId,
      secure_url: latestVideo.secureUrl,
      original_filename: latestVideo.originalFilename,
      format: latestVideo.format,
      bytes: latestVideo.bytes,
      width: latestVideo.width,
      height: latestVideo.height,
      duration: latestVideo.duration,
    }
    : null;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Video Studio
        </h1>

        <p className="mt-2 text-muted">
          Upload videos, optimize delivery, preview results, and reduce
          unnecessary file size.
        </p>
      </div>

      <section className="mt-10 max-w-2xl">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Upload video
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted">
            MP4, MOV, or WebM. Maximum file size: 50 MB.
          </p>

          <div className="mt-6">
            <VideoUploader
              initialVideo={initialVideo}
              uploadFolder={`ai-media/${userId}/videos`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
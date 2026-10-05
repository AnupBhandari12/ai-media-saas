import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import LibraryGrid from "@/components/library/LibraryGrid";

export default async function LibraryPage() {
  const { userId } = await auth();

  const media = userId
    ? await prisma.media.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    : [];

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Media Library
        </h1>

        <p className="mt-2 text-muted">
          Manage your uploaded images and videos in one place.
        </p>
      </div>

      <section className="mt-8">
        {media.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-medium text-foreground">
              No media yet
            </p>

            <p className="mt-2 text-sm text-muted">
              Upload an image or video and it will appear here.
            </p>
          </div>
        ) : (
          <LibraryGrid
            media={media.map((item) => ({
              id: item.id,
              type: item.type,
              status: item.status,
              originalFilename: item.originalFilename,
              cloudinaryPublicId: item.cloudinaryPublicId,
              secureUrl: item.secureUrl,
              format: item.format,
              bytes: item.bytes,
            }))}
          />
        )}
      </section>
    </div>
  );
}
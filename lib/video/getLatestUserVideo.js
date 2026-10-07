import prisma from "@/lib/prisma";

export async function getLatestUserVideo(
    userId
) {
    if (!userId) {
        return null;
    }

    const media =
        await prisma.media.findFirst({
            where: {
                ownerId: userId,
                type: "VIDEO",
                status: "READY",
            },

            orderBy: {
                createdAt: "desc",
            },
        });

    if (!media) {
        return null;
    }

    return {
        id: media.id,

        publicId:
            media.cloudinaryPublicId,

        secureUrl:
            media.secureUrl,

        filename:
            media.originalFilename,

        format:
            media.format,

        bytes:
            media.bytes,

        width:
            media.width,

        height:
            media.height,

        duration:
            media.duration,
    };
}
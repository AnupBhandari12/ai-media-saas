import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

export async function GET() {
    const {
        isAuthenticated,
        userId,
    } = await auth();

    if (
        !isAuthenticated ||
        !userId
    ) {
        return Response.json(
            {
                error:
                    "Unauthorized",
            },
            {
                status: 401,
            }
        );
    }

    const videos =
        await prisma.media.findMany({
            where: {
                ownerId:
                    userId,

                type:
                    "VIDEO",

                status:
                    "READY",
            },

            orderBy: {
                createdAt:
                    "desc",
            },

            take: 12,

            select: {
                id: true,

                originalFilename:
                    true,

                secureUrl:
                    true,

                format: true,

                bytes: true,

                width: true,

                height: true,

                duration: true,

                createdAt:
                    true,
            },
        });

    return Response.json({
        videos,
    });
}
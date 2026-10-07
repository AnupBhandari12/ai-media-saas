import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

import { videoTransformSchema } from "@/lib/validation/videoTransform";

import {
    createVideoTransformUrls,
    measureVideoUrl,
} from "@/lib/video/cloudinaryVideoTransform";

export async function POST(
    request
) {
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

    let body;

    try {
        body =
            await request.json();
    } catch {
        return Response.json(
            {
                error:
                    "Invalid JSON body.",
            },
            {
                status: 400,
            }
        );
    }

    const validation =
        videoTransformSchema.safeParse(
            body
        );

    if (
        !validation.success
    ) {
        return Response.json(
            {
                error:
                    "Invalid video transformation settings.",
            },
            {
                status: 400,
            }
        );
    }

    const data =
        validation.data;

    const media =
        await prisma.media.findFirst(
            {
                where: {
                    id:
                        data.mediaId,

                    ownerId:
                        userId,

                    type:
                        "VIDEO",

                    status:
                        "READY",
                },
            }
        );

    if (!media) {
        return Response.json(
            {
                error:
                    "Video not found.",
            },
            {
                status: 404,
            }
        );
    }

    if (
        data.operation ===
        "TRIM"
    ) {
        if (
            !media.duration ||
            media.duration <= 0
        ) {
            return Response.json(
                {
                    error:
                        "This video's duration is unavailable.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            data.start >=
            media.duration
        ) {
            return Response.json(
                {
                    error:
                        "Trim start time is outside the video.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            data.end >
            media.duration +
            0.05
        ) {
            return Response.json(
                {
                    error:
                        "Trim end time is outside the video.",
                },
                {
                    status: 400,
                }
            );
        }
    }

    const transformed =
        createVideoTransformUrls(
            media.cloudinaryPublicId,
            data
        );

    const outputBytes =
        await measureVideoUrl(
            transformed.playbackUrl
        );

    if (
        data.operation ===
        "COMPRESS" &&
        !outputBytes
    ) {
        return Response.json(
            {
                error:
                    "The compressed video was created, but its output size could not be measured. Please try again.",
            },
            {
                status: 502,
            }
        );
    }

    const originalBytes =
        media.bytes || null;

    let savedBytes = null;
    let savedPercent = null;

    if (
        originalBytes &&
        outputBytes
    ) {
        savedBytes =
            originalBytes -
            outputBytes;

        savedPercent =
            Math.round(
                (
                    savedBytes /
                    originalBytes
                ) *
                100
            );
    }

    return Response.json({
        result: {
            operation:
                data.operation,

            playbackUrl:
                transformed.playbackUrl,

            downloadUrl:
                transformed.downloadUrl,

            format:
                transformed.format,

            originalBytes,

            outputBytes,

            savedBytes,

            savedPercent,

            originalDuration:
                media.duration,

            outputDuration:
                transformed.resultDuration ??
                media.duration,

            width:
                media.width,

            height:
                media.height,

            originalFilename:
                media.originalFilename,
        },
    });
}
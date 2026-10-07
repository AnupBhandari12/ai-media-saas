import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

import {
    videoCutMergeSchema,
} from "@/lib/validation/videoCutMerge";

import {
    createCutSegmentUrls,
    createMergedVideoUrls,
} from "@/lib/video/videoCutMergeTransform";

import {
    measureRemoteUrl,
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
        videoCutMergeSchema.safeParse(
            body
        );

    if (
        !validation.success
    ) {
        return Response.json(
            {
                error:
                    "Invalid cut or merge settings.",
            },
            {
                status: 400,
            }
        );
    }

    const data =
        validation.data;

    if (
        data.operation ===
        "CUT_SEGMENT"
    ) {
        const media =
            await prisma.media.findFirst({
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
            });

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
            !media.duration ||
            media.duration <= 0
        ) {
            return Response.json(
                {
                    error:
                        "Video duration is unavailable.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            data.start >=
            media.duration ||
            data.end >
            media.duration +
            0.05
        ) {
            return Response.json(
                {
                    error:
                        "Selected segment is outside the video.",
                },
                {
                    status: 400,
                }
            );
        }

        try {
            const transformed =
                createCutSegmentUrls(
                    media,
                    data
                );

            const outputBytes =
                await measureRemoteUrl(
                    transformed.playbackUrl
                );

            return Response.json({
                result: {
                    operation:
                        "CUT_SEGMENT",

                    mode:
                        data.mode,

                    mediaKind:
                        "VIDEO",

                    playbackUrl:
                        transformed.playbackUrl,

                    downloadUrl:
                        transformed.downloadUrl,

                    format: "mp4",

                    originalBytes:
                        media.bytes,

                    outputBytes,

                    originalDuration:
                        media.duration,

                    outputDuration:
                        transformed.outputDuration,

                    width:
                        media.width,

                    height:
                        media.height,

                    cutStart:
                        data.start,

                    cutEnd:
                        data.end,

                    originalFilename:
                        media.originalFilename,
                },
            });
        } catch (
        error
        ) {
            return Response.json(
                {
                    error:
                        error instanceof
                            Error
                            ? error.message
                            : "Cut operation failed.",
                },
                {
                    status: 400,
                }
            );
        }
    }

    const uniqueIds =
        [
            ...new Set(
                data.mediaIds
            ),
        ];

    if (
        uniqueIds.length !==
        data.mediaIds.length
    ) {
        return Response.json(
            {
                error:
                    "Choose each video only once.",
            },
            {
                status: 400,
            }
        );
    }

    const videos =
        await prisma.media.findMany({
            where: {
                id: {
                    in:
                        data.mediaIds,
                },

                ownerId:
                    userId,

                type:
                    "VIDEO",

                status:
                    "READY",
            },
        });

    if (
        videos.length !==
        data.mediaIds.length
    ) {
        return Response.json(
            {
                error:
                    "One or more selected videos are unavailable.",
            },
            {
                status: 400,
            }
        );
    }

    const videoMap =
        new Map(
            videos.map(
                (video) => [
                    video.id,
                    video,
                ]
            )
        );

    const orderedVideos =
        data.mediaIds.map(
            (id) =>
                videoMap.get(id)
        );

    if (
        orderedVideos.some(
            (video) =>
                !video?.duration
        )
    ) {
        return Response.json(
            {
                error:
                    "All selected videos must have duration metadata.",
            },
            {
                status: 400,
            }
        );
    }

    try {
        const transformed =
            createMergedVideoUrls(
                orderedVideos
            );

        const outputBytes =
            await measureRemoteUrl(
                transformed.playbackUrl
            );

        return Response.json({
            result: {
                operation:
                    "MERGE",

                mediaKind:
                    "VIDEO",

                playbackUrl:
                    transformed.playbackUrl,

                downloadUrl:
                    transformed.downloadUrl,

                format: "mp4",

                originalBytes:
                    orderedVideos.reduce(
                        (
                            total,
                            video
                        ) =>
                            total +
                            (
                                video.bytes ||
                                0
                            ),
                        0
                    ),

                outputBytes,

                originalDuration:
                    transformed.outputDuration,

                outputDuration:
                    transformed.outputDuration,

                width:
                    transformed.width,

                height:
                    transformed.height,

                clipCount:
                    orderedVideos.length,

                filenames:
                    orderedVideos.map(
                        (video) =>
                            video.originalFilename
                    ),
            },
        });
    } catch (
    error
    ) {
        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Video merge failed.",
            },
            {
                status: 400,
            }
        );
    }
}
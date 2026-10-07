import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

import {
    videoTransformSchema,
} from "@/lib/validation/videoTransform";

import {
    createOriginalVideoUrls,
    createPreviewFallbackUrls,
    createVideoTransformUrls,
    findTargetCompressedVideo,
    measureRemoteUrl,
} from "@/lib/video/cloudinaryVideoTransform";

import {
    getSocialVideoPreset,
} from "@/lib/video/videoToolPresets";

function getOutputDimensions(
    media,
    data
) {
    if (
        data.operation ===
        "SOCIAL_RESIZE"
    ) {
        const preset =
            getSocialVideoPreset(
                data.preset
            );

        return {
            width:
                preset.width,

            height:
                preset.height,
        };
    }

    if (
        data.operation ===
        "ROTATE" &&
        (
            data.angle === 90 ||
            data.angle === 270
        )
    ) {
        return {
            width:
                media.height,

            height:
                media.width,
        };
    }

    if (
        data.operation ===
        "GIF"
    ) {
        const height =
            media.width &&
                media.height
                ? Math.round(
                    media.height *
                    (
                        data.width /
                        media.width
                    )
                )
                : null;

        return {
            width:
                data.width,

            height,
        };
    }

    if (
        data.operation ===
        "EXTRACT_AUDIO"
    ) {
        return {
            width: null,
            height: null,
        };
    }

    return {
        width:
            media.width,

        height:
            media.height,
    };
}

function requireDuration(
    media
) {
    return Boolean(
        media.duration &&
        media.duration > 0
    );
}

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
        data.operation ===
        "TRIM"
    ) {
        if (
            !requireDuration(media)
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

    if (
        data.operation ===
        "FRAME"
    ) {
        if (
            !requireDuration(media)
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
            data.time >
            media.duration
        ) {
            return Response.json(
                {
                    error:
                        "Selected frame time is outside the video.",
                },
                {
                    status: 400,
                }
            );
        }
    }

    if (
        data.operation ===
        "GIF"
    ) {
        if (
            !requireDuration(media)
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
            data.start +
            data.duration >
            media.duration +
            0.05
        ) {
            return Response.json(
                {
                    error:
                        "GIF range is outside the source video.",
                },
                {
                    status: 400,
                }
            );
        }
    }

    if (
        data.operation ===
        "SMART_PREVIEW" ||
        data.operation ===
        "TARGET_COMPRESS"
    ) {
        if (
            !requireDuration(media)
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
    }

    if (
        data.operation ===
        "TARGET_COMPRESS"
    ) {
        const targetBytes =
            Math.round(
                data.targetMb *
                1024 *
                1024
            );

        if (
            media.bytes &&
            media.bytes <=
            targetBytes
        ) {
            const original =
                createOriginalVideoUrls(
                    media.cloudinaryPublicId
                );

            return Response.json({
                result: {
                    operation:
                        data.operation,

                    mediaKind:
                        "VIDEO",

                    playbackUrl:
                        media.secureUrl,

                    downloadUrl:
                        original.downloadUrl,

                    format:
                        media.format ||
                        "mp4",

                    originalBytes:
                        media.bytes,

                    outputBytes:
                        media.bytes,

                    originalDuration:
                        media.duration,

                    outputDuration:
                        media.duration,

                    width:
                        media.width,

                    height:
                        media.height,

                    targetMb:
                        data.targetMb,

                    targetBytes,

                    targetReached:
                        true,

                    targetStatus:
                        "ALREADY_WITHIN_TARGET",

                    attempts: 0,

                    bitRate: null,

                    originalFilename:
                        media.originalFilename,
                },
            });
        }

        const compressed =
            await findTargetCompressedVideo(
                media.cloudinaryPublicId,
                {
                    duration:
                        media.duration,

                    targetBytes,
                }
            );

        if (!compressed) {
            return Response.json(
                {
                    error:
                        "Could not produce a measurable target-size result.",
                },
                {
                    status: 502,
                }
            );
        }

        return Response.json({
            result: {
                operation:
                    data.operation,

                mediaKind:
                    "VIDEO",

                playbackUrl:
                    compressed.playbackUrl,

                downloadUrl:
                    compressed.downloadUrl,

                format: "mp4",

                originalBytes:
                    media.bytes,

                outputBytes:
                    compressed.outputBytes,

                originalDuration:
                    media.duration,

                outputDuration:
                    media.duration,

                width:
                    media.width,

                height:
                    media.height,

                targetMb:
                    data.targetMb,

                targetBytes,

                targetReached:
                    compressed.targetReached,

                targetStatus:
                    compressed.targetReached
                        ? "REACHED"
                        : "CLOSEST_SAFE_RESULT",

                attempts:
                    compressed.attempts,

                bitRate:
                    compressed.bitRate,

                originalFilename:
                    media.originalFilename,
            },
        });
    }

    let transformed;

    try {
        transformed =
            createVideoTransformUrls(
                media.cloudinaryPublicId,
                data
            );
    } catch {
        return Response.json(
            {
                error:
                    "Could not create video transformation.",
            },
            {
                status: 400,
            }
        );
    }

    let outputBytes =
        await measureRemoteUrl(
            transformed.playbackUrl
        );

    let previewMode = null;

    if (
        data.operation ===
        "SMART_PREVIEW"
    ) {
        if (outputBytes) {
            previewMode =
                "AI_PREVIEW";
        } else {
            const previewDuration =
                Math.min(
                    data.duration,
                    media.duration
                );

            const fallbackStart =
                Math.max(
                    0,
                    (
                        media.duration -
                        previewDuration
                    ) /
                    2
                );

            transformed =
            {
                ...createPreviewFallbackUrls(
                    media.cloudinaryPublicId,
                    {
                        start:
                            fallbackStart,

                        duration:
                            previewDuration,
                    }
                ),

                mediaKind:
                    "VIDEO",

                resultDuration:
                    previewDuration,
            };

            outputBytes =
                await measureRemoteUrl(
                    transformed.playbackUrl
                );

            previewMode =
                "FALLBACK_CLIP";
        }
    }

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

    const dimensions =
        getOutputDimensions(
            media,
            data
        );

    const originalBytes =
        media.bytes || null;

    let savedBytes = null;
    let savedPercent = null;

    if (
        transformed.mediaKind ===
        "VIDEO" &&
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

    let outputDuration = null;

    if (
        transformed.mediaKind ===
        "VIDEO"
    ) {
        outputDuration =
            transformed.resultDuration ??
            media.duration;
    }

    if (
        transformed.mediaKind ===
        "AUDIO"
    ) {
        outputDuration =
            media.duration;
    }

    if (
        transformed.mediaKind ===
        "GIF"
    ) {
        outputDuration =
            data.duration;
    }

    return Response.json({
        result: {
            operation:
                data.operation,

            mediaKind:
                transformed.mediaKind,

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

            outputDuration,

            frameTime:
                data.operation ===
                    "FRAME"
                    ? data.time
                    : null,

            previewMode,

            width:
                dimensions.width,

            height:
                dimensions.height,

            originalFilename:
                media.originalFilename,
        },
    });
}
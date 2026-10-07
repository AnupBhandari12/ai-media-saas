import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

import {
    videoAdvancedTransformSchema,
} from "@/lib/validation/videoAdvancedTransform";

import {
    createCropVideoUrls,
    createWatermarkedVideoUrls,
} from "@/lib/video/videoAdvancedTransform";

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
        videoAdvancedTransformSchema.safeParse(
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

    try {
        if (
            data.operation ===
            "CROP"
        ) {
            const transformed =
                createCropVideoUrls(
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
                        "CROP",

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
                        media.duration,

                    width:
                        transformed.width,

                    height:
                        transformed.height,

                    cropX:
                        transformed.x,

                    cropY:
                        transformed.y,

                    originalFilename:
                        media.originalFilename,
                },
            });
        }

        const brandKit =
            await prisma.brandKit.findUnique({
                where: {
                    ownerId:
                        userId,
                },
            });

        if (
            data.type ===
            "LOGO" &&
            !brandKit
                ?.logoPublicId
        ) {
            return Response.json(
                {
                    error:
                        "Upload and save a Brand Kit logo first.",
                },
                {
                    status: 400,
                }
            );
        }

        const transformed =
            createWatermarkedVideoUrls(
                media,
                data,
                brandKit
            );

        const outputBytes =
            await measureRemoteUrl(
                transformed.playbackUrl
            );

        return Response.json({
            result: {
                operation:
                    "WATERMARK",

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
                    media.duration,

                width:
                    media.width,

                height:
                    media.height,

                watermarkType:
                    data.type,

                watermarkPosition:
                    data.position,

                originalFilename:
                    media.originalFilename,
            },
        });
    } catch (error) {
        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Video transformation failed.",
            },
            {
                status: 400,
            }
        );
    }
}
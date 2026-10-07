import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

import {
    videoSubtitleSchema,
} from "@/lib/validation/videoSubtitles";

import {
    cuesToVtt,
    transcriptToCues,
} from "@/lib/video/subtitleUtils";

import {
    createBurnedSubtitleUrls,
    fetchTranscriptJson,
    getTranscriptAsset,
    getTranscriptPublicId,
    requestVideoTranscription,
    uploadReviewedVtt,
} from "@/lib/video/cloudinarySubtitles";

import {
    measureRemoteUrl,
} from "@/lib/video/cloudinaryVideoTransform";

async function getOwnedVideo(
    userId,
    mediaId
) {
    return prisma.media.findFirst({
        where: {
            id: mediaId,

            ownerId:
                userId,

            type:
                "VIDEO",

            status:
                "READY",
        },
    });
}

async function loadTranscriptResult(
    media
) {
    const asset =
        await getTranscriptAsset(
            media.cloudinaryPublicId
        );

    if (!asset) {
        return null;
    }

    const payload =
        await fetchTranscriptJson(
            asset.secure_url
        );

    const cues =
        transcriptToCues(
            payload
        );

    return {
        transcriptPublicId:
            asset.public_id,

        transcriptUrl:
            asset.secure_url,

        cues,
    };
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
        videoSubtitleSchema.safeParse(
            body
        );

    if (
        !validation.success
    ) {
        return Response.json(
            {
                error:
                    "Invalid subtitle request.",
            },
            {
                status: 400,
            }
        );
    }

    const data =
        validation.data;

    if (
        data.action ===
        "START"
    ) {
        const media =
            await getOwnedVideo(
                userId,
                data.mediaId
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
            media.duration >
            600
        ) {
            return Response.json(
                {
                    error:
                        "Free beta auto subtitles currently supports videos up to 10 minutes.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !data.regenerate
        ) {
            const existing =
                await loadTranscriptResult(
                    media
                );

            if (existing) {
                const job =
                    await prisma.processingJob.create({
                        data: {
                            ownerId:
                                userId,

                            toolId:
                                "VID-15",

                            status:
                                "COMPLETED",

                            progress:
                                100,

                            inputRefs: {
                                mediaId:
                                    media.id,

                                language:
                                    data.language,
                            },

                            resultRefs: {
                                transcriptPublicId:
                                    existing.transcriptPublicId,

                                transcriptUrl:
                                    existing.transcriptUrl,
                            },

                            startedAt:
                                new Date(),

                            completedAt:
                                new Date(),
                        },
                    });

                return Response.json({
                    jobId:
                        job.id,

                    status:
                        "COMPLETED",

                    cues:
                        existing.cues,

                    transcriptUrl:
                        existing.transcriptUrl,
                });
            }
        }

        const job =
            await prisma.processingJob.create({
                data: {
                    ownerId:
                        userId,

                    toolId:
                        "VID-15",

                    status:
                        "PENDING",

                    progress: 5,

                    inputRefs: {
                        mediaId:
                            media.id,

                        language:
                            data.language,

                        transcriptPublicId:
                            getTranscriptPublicId(
                                media.cloudinaryPublicId
                            ),
                    },

                    startedAt:
                        new Date(),
                },
            });

        try {
            await requestVideoTranscription(
                media,
                data.language
            );

            await prisma.processingJob.update({
                where: {
                    id:
                        job.id,
                },

                data: {
                    status:
                        "PROCESSING",

                    progress: 20,
                },
            });

            await prisma.usageEvent.create({
                data: {
                    ownerId:
                        userId,

                    quotaKey:
                        "AI_VIDEO_TOOL",

                    units: 1,

                    toolId:
                        "VID-15",

                    jobId:
                        job.id,
                },
            });

            return Response.json({
                jobId:
                    job.id,

                status:
                    "PROCESSING",
            });
        } catch {
            await prisma.processingJob.update({
                where: {
                    id:
                        job.id,
                },

                data: {
                    status:
                        "FAILED",

                    progress: 0,

                    errorCode:
                        "TRANSCRIPTION_START_FAILED",

                    errorMessage:
                        "Cloudinary Auto Transcription could not start.",
                },
            });

            return Response.json(
                {
                    error:
                        "Auto Transcription could not start. Check that Cloudinary transcription is available for your product environment.",
                },
                {
                    status: 400,
                }
            );
        }
    }

    if (
        data.action ===
        "STATUS"
    ) {
        const job =
            await prisma.processingJob.findFirst({
                where: {
                    id:
                        data.jobId,

                    ownerId:
                        userId,

                    toolId:
                        "VID-15",
                },
            });

        if (!job) {
            return Response.json(
                {
                    error:
                        "Subtitle job not found.",
                },
                {
                    status: 404,
                }
            );
        }

        if (
            job.status ===
            "FAILED"
        ) {
            return Response.json(
                {
                    error:
                        job.errorMessage ||
                        "Subtitle generation failed.",
                },
                {
                    status: 400,
                }
            );
        }

        const refs =
            job.inputRefs &&
                typeof job.inputRefs ===
                "object"
                ? job.inputRefs
                : {};

        const mediaId =
            refs.mediaId;

        const media =
            await getOwnedVideo(
                userId,
                mediaId
            );

        if (!media) {
            return Response.json(
                {
                    error:
                        "Source video not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const completed =
            await loadTranscriptResult(
                media
            );

        if (!completed) {
            return Response.json({
                jobId:
                    job.id,

                status:
                    "PROCESSING",

                progress:
                    Math.max(
                        job.progress,
                        35
                    ),
            });
        }

        await prisma.processingJob.update({
            where: {
                id:
                    job.id,
            },

            data: {
                status:
                    "COMPLETED",

                progress: 100,

                completedAt:
                    new Date(),

                resultRefs: {
                    transcriptPublicId:
                        completed.transcriptPublicId,

                    transcriptUrl:
                        completed.transcriptUrl,
                },
            },
        });

        return Response.json({
            jobId:
                job.id,

            status:
                "COMPLETED",

            cues:
                completed.cues,

            transcriptUrl:
                completed.transcriptUrl,
        });
    }

    const media =
        await getOwnedVideo(
            userId,
            data.mediaId
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

    const job =
        await prisma.processingJob.findFirst({
            where: {
                id:
                    data.jobId,

                ownerId:
                    userId,

                toolId:
                    "VID-15",
            },
        });

    if (!job) {
        return Response.json(
            {
                error:
                    "Subtitle job not found.",
            },
            {
                status: 404,
            }
        );
    }

    try {
        const vtt =
            cuesToVtt(
                data.cues
            );

        const uploaded =
            await uploadReviewedVtt({
                ownerId:
                    userId,

                mediaId:
                    media.id,

                jobId:
                    job.id,

                content:
                    vtt,
            });

        const transformed =
            createBurnedSubtitleUrls(
                media,
                uploaded.public_id,
                data.style
            );

        const outputBytes =
            await measureRemoteUrl(
                transformed.playbackUrl
            );

        const previousRefs =
            job.resultRefs &&
                typeof job.resultRefs ===
                "object"
                ? job.resultRefs
                : {};

        await prisma.processingJob.update({
            where: {
                id:
                    job.id,
            },

            data: {
                resultRefs: {
                    ...previousRefs,

                    reviewedVttPublicId:
                        uploaded.public_id,

                    reviewedVttUrl:
                        uploaded.secure_url,

                    burnedVideoUrl:
                        transformed.playbackUrl,
                },
            },
        });

        return Response.json({
            result: {
                operation:
                    "AUTO_SUBTITLES",

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

                captionCount:
                    data.cues.length,

                subtitleUrl:
                    uploaded.secure_url,

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
                        : "Subtitle burn-in failed.",
            },
            {
                status: 400,
            }
        );
    }
}
import cloudinary from "@/lib/cloudinary";

import {
    getSocialVideoPreset,
} from "@/lib/video/videoToolPresets";

const COMPRESS_QUALITY = {
    SMALL: "auto:eco",
    BALANCED: "auto:good",
    QUALITY: "auto:best",
};

const AUDIO_BITRATES = {
    SMALL: 96000,
    BALANCED: 128000,
    HIGH: 192000,
};

const GRAVITY_MAP = {
    CENTER: "center",
    NORTH: "north",
    SOUTH: "south",
    WEST: "west",
    EAST: "east",
};

function buildUrls(
    publicId,
    {
        format,
        transformations,
    }
) {
    const common = {
        resource_type:
            "video",

        secure: true,

        format,
    };

    const playbackUrl =
        cloudinary.url(
            publicId,
            {
                ...common,

                transformation:
                    transformations,
            }
        );

    const downloadUrl =
        cloudinary.url(
            publicId,
            {
                ...common,

                transformation: [
                    ...transformations,

                    {
                        flags:
                            "attachment",
                    },
                ],
            }
        );

    return {
        playbackUrl,
        downloadUrl,
        format,
    };
}

function getTransformConfig(
    data
) {
    if (
        data.operation ===
        "COMPRESS"
    ) {
        return {
            format: "mp4",

            transformations: [
                {
                    quality:
                        COMPRESS_QUALITY[
                        data.preset
                        ],
                },
            ],

            resultDuration:
                null,

            mediaKind:
                "VIDEO",
        };
    }

    if (
        data.operation ===
        "CONVERT"
    ) {
        return {
            format:
                data.format,

            transformations: [
                {
                    quality:
                        "auto:good",
                },
            ],

            resultDuration:
                null,

            mediaKind:
                "VIDEO",
        };
    }

    if (
        data.operation ===
        "TRIM"
    ) {
        return {
            format: "mp4",

            transformations: [
                {
                    start_offset:
                        data.start,

                    end_offset:
                        data.end,

                    quality:
                        "auto:good",
                },
            ],

            resultDuration:
                data.end -
                data.start,

            mediaKind:
                "VIDEO",
        };
    }

    if (
        data.operation ===
        "SOCIAL_RESIZE"
    ) {
        const preset =
            getSocialVideoPreset(
                data.preset
            );

        const resize =
            data.mode === "FIT"
                ? {
                    width:
                        preset.width,

                    height:
                        preset.height,

                    crop: "pad",

                    background:
                        "black",
                }
                : {
                    width:
                        preset.width,

                    height:
                        preset.height,

                    crop: "fill",

                    gravity:
                        GRAVITY_MAP[
                        data.gravity
                        ] || "center",
                };

        return {
            format: "mp4",

            transformations: [
                {
                    ...resize,

                    quality:
                        "auto:good",
                },
            ],

            resultDuration:
                null,

            mediaKind:
                "VIDEO",
        };
    }

    if (
        data.operation ===
        "ROTATE"
    ) {
        return {
            format: "mp4",

            transformations: [
                {
                    angle:
                        data.angle,

                    quality:
                        "auto:good",
                },
            ],

            resultDuration:
                null,

            mediaKind:
                "VIDEO",
        };
    }

    if (
        data.operation ===
        "MUTE"
    ) {
        return {
            format: "mp4",

            transformations: [
                {
                    audio_codec:
                        "none",

                    quality:
                        "auto:good",
                },
            ],

            resultDuration:
                null,

            mediaKind:
                "VIDEO",
        };
    }

    if (
        data.operation ===
        "EXTRACT_AUDIO"
    ) {
        return {
            format:
                data.format,

            transformations: [
                {
                    video_codec:
                        "none",

                    bit_rate:
                        AUDIO_BITRATES[
                        data.quality
                        ],
                },
            ],

            resultDuration:
                null,

            mediaKind:
                "AUDIO",
        };
    }

    if (
        data.operation ===
        "FRAME"
    ) {
        return {
            format:
                data.format,

            transformations: [
                {
                    start_offset:
                        data.time,
                },

                {
                    quality:
                        "auto:good",
                },
            ],

            resultDuration:
                null,

            mediaKind:
                "IMAGE",
        };
    }

    if (
        data.operation ===
        "GIF"
    ) {
        return {
            format: "gif",

            transformations: [
                {
                    start_offset:
                        data.start,

                    duration:
                        data.duration,
                },

                {
                    width:
                        data.width,

                    crop:
                        "scale",

                    fps:
                        data.fps,
                },

                {
                    effect:
                        "loop",
                },
            ],

            resultDuration:
                data.duration,

            mediaKind:
                "GIF",
        };
    }

    if (
        data.operation ===
        "SMART_PREVIEW"
    ) {
        return {
            format: "mp4",

            transformations: [
                {
                    effect:
                        `preview:duration_${data.duration}`,
                },

                {
                    quality:
                        "auto:good",
                },
            ],

            resultDuration:
                data.duration,

            mediaKind:
                "VIDEO",
        };
    }

    throw new Error(
        "Unsupported video transformation."
    );
}

export function createVideoTransformUrls(
    publicId,
    data
) {
    const config =
        getTransformConfig(
            data
        );

    return {
        ...buildUrls(
            publicId,
            config
        ),

        resultDuration:
            config.resultDuration,

        mediaKind:
            config.mediaKind,
    };
}

export function createTargetCompressionUrls(
    publicId,
    bitRate
) {
    return buildUrls(
        publicId,
        {
            format: "mp4",

            transformations: [
                {
                    video_codec:
                        "h264",

                    audio_codec:
                        "aac",

                    bit_rate:
                        bitRate,
                },
            ],
        }
    );
}

export function createOriginalVideoUrls(
    publicId
) {
    return buildUrls(
        publicId,
        {
            format: "mp4",

            transformations: [],
        }
    );
}

export function createPreviewFallbackUrls(
    publicId,
    {
        start,
        duration,
    }
) {
    return buildUrls(
        publicId,
        {
            format: "mp4",

            transformations: [
                {
                    start_offset:
                        start,

                    duration,
                },

                {
                    quality:
                        "auto:good",
                },
            ],
        }
    );
}

export async function measureRemoteUrl(
    url
) {
    try {
        const headResponse =
            await fetch(url, {
                method: "HEAD",
                cache: "no-store",
            });

        if (
            headResponse.ok
        ) {
            const headLength =
                Number(
                    headResponse.headers.get(
                        "content-length"
                    )
                );

            await headResponse.body?.cancel();

            if (
                Number.isFinite(
                    headLength
                ) &&
                headLength > 0
            ) {
                return headLength;
            }
        }
    } catch {
        // Try range request.
    }

    try {
        const response =
            await fetch(url, {
                method: "GET",

                headers: {
                    Range:
                        "bytes=0-0",
                },

                cache:
                    "no-store",
            });

        if (
            !response.ok &&
            response.status !== 206
        ) {
            await response.body?.cancel();

            return null;
        }

        const contentRange =
            response.headers.get(
                "content-range"
            );

        const contentLength =
            response.headers.get(
                "content-length"
            );

        await response.body?.cancel();

        if (contentRange) {
            const match =
                contentRange.match(
                    /\/(\d+)$/
                );

            if (match) {
                const total =
                    Number(match[1]);

                if (
                    Number.isFinite(
                        total
                    ) &&
                    total > 0
                ) {
                    return total;
                }
            }
        }

        const length =
            Number(
                contentLength
            );

        if (
            Number.isFinite(
                length
            ) &&
            length > 0
        ) {
            return length;
        }
    } catch {
        return null;
    }

    return null;
}

function clampBitRate(
    value
) {
    return Math.min(
        5_000_000,
        Math.max(
            64_000,
            Math.round(value)
        )
    );
}

export async function findTargetCompressedVideo(
    publicId,
    {
        duration,
        targetBytes,
    }
) {
    const targetBitsPerSecond =
        (
            targetBytes *
            8
        ) /
        duration;

    let bitRate =
        clampBitRate(
            targetBitsPerSecond *
            0.45
        );

    let bestSafe = null;
    let bestOverall = null;

    const tried =
        new Set();

    let attempts = 0;

    for (
        let index = 0;
        index < 3;
        index += 1
    ) {
        if (
            tried.has(bitRate)
        ) {
            break;
        }

        tried.add(bitRate);

        attempts += 1;

        const urls =
            createTargetCompressionUrls(
                publicId,
                bitRate
            );

        const outputBytes =
            await measureRemoteUrl(
                urls.playbackUrl
            );

        if (!outputBytes) {
            bitRate =
                clampBitRate(
                    bitRate * 0.7
                );

            continue;
        }

        const candidate = {
            ...urls,

            outputBytes,

            bitRate,
        };

        const difference =
            Math.abs(
                outputBytes -
                targetBytes
            );

        if (
            !bestOverall ||
            difference <
            bestOverall.difference
        ) {
            bestOverall = {
                ...candidate,

                difference,
            };
        }

        if (
            outputBytes <=
            targetBytes
        ) {
            if (
                !bestSafe ||
                outputBytes >
                bestSafe.outputBytes
            ) {
                bestSafe =
                    candidate;
            }
        }

        const ratio =
            targetBytes /
            outputBytes;

        const nextBitRate =
            clampBitRate(
                bitRate *
                ratio *
                0.96
            );

        if (
            Math.abs(
                nextBitRate -
                bitRate
            ) < 8000
        ) {
            break;
        }

        bitRate =
            nextBitRate;
    }

    const selected =
        bestSafe ||
        bestOverall;

    if (!selected) {
        return null;
    }

    return {
        ...selected,

        targetReached:
            selected.outputBytes <=
            targetBytes,

        attempts,
    };
}

export const measureVideoUrl =
    measureRemoteUrl;
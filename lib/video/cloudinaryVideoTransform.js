import cloudinary from "@/lib/cloudinary";

import {
    getSocialVideoPreset,
} from "@/lib/video/videoToolPresets";

const COMPRESS_QUALITY = {
    SMALL: "auto:eco",
    BALANCED:
        "auto:good",
    QUALITY:
        "auto:best",
};

const GRAVITY_MAP = {
    CENTER: "center",
    NORTH: "north",
    SOUTH: "south",
    WEST: "west",
    EAST: "east",
};

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
            data.mode ===
                "FIT"
                ? {
                    width:
                        preset.width,

                    height:
                        preset.height,

                    crop:
                        "pad",

                    background:
                        "black",
                }
                : {
                    width:
                        preset.width,

                    height:
                        preset.height,

                    crop:
                        "fill",

                    gravity:
                        GRAVITY_MAP[
                        data.gravity
                        ] ||
                        "center",
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

    const common = {
        resource_type:
            "video",

        secure: true,

        format:
            config.format,
    };

    const playbackUrl =
        cloudinary.url(
            publicId,
            {
                ...common,

                transformation:
                    config.transformations,
            }
        );

    const downloadUrl =
        cloudinary.url(
            publicId,
            {
                ...common,

                transformation: [
                    ...config.transformations,

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

        format:
            config.format,

        resultDuration:
            config.resultDuration,

        mediaKind:
            config.mediaKind,
    };
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
            response.status !==
            206
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
                    Number(
                        match[1]
                    );

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

export const measureVideoUrl =
    measureRemoteUrl;
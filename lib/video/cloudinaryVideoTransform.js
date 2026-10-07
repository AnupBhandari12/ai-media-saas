import cloudinary from "@/lib/cloudinary";

const COMPRESS_QUALITY = {
    SMALL: "auto:eco",
    BALANCED: "auto:good",
    QUALITY: "auto:best",
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
        };
    }

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
    };
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
    };
}

export async function measureVideoUrl(
    url
) {
    try {
        const headResponse =
            await fetch(url, {
                method: "HEAD",

                cache:
                    "no-store",
            });

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
    } catch {
        // Try a range request next.
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
import cloudinary from "@/lib/cloudinary";

function videoOverlayId(
    publicId
) {
    return `video:${publicId.replaceAll(
        "/",
        ":"
    )}`;
}

function buildVideoUrls(
    publicId,
    transformations
) {
    const common = {
        resource_type:
            "video",

        secure: true,

        format: "mp4",
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
    };
}

export function createCutSegmentUrls(
    media,
    settings
) {
    if (
        settings.mode ===
        "KEEP"
    ) {
        const urls =
            buildVideoUrls(
                media.cloudinaryPublicId,
                [
                    {
                        start_offset:
                            settings.start,

                        end_offset:
                            settings.end,
                    },

                    {
                        video_codec:
                            "h264",

                        audio_codec:
                            "aac",

                        quality:
                            "auto:good",
                    },
                ]
            );

        return {
            ...urls,

            outputDuration:
                settings.end -
                settings.start,
        };
    }

    const beforeDuration =
        settings.start;

    const afterDuration =
        media.duration -
        settings.end;

    if (
        beforeDuration <= 0
    ) {
        const urls =
            buildVideoUrls(
                media.cloudinaryPublicId,
                [
                    {
                        start_offset:
                            settings.end,
                    },

                    {
                        video_codec:
                            "h264",

                        audio_codec:
                            "aac",

                        quality:
                            "auto:good",
                    },
                ]
            );

        return {
            ...urls,

            outputDuration:
                afterDuration,
        };
    }

    if (
        afterDuration <= 0
    ) {
        const urls =
            buildVideoUrls(
                media.cloudinaryPublicId,
                [
                    {
                        end_offset:
                            settings.start,
                    },

                    {
                        video_codec:
                            "h264",

                        audio_codec:
                            "aac",

                        quality:
                            "auto:good",
                    },
                ]
            );

        return {
            ...urls,

            outputDuration:
                beforeDuration,
        };
    }

    const overlayId =
        videoOverlayId(
            media.cloudinaryPublicId
        );

    const urls =
        buildVideoUrls(
            media.cloudinaryPublicId,
            [
                {
                    start_offset: 0,

                    end_offset:
                        settings.start,
                },

                {
                    overlay:
                        overlayId,

                    flags:
                        "splice",
                },

                {
                    start_offset:
                        settings.end,
                },

                {
                    flags:
                        "layer_apply",
                },

                {
                    video_codec:
                        "h264",

                    audio_codec:
                        "aac",

                    quality:
                        "auto:good",
                },
            ]
        );

    return {
        ...urls,

        outputDuration:
            beforeDuration +
            afterDuration,
    };
}

export function createMergedVideoUrls(
    mediaItems
) {
    if (
        mediaItems.length < 2
    ) {
        throw new Error(
            "At least two videos are required."
        );
    }

    const base =
        mediaItems[0];

    const width =
        Number(
            base.width
        ) || 1280;

    const height =
        Number(
            base.height
        ) || 720;

    const transformations = [
        {
            width,
            height,

            crop: "pad",

            background:
                "black",
        },
    ];

    for (
        const media of
        mediaItems.slice(1)
    ) {
        transformations.push(
            {
                overlay:
                    videoOverlayId(
                        media.cloudinaryPublicId
                    ),

                flags:
                    "splice",
            },

            {
                width,
                height,

                crop: "pad",

                background:
                    "black",
            },

            {
                flags:
                    "layer_apply",
            }
        );
    }

    transformations.push({
        video_codec:
            "h264",

        audio_codec:
            "aac",

        quality:
            "auto:good",
    });

    const urls =
        buildVideoUrls(
            base.cloudinaryPublicId,
            transformations
        );

    const outputDuration =
        mediaItems.reduce(
            (total, media) =>
                total +
                (
                    Number(
                        media.duration
                    ) || 0
                ),
            0
        );

    return {
        ...urls,

        width,
        height,

        outputDuration,
    };
}
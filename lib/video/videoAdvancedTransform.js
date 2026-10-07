import cloudinary from "@/lib/cloudinary";

const GRAVITY_MAP = {
    TOP_LEFT:
        "north_west",

    TOP_CENTER:
        "north",

    TOP_RIGHT:
        "north_east",

    CENTER:
        "center",

    BOTTOM_LEFT:
        "south_west",

    BOTTOM_CENTER:
        "south",

    BOTTOM_RIGHT:
        "south_east",
};

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

export function calculateCropPixels(
    media,
    settings
) {
    const sourceWidth =
        Number(media.width);

    const sourceHeight =
        Number(media.height);

    if (
        !sourceWidth ||
        !sourceHeight
    ) {
        throw new Error(
            "Video dimensions are unavailable."
        );
    }

    const x =
        Math.round(
            sourceWidth *
            (
                settings.left /
                100
            )
        );

    const y =
        Math.round(
            sourceHeight *
            (
                settings.top /
                100
            )
        );

    const width =
        Math.max(
            2,
            Math.round(
                sourceWidth *
                (
                    settings.width /
                    100
                )
            )
        );

    const height =
        Math.max(
            2,
            Math.round(
                sourceHeight *
                (
                    settings.height /
                    100
                )
            )
        );

    return {
        x,
        y,

        width:
            Math.min(
                width,
                sourceWidth - x
            ),

        height:
            Math.min(
                height,
                sourceHeight - y
            ),
    };
}

export function createCropVideoUrls(
    media,
    settings
) {
    const crop =
        calculateCropPixels(
            media,
            settings
        );

    const urls =
        buildVideoUrls(
            media.cloudinaryPublicId,
            [
                {
                    width:
                        crop.width,

                    height:
                        crop.height,

                    crop: "crop",

                    gravity:
                        "north_west",

                    x: crop.x,

                    y: crop.y,
                },

                {
                    quality:
                        "auto:good",
                },
            ]
        );

    return {
        ...urls,

        width:
            crop.width,

        height:
            crop.height,

        x:
            crop.x,

        y:
            crop.y,
    };
}

export function createWatermarkedVideoUrls(
    media,
    settings,
    brandKit
) {
    const sourceWidth =
        Number(
            media.width
        ) || 1280;

    const sourceHeight =
        Number(
            media.height
        ) || 720;

    const minimumSide =
        Math.min(
            sourceWidth,
            sourceHeight
        );

    const margin =
        Math.max(
            12,
            Math.round(
                minimumSide *
                0.03
            )
        );

    const gravity =
        GRAVITY_MAP[
        settings.position
        ] ||
        "south_east";

    let transformations;

    if (
        settings.type ===
        "LOGO"
    ) {
        if (
            !brandKit
                ?.logoPublicId
        ) {
            throw new Error(
                "No Brand Kit logo is available."
            );
        }

        const logoWidth =
            Math.max(
                40,
                Math.round(
                    sourceWidth *
                    (
                        settings.sizePercent /
                        100
                    )
                )
            );

        const overlayId =
            brandKit.logoPublicId.replaceAll(
                "/",
                ":"
            );

        transformations = [
            {
                overlay:
                    overlayId,
            },

            {
                width:
                    logoWidth,

                crop:
                    "scale",

                opacity:
                    settings.opacity,
            },

            {
                flags:
                    "layer_apply",

                gravity,

                x:
                    gravity ===
                        "center"
                        ? 0
                        : margin,

                y:
                    gravity ===
                        "center"
                        ? 0
                        : margin,
            },

            {
                quality:
                    "auto:good",
            },
        ];
    } else {
        const fontSize =
            Math.max(
                20,
                Math.round(
                    minimumSide *
                    (
                        settings.sizePercent /
                        100
                    ) *
                    0.45
                )
            );

        transformations = [
            {
                color:
                    settings.color,

                overlay: {
                    font_family:
                        "Arial",

                    font_size:
                        fontSize,

                    font_weight:
                        "bold",

                    text:
                        settings.text,
                },
            },

            {
                opacity:
                    settings.opacity,
            },

            {
                flags:
                    "layer_apply",

                gravity,

                x:
                    gravity ===
                        "center"
                        ? 0
                        : margin,

                y:
                    gravity ===
                        "center"
                        ? 0
                        : margin,
            },

            {
                quality:
                    "auto:good",
            },
        ];
    }

    return buildVideoUrls(
        media.cloudinaryPublicId,
        transformations
    );
}
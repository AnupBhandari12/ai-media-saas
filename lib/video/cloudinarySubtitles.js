import cloudinary from "@/lib/cloudinary";

export function getTranscriptPublicId(
    videoPublicId
) {
    return `${videoPublicId}.transcript`;
}

export async function requestVideoTranscription(
    media,
    language
) {
    const autoTranscription =
        language === "AUTO"
            ? true
            : {
                original_language:
                    language,
            };

    return cloudinary.uploader.explicit(
        media.cloudinaryPublicId,
        {
            resource_type:
                "video",

            type: "upload",

            auto_transcription:
                autoTranscription,
        }
    );
}

export async function getTranscriptAsset(
    videoPublicId
) {
    const publicId =
        getTranscriptPublicId(
            videoPublicId
        );

    try {
        const resource =
            await cloudinary.api.resource(
                publicId,
                {
                    resource_type:
                        "raw",

                    type: "upload",
                }
            );

        return resource;
    } catch (error) {
        if (
            error?.http_code ===
            404 ||
            error?.error
                ?.http_code ===
            404
        ) {
            return null;
        }

        throw error;
    }
}

export async function fetchTranscriptJson(
    secureUrl
) {
    const response =
        await fetch(
            secureUrl,
            {
                cache:
                    "no-store",
            }
        );

    if (!response.ok) {
        throw new Error(
            "Transcript file could not be downloaded."
        );
    }

    const text =
        await response.text();

    try {
        return JSON.parse(
            text.replace(
                /^\uFEFF/,
                ""
            )
        );
    } catch {
        throw new Error(
            "Cloudinary returned an invalid transcript file."
        );
    }
}

export async function uploadReviewedVtt({
    ownerId,
    mediaId,
    jobId,
    content,
}) {
    const publicId =
        `ai-media/${ownerId}/subtitles/${mediaId}-${jobId}.vtt`;

    const base64 =
        Buffer.from(
            content,
            "utf8"
        ).toString(
            "base64"
        );

    return cloudinary.uploader.upload(
        `data:text/vtt;base64,${base64}`,
        {
            resource_type:
                "raw",

            type: "upload",

            public_id:
                publicId,

            overwrite: true,

            invalidate: true,
        }
    );
}

export function createBurnedSubtitleUrls(
    media,
    subtitlePublicId,
    style
) {
    const transformations = [
        {
            overlay: {
                resource_type:
                    "subtitles",

                public_id:
                    subtitlePublicId,

                font_family:
                    "Arial",

                font_size:
                    style.fontSize,
            },

            color:
                style.color,
        },

        {
            flags:
                "layer_apply",

            gravity:
                style.position ===
                    "TOP"
                    ? "north"
                    : "south",
        },

        {
            video_codec:
                "h264",

            audio_codec:
                "aac",

            quality:
                "auto:good",
        },
    ];

    const common = {
        resource_type:
            "video",

        secure: true,

        format: "mp4",
    };

    const playbackUrl =
        cloudinary.url(
            media.cloudinaryPublicId,
            {
                ...common,

                transformation:
                    transformations,
            }
        );

    const downloadUrl =
        cloudinary.url(
            media.cloudinaryPublicId,
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
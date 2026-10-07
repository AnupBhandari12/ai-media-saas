import { z } from "zod";

const mediaIdSchema =
    z
        .string()
        .trim()
        .min(1)
        .max(100);

const compressSchema =
    z.object({
        operation:
            z.literal("COMPRESS"),

        mediaId:
            mediaIdSchema,

        preset:
            z.enum([
                "SMALL",
                "BALANCED",
                "QUALITY",
            ]),
    });

const targetCompressSchema =
    z.object({
        operation:
            z.literal(
                "TARGET_COMPRESS"
            ),

        mediaId:
            mediaIdSchema,

        targetMb:
            z
                .number()
                .finite()
                .min(1)
                .max(40),
    });

const convertSchema =
    z.object({
        operation:
            z.literal("CONVERT"),

        mediaId:
            mediaIdSchema,

        format:
            z.enum([
                "mp4",
                "webm",
                "mov",
            ]),
    });

const trimSchema =
    z
        .object({
            operation:
                z.literal("TRIM"),

            mediaId:
                mediaIdSchema,

            start:
                z
                    .number()
                    .finite()
                    .min(0),

            end:
                z
                    .number()
                    .finite()
                    .positive(),
        })
        .refine(
            (data) =>
                data.end >
                data.start,
            {
                path: ["end"],
                message:
                    "End time must be after start time.",
            }
        );

const socialResizeSchema =
    z.object({
        operation:
            z.literal(
                "SOCIAL_RESIZE"
            ),

        mediaId:
            mediaIdSchema,

        preset:
            z.enum([
                "VERTICAL",
                "SQUARE",
                "LANDSCAPE",
            ]),

        mode:
            z.enum([
                "FILL",
                "FIT",
            ]),

        gravity:
            z.enum([
                "CENTER",
                "NORTH",
                "SOUTH",
                "WEST",
                "EAST",
            ]),
    });

const rotateSchema =
    z.object({
        operation:
            z.literal("ROTATE"),

        mediaId:
            mediaIdSchema,

        angle:
            z.union([
                z.literal(90),
                z.literal(180),
                z.literal(270),
            ]),
    });

const muteSchema =
    z.object({
        operation:
            z.literal("MUTE"),

        mediaId:
            mediaIdSchema,
    });

const extractAudioSchema =
    z.object({
        operation:
            z.literal(
                "EXTRACT_AUDIO"
            ),

        mediaId:
            mediaIdSchema,

        format:
            z.enum([
                "mp3",
                "m4a",
                "wav",
            ]),

        quality:
            z.enum([
                "SMALL",
                "BALANCED",
                "HIGH",
            ]),
    });

const frameSchema =
    z.object({
        operation:
            z.literal("FRAME"),

        mediaId:
            mediaIdSchema,

        time:
            z
                .number()
                .finite()
                .min(0),

        format:
            z.enum([
                "jpg",
                "png",
            ]),
    });

const gifSchema =
    z.object({
        operation:
            z.literal("GIF"),

        mediaId:
            mediaIdSchema,

        start:
            z
                .number()
                .finite()
                .min(0),

        duration:
            z
                .number()
                .finite()
                .min(1)
                .max(8),

        width:
            z.union([
                z.literal(320),
                z.literal(480),
                z.literal(640),
            ]),

        fps:
            z.union([
                z.literal(6),
                z.literal(10),
                z.literal(15),
            ]),
    });

const smartPreviewSchema =
    z.object({
        operation:
            z.literal(
                "SMART_PREVIEW"
            ),

        mediaId:
            mediaIdSchema,

        duration:
            z.union([
                z.literal(5),
                z.literal(8),
                z.literal(12),
            ]),
    });

export const videoTransformSchema =
    z.discriminatedUnion(
        "operation",
        [
            compressSchema,
            targetCompressSchema,
            convertSchema,
            trimSchema,

            socialResizeSchema,
            rotateSchema,
            muteSchema,
            extractAudioSchema,

            frameSchema,
            gifSchema,
            smartPreviewSchema,
        ]
    );
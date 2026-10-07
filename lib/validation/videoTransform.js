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
            z.literal(
                "COMPRESS"
            ),

        mediaId:
            mediaIdSchema,

        preset:
            z.enum([
                "SMALL",
                "BALANCED",
                "QUALITY",
            ]),
    });

const convertSchema =
    z.object({
        operation:
            z.literal(
                "CONVERT"
            ),

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
                z.literal(
                    "TRIM"
                ),

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
            z.literal(
                "ROTATE"
            ),

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
            z.literal(
                "MUTE"
            ),

        mediaId:
            mediaIdSchema,
    });

const frameSchema =
    z.object({
        operation:
            z.literal(
                "FRAME"
            ),

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

export const videoTransformSchema =
    z.discriminatedUnion(
        "operation",
        [
            compressSchema,
            convertSchema,
            trimSchema,

            socialResizeSchema,
            rotateSchema,
            muteSchema,
            frameSchema,
        ]
    );
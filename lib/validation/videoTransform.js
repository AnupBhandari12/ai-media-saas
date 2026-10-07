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

export const videoTransformSchema =
    z.discriminatedUnion(
        "operation",
        [
            compressSchema,
            convertSchema,
            trimSchema,
        ]
    );
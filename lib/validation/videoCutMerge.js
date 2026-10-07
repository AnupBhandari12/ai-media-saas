import { z } from "zod";

const mediaIdSchema =
    z
        .string()
        .trim()
        .min(1)
        .max(100);

const cutSegmentSchema =
    z
        .object({
            operation:
                z.literal("CUT_SEGMENT"),

            mediaId:
                mediaIdSchema,

            mode:
                z.enum([
                    "KEEP",
                    "REMOVE",
                ]),

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

const mergeVideosSchema =
    z.object({
        operation:
            z.literal("MERGE"),

        mediaIds:
            z
                .array(
                    mediaIdSchema
                )
                .min(2)
                .max(4),
    });

export const videoCutMergeSchema =
    z.discriminatedUnion(
        "operation",
        [
            cutSegmentSchema,
            mergeVideosSchema,
        ]
    );
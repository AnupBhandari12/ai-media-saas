import { z } from "zod";

const mediaId =
    z
        .string()
        .trim()
        .min(1)
        .max(100);

const jobId =
    z
        .string()
        .trim()
        .min(1)
        .max(100);

const language =
    z.union([
        z.literal("AUTO"),

        z
            .string()
            .regex(
                /^[a-z]{2}$/
            ),
    ]);

const cueSchema =
    z
        .object({
            id:
                z
                    .string()
                    .max(100),

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

            text:
                z
                    .string()
                    .trim()
                    .min(1)
                    .max(300),

            confidence:
                z
                    .number()
                    .nullable()
                    .optional(),
        })
        .refine(
            (cue) =>
                cue.end >
                cue.start,
            {
                path: ["end"],

                message:
                    "Cue end must be after start.",
            }
        );

const startSchema =
    z.object({
        action:
            z.literal("START"),

        mediaId,

        language,

        regenerate:
            z
                .boolean()
                .default(false),
    });

const statusSchema =
    z.object({
        action:
            z.literal("STATUS"),

        jobId,
    });

const burnSchema =
    z.object({
        action:
            z.literal("BURN"),

        jobId,

        mediaId,

        cues:
            z
                .array(
                    cueSchema
                )
                .min(1)
                .max(500),

        style:
            z.object({
                fontSize:
                    z
                        .number()
                        .int()
                        .min(18)
                        .max(64),

                color:
                    z
                        .string()
                        .regex(
                            /^#[0-9a-fA-F]{6}$/
                        ),

                position:
                    z.enum([
                        "TOP",
                        "BOTTOM",
                    ]),
            }),
    });

export const videoSubtitleSchema =
    z.discriminatedUnion(
        "action",
        [
            startSchema,
            statusSchema,
            burnSchema,
        ]
    );
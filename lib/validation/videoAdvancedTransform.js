import { z } from "zod";

const mediaIdSchema =
    z
        .string()
        .trim()
        .min(1)
        .max(100);

const cropSchema =
    z
        .object({
            operation:
                z.literal("CROP"),

            mediaId:
                mediaIdSchema,

            left:
                z
                    .number()
                    .finite()
                    .min(0)
                    .max(95),

            top:
                z
                    .number()
                    .finite()
                    .min(0)
                    .max(95),

            width:
                z
                    .number()
                    .finite()
                    .min(5)
                    .max(100),

            height:
                z
                    .number()
                    .finite()
                    .min(5)
                    .max(100),
        })
        .refine(
            (data) =>
                data.left +
                data.width <=
                100,
            {
                path: ["width"],

                message:
                    "Crop width exceeds the video boundary.",
            }
        )
        .refine(
            (data) =>
                data.top +
                data.height <=
                100,
            {
                path: ["height"],

                message:
                    "Crop height exceeds the video boundary.",
            }
        );

const watermarkSchema =
    z.object({
        operation:
            z.literal(
                "WATERMARK"
            ),

        mediaId:
            mediaIdSchema,

        type:
            z.enum([
                "TEXT",
                "LOGO",
            ]),

        text:
            z
                .string()
                .trim()
                .max(100)
                .nullable(),

        position:
            z.enum([
                "TOP_LEFT",
                "TOP_CENTER",
                "TOP_RIGHT",
                "CENTER",
                "BOTTOM_LEFT",
                "BOTTOM_CENTER",
                "BOTTOM_RIGHT",
            ]),

        opacity:
            z
                .number()
                .int()
                .min(10)
                .max(100),

        sizePercent:
            z
                .number()
                .int()
                .min(5)
                .max(35),

        color:
            z
                .string()
                .regex(
                    /^#[0-9a-fA-F]{6}$/
                ),
    })
        .superRefine(
            (data, ctx) => {
                if (
                    data.type ===
                    "TEXT" &&
                    !data.text
                ) {
                    ctx.addIssue({
                        code: "custom",

                        path: ["text"],

                        message:
                            "Watermark text is required.",
                    });
                }
            }
        );

export const videoAdvancedTransformSchema =
    z.discriminatedUnion(
        "operation",
        [
            cropSchema,
            watermarkSchema,
        ]
    );
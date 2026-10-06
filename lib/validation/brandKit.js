import { z } from "zod";

import {
    BRAND_WATERMARK_POSITIONS,
    BRAND_WATERMARK_TYPES,
} from "@/lib/brandKit";

const positionValues =
    BRAND_WATERMARK_POSITIONS.map(
        (item) => item.value
    );

const hexColorSchema =
    z
        .string()
        .regex(
            /^#[0-9a-fA-F]{6}$/,
            "Invalid color."
        );

export const brandKitSchema =
    z.object({
        brandName:
            z
                .string()
                .trim()
                .max(80)
                .nullable(),

        primaryColor:
            hexColorSchema,

        secondaryColor:
            hexColorSchema,

        logoPublicId:
            z
                .string()
                .trim()
                .min(1)
                .max(500)
                .nullable(),

        defaultWatermarkType:
            z.enum([
                BRAND_WATERMARK_TYPES.TEXT,
                BRAND_WATERMARK_TYPES.LOGO,
            ]),

        defaultWatermarkText:
            z
                .string()
                .trim()
                .max(100)
                .nullable(),

        defaultWatermarkOpacity:
            z
                .number()
                .int()
                .min(5)
                .max(100),

        defaultWatermarkSize:
            z
                .number()
                .int()
                .min(10)
                .max(70),

        defaultWatermarkPosition:
            z.enum(
                positionValues
            ),
    })
        .superRefine(
            (data, ctx) => {
                if (
                    data.defaultWatermarkType ===
                    BRAND_WATERMARK_TYPES.LOGO &&
                    !data.logoPublicId
                ) {
                    ctx.addIssue({
                        code: "custom",
                        path: [
                            "logoPublicId",
                        ],
                        message:
                            "Upload a logo before using logo watermark defaults.",
                    });
                }
            }
        );
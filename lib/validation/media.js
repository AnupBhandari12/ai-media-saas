import { z } from "zod";

const IMAGE_FORMATS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
];

const VIDEO_FORMATS = [
  "mp4",
  "mov",
  "webm",
];

const MAX_IMAGE_BYTES = 10_000_000;
const MAX_VIDEO_BYTES = 50_000_000;

export const createMediaSchema = z
  .object({
    type: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),

    originalFilename: z
      .string()
      .trim()
      .min(1, "Filename is required.")
      .max(255, "Filename is too long."),

    cloudinaryPublicId: z
      .string()
      .trim()
      .min(1, "Cloudinary public ID is required.")
      .max(500),

    secureUrl: z
      .string()
      .url("Invalid media URL.")
      .max(2000),

    format: z
      .string()
      .trim()
      .toLowerCase()
      .max(20)
      .optional()
      .nullable(),

    bytes: z
      .number()
      .int()
      .positive()
      .optional()
      .nullable(),

    width: z
      .number()
      .int()
      .positive()
      .optional()
      .nullable(),

    height: z
      .number()
      .int()
      .positive()
      .optional()
      .nullable(),

    duration: z
      .number()
      .nonnegative()
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "IMAGE") {
      if (
        data.format &&
        !IMAGE_FORMATS.includes(data.format)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["format"],
          message: "Unsupported image format.",
        });
      }

      if (
        data.bytes &&
        data.bytes > MAX_IMAGE_BYTES
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["bytes"],
          message: "Image must be 10 MB or smaller.",
        });
      }
    }

    if (data.type === "VIDEO") {
      if (
        data.format &&
        !VIDEO_FORMATS.includes(data.format)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["format"],
          message: "Unsupported video format.",
        });
      }

      if (
        data.bytes &&
        data.bytes > MAX_VIDEO_BYTES
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["bytes"],
          message: "Video must be 50 MB or smaller.",
        });
      }
    }
  });
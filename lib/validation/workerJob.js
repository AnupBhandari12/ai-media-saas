import { z } from "zod";

import {
  MAX_WORKER_DOCUMENT_BYTES,
  isAllowedDocumentType,
} from "../worker/jobConfig.js";

export const createWorkerJobSchema = z.object({
  toolId: z.enum(["PDF-20", "PDF-21", "PDF-22"]),
  filename: z
    .string()
    .trim()
    .min(5)
    .max(180)
    // Original display name; never use this as a filesystem path.
    .refine(
      (value) =>
        !/[\\/\x00-\x1f\x7f]/.test(value) &&
        !value.includes("..") &&
        value !== ".",
      { message: "Invalid document filename." },
    ),
  bytes: z.number().int().min(1).max(MAX_WORKER_DOCUMENT_BYTES),
}).strict().superRefine((value, context) => {
  if (!isAllowedDocumentType(value.toolId, value.filename)) {
    context.addIssue({
      code: "custom",
      path: ["filename"],
      message: "File extension does not match the selected tool.",
    });
  }
});

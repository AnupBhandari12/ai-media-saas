import { describe, expect, test } from "bun:test";

import {
  createWorkerJobSchema,
} from "../../lib/validation/workerJob.js";
import {
  MAX_WORKER_DOCUMENT_BYTES,
  WORKER_DOCUMENT_TOOL_IDS,
  getDocumentExtension,
  isAllowedDocumentType,
  toPublicWorkerJob,
} from "../../lib/worker/jobConfig.js";

describe("Phase 19B1 document job reservations", () => {
  test("supports exactly three Office conversion IDs", () => {
    expect(WORKER_DOCUMENT_TOOL_IDS).toEqual([
      "PDF-20", "PDF-21", "PDF-22",
    ]);
  });

  test("accepts matching Office formats", () => {
    for (const [toolId, filename] of [
      ["PDF-20", "report.docx"],
      ["PDF-21", "presentation.pptx"],
      ["PDF-22", "sales.xlsx"],
    ]) {
      expect(createWorkerJobSchema.safeParse({
        toolId, filename, bytes: 1024,
      }).success).toBe(true);
    }
  });

  test("rejects mismatched file extensions", () => {
    expect(isAllowedDocumentType("PDF-20", "notes.pdf")).toBe(false);
    expect(createWorkerJobSchema.safeParse({
      toolId: "PDF-20", filename: "slides.pptx", bytes: 200,
    }).success).toBe(false);
  });

  test("normalizes extension case", () => {
    expect(getDocumentExtension("My Notes.DOCX")).toBe(".docx");
  });

  test("rejects paths and traversal", () => {
    for (const filename of ["../secrets.docx", "folder\\report.docx", "a..docx"]) {
      expect(createWorkerJobSchema.safeParse({
        toolId: "PDF-20", filename, bytes: 1024,
      }).success).toBe(false);
    }
  });

  test("rejects oversized or empty files", () => {
    for (const bytes of [0, MAX_WORKER_DOCUMENT_BYTES + 1]) {
      expect(createWorkerJobSchema.safeParse({
        toolId: "PDF-20", filename: "report.docx", bytes,
      }).success).toBe(false);
    }
  });

  test("rejects unknown tools or unsupported fields", () => {
    expect(createWorkerJobSchema.safeParse({
      toolId: "PDF-15", filename: "secret.pdf", bytes: 500,
    }).success).toBe(false);
    expect(createWorkerJobSchema.safeParse({
      toolId: "PDF-20", filename: "report.docx", bytes: 500,
      ownerId: "another-user",
    }).success).toBe(false);
  });

  test("public DTO never exposes internal refs", () => {
    const result = toPublicWorkerJob({
      id: "job-one", toolId: "PDF-20", ownerId: "sensitive-user",
      status: "PENDING", progress: 0,
      inputRefs: {
        stage: "AWAITING_UPLOAD",
        filename: "report.docx", expectedBytes: 500,
        internalSecret: "private",
      },
      resultRefs: { internalStorageKey: "secret" },
      errorMessage: "internal error",
      createdAt: new Date("2026-10-01"),
      updatedAt: new Date("2026-10-01"),
    });

    expect(result.filename).toBe("report.docx");
    expect(result.stage).toBe("AWAITING_UPLOAD");
    expect(JSON.stringify(result)).not.toContain("private");
    expect(JSON.stringify(result)).not.toContain("ownerId");
    expect(JSON.stringify(result)).not.toContain("internalStorageKey");
  });
});

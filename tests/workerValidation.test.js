import { describe, expect, test } from "bun:test";
import { validateWorkerRequest } from "../worker/validation.mjs";

describe("Phase 19A document worker", () => {
  test("accepts PDF protection", () => {
    const result = validateWorkerRequest("protect", "report.pdf");
    expect(result.outputFilename).toBe("report-protected.pdf");
    expect(() => validateWorkerRequest("protect", "script.js")).toThrow();
  });
  test("accepts PDF-16 known-password unlock", () => {
    const request = validateWorkerRequest("unlock", "sample-protected.pdf");
    expect(request.extension).toBe(".pdf");
    expect(request.outputFilename).toBe("sample-protected-unlocked.pdf");
    expect(() => validateWorkerRequest("unlock", "notes.docx")).toThrow();
    expect(() => validateWorkerRequest("unlock", "../secret.pdf")).toThrow();
  });

  test("accepts PDF-12 compression input and safe output naming", () => {
    const request = validateWorkerRequest("compress-target", "scanned.pdf");
    expect(request.outputFilename).toBe("scanned-target.pdf");
    expect(() => validateWorkerRequest("compress-target", "script.js")).toThrow();
    expect(() => validateWorkerRequest("compress-target", "../private.pdf")).toThrow();
  });

  test("accepts PDF-30 repair with checked output name", () => {
    expect(validateWorkerRequest("repair", "sample.pdf").outputFilename).toBe("sample-normalized.pdf");
    expect(() => validateWorkerRequest("repair", "notes.docx")).toThrow();
    expect(() => validateWorkerRequest("repair", "../private.pdf")).toThrow();
  });

  test("supports health checks", () => {
    expect(validateWorkerRequest("health")).toEqual({ action: "health" });
  });
  test("accepts DOCX conversion", () => {
    const request = validateWorkerRequest("convert", "report.docx");
    expect(request.extension).toBe(".docx");
    expect(request.outputFilename).toBe("report.pdf");
  });
  test("accepts PPTX and XLSX conversion", () => {
    expect(validateWorkerRequest("convert", "slides.pptx").outputFilename).toBe("slides.pdf");
    expect(validateWorkerRequest("convert", "data.xlsx").outputFilename).toBe("data.pdf");
  });
  test("accepts PDF validation", () => {
    expect(validateWorkerRequest("check", "sample.pdf").extension).toBe(".pdf");
  });
  test("blocks path traversal", () => {
    expect(() => validateWorkerRequest("check", "../secret.pdf")).toThrow();
    expect(() => validateWorkerRequest("check", "folder/file.pdf")).toThrow();
  });
  test("blocks unsupported input formats", () => {
    expect(() => validateWorkerRequest("convert", "script.js")).toThrow();
    expect(() => validateWorkerRequest("check", "document.docx")).toThrow();
  });
});
